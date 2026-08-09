-- P9 Gacha — authenticated, atomic, idempotent server authority.
-- The Supabase CLI could not create this file in the agent sandbox because it attempts to write
-- /root/.supabase (read-only). Filename follows this repository's existing timestamp convention.

create table if not exists public.gacha_banners (
  id text primary key,
  name text not null,
  description text not null,
  currency text not null check (currency in ('gem', 'gold')),
  cost_single integer not null check (cost_single > 0),
  cost_multi integer not null check (cost_multi > 0),
  pity_threshold integer not null check (pity_threshold > 0),
  pity_rarity text not null check (pity_rarity in ('rare', 'epic', 'legendary')),
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.gacha_banner_pool (
  banner_id text not null references public.gacha_banners(id) on delete cascade,
  character_id text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  drop_rate numeric(8, 7) not null check (drop_rate > 0 and drop_rate <= 1),
  primary key (banner_id, character_id)
);

create table if not exists public.gacha_pity (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  banner_id text not null references public.gacha_banners(id) on delete cascade,
  pity_count integer not null default 0 check (pity_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (profile_id, banner_id)
);

create table if not exists public.gacha_pull_history (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  banner_id text not null references public.gacha_banners(id),
  pull_count integer not null check (pull_count in (1, 10)),
  cost integer not null check (cost > 0),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, request_id)
);

alter table public.gacha_banners enable row level security;
alter table public.gacha_banner_pool enable row level security;
alter table public.gacha_pity enable row level security;
alter table public.gacha_pull_history enable row level security;

drop policy if exists "published gacha banners" on public.gacha_banners;
create policy "published gacha banners"
  on public.gacha_banners for select to anon, authenticated
  using (active = true);

drop policy if exists "published gacha pool" on public.gacha_banner_pool;
create policy "published gacha pool"
  on public.gacha_banner_pool for select to anon, authenticated
  using (
    exists (
      select 1 from public.gacha_banners as banner
      where banner.id = banner_id and banner.active = true
    )
  );

drop policy if exists "own gacha pity" on public.gacha_pity;
create policy "own gacha pity"
  on public.gacha_pity for select to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "own gacha history" on public.gacha_pull_history;
create policy "own gacha history"
  on public.gacha_pull_history for select to authenticated
  using ((select auth.uid()) = profile_id);

revoke all on public.gacha_banners from public, anon, authenticated;
revoke all on public.gacha_banner_pool from public, anon, authenticated;
revoke all on public.gacha_pity from public, anon, authenticated;
revoke all on public.gacha_pull_history from public, anon, authenticated;
grant select on public.gacha_banners, public.gacha_banner_pool to anon, authenticated;
grant select on public.gacha_pity, public.gacha_pull_history to authenticated;

insert into public.gacha_banners (
  id, name, description, currency, cost_single, cost_multi,
  pity_threshold, pity_rarity, active
) values (
  'standard-banner',
  'อัญเชิญวีรชนศิลาวิญญาณ',
  'วีรชนห้ารูปแบบการเล่นจาก Production Batch 01',
  'gem',
  100,
  900,
  30,
  'legendary',
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  currency = excluded.currency,
  cost_single = excluded.cost_single,
  cost_multi = excluded.cost_multi,
  pity_threshold = excluded.pity_threshold,
  pity_rarity = excluded.pity_rarity,
  active = excluded.active,
  updated_at = now();

insert into public.gacha_banner_pool (banner_id, character_id, rarity, drop_rate) values
  ('standard-banner', 'monkey-king', 'legendary', 0.0500000),
  ('standard-banner', 'pig-warrior', 'epic', 0.1250000),
  ('standard-banner', 'celestial-archer', 'epic', 0.1250000),
  ('standard-banner', 'nezha-warden', 'rare', 0.3500000),
  ('standard-banner', 'sand-sage', 'rare', 0.3500000)
on conflict (banner_id, character_id) do update set
  rarity = excluded.rarity,
  drop_rate = excluded.drop_rate;

-- Gacha is a real Gem debit, so the existing append-only currency ledger must be able to record
-- a negative amount with an explicit source. All earning RPCs still reject non-positive amounts.
alter table public.currency_transactions
  drop constraint if exists currency_transactions_amount_check,
  drop constraint if exists currency_transactions_amount_nonzero,
  drop constraint if exists currency_transactions_source_check,
  drop constraint if exists currency_source_match;

alter table public.currency_transactions
  add constraint currency_transactions_amount_nonzero check (amount <> 0),
  add constraint currency_transactions_source_check
    check (source in ('quest', 'drop', 'topup', 'coupon', 'admin', 'gacha')),
  add constraint currency_source_match check (
    (currency = 'gold' and source in ('quest', 'drop', 'topup', 'admin') and amount > 0)
    or (currency = 'gem' and source in ('topup', 'coupon') and amount > 0)
    or (currency = 'gem' and source = 'gacha' and amount < 0)
  );

create or replace function public.perform_gacha_pull(
  p_request_id uuid,
  p_banner_id text,
  p_pull_count integer
)
returns table (payload jsonb, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_banner public.gacha_banners%rowtype;
  v_existing_banner_id text;
  v_existing_pull_count integer;
  v_existing_result jsonb;
  v_cost integer;
  v_balance integer;
  v_pity integer;
  v_roll double precision;
  v_character_id text;
  v_rarity text;
  v_is_pity boolean;
  v_is_new boolean;
  v_results jsonb := '[]'::jsonb;
  v_index integer;
begin
  if v_profile_id is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนอัญเชิญ';
  end if;
  if p_request_id is null then
    raise exception 'request ID ไม่ถูกต้อง';
  end if;
  if p_pull_count not in (1, 10) then
    raise exception 'จำนวนการอัญเชิญต้องเป็น 1 หรือ 10 ครั้ง';
  end if;

  -- One account lock serializes Gem, pity, duplicate-shard and idempotency writes together.
  perform 1 from public.profiles where id = v_profile_id for update;
  if not found then
    raise exception 'ไม่พบบัญชีผู้เล่น';
  end if;

  select history.banner_id, history.pull_count, history.result
  into v_existing_banner_id, v_existing_pull_count, v_existing_result
  from public.gacha_pull_history as history
  where history.profile_id = v_profile_id
    and history.request_id = p_request_id;

  if found then
    if v_existing_banner_id <> p_banner_id or v_existing_pull_count <> p_pull_count then
      raise exception 'request ID ถูกใช้กับคำสั่งอัญเชิญคนละรายการ';
    end if;
    return query select v_existing_result, true;
    return;
  end if;

  select * into v_banner
  from public.gacha_banners as banner
  where banner.id = p_banner_id and banner.active = true;
  if not found then
    raise exception 'ไม่พบตู้สุ่มที่เปิดใช้งาน';
  end if;

  if abs(
    (select coalesce(sum(pool.drop_rate), 0)
     from public.gacha_banner_pool as pool
     where pool.banner_id = p_banner_id) - 1
  ) > 0.0000001 then
    raise exception 'อัตราตู้สุ่มไม่ครบ 100%%';
  end if;

  v_cost := case p_pull_count when 1 then v_banner.cost_single else v_banner.cost_multi end;
  update public.profiles
  set gem = gem - v_cost
  where id = v_profile_id and gem >= v_cost
  returning gem into v_balance;
  if not found then
    raise exception 'หยกไม่เพียงพอ';
  end if;

  select pity.pity_count into v_pity
  from public.gacha_pity as pity
  where pity.profile_id = v_profile_id and pity.banner_id = p_banner_id
  for update;
  v_pity := coalesce(v_pity, 0);

  for v_index in 1..p_pull_count loop
    v_is_pity := v_pity + 1 >= v_banner.pity_threshold;

    if v_is_pity then
      select pool.character_id, pool.rarity
      into v_character_id, v_rarity
      from public.gacha_banner_pool as pool
      where pool.banner_id = p_banner_id
        and pool.rarity = v_banner.pity_rarity
      order by pool.character_id
      limit 1;
    else
      v_roll := random();
      select ranked.character_id, ranked.rarity
      into v_character_id, v_rarity
      from (
        select
          pool.character_id,
          pool.rarity,
          sum(pool.drop_rate) over (order by pool.character_id) as cumulative_rate
        from public.gacha_banner_pool as pool
        where pool.banner_id = p_banner_id
      ) as ranked
      where v_roll <= ranked.cumulative_rate
      order by ranked.cumulative_rate
      limit 1;
    end if;

    if v_character_id is null then
      raise exception 'ตู้สุ่มไม่มีตัวละครที่ใช้ได้';
    end if;

    insert into public.owned_characters (profile_id, character_id)
    values (v_profile_id, v_character_id)
    on conflict (profile_id, character_id) do nothing
    returning true into v_is_new;

    v_is_new := coalesce(v_is_new, false);
    if not v_is_new then
      update public.owned_characters
      set shards = shards + 1
      where profile_id = v_profile_id and character_id = v_character_id;
    end if;

    if v_rarity = v_banner.pity_rarity then
      v_pity := 0;
    else
      v_pity := v_pity + 1;
    end if;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'characterId', v_character_id,
      'rarity', v_rarity,
      'isPity', v_is_pity,
      'isNew', v_is_new,
      'shardsGranted', case when v_is_new then 0 else 1 end
    ));

    v_character_id := null;
    v_rarity := null;
    v_is_new := null;
  end loop;

  insert into public.gacha_pity (profile_id, banner_id, pity_count, updated_at)
  values (v_profile_id, p_banner_id, v_pity, now())
  on conflict (profile_id, banner_id) do update set
    pity_count = excluded.pity_count,
    updated_at = excluded.updated_at;

  payload := jsonb_build_object(
    'results', v_results,
    'cost', v_cost,
    'currencyUsed', v_banner.currency,
    'newPity', v_pity,
    'remainingBalance', v_balance
  );

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values (v_profile_id, 'gem', 'gacha', -v_cost, p_request_id::text);

  insert into public.gacha_pull_history (
    profile_id, request_id, banner_id, pull_count, cost, result
  ) values (
    v_profile_id, p_request_id, p_banner_id, p_pull_count, v_cost, payload
  );

  return query select payload, false;
end;
$$;

revoke all on function public.perform_gacha_pull(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.perform_gacha_pull(uuid, text, integer) to authenticated;
