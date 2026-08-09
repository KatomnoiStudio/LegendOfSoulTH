-- P9 Star Ascension — server-authoritative persistence and atomic/idempotent promotion.
-- Contract: Ring 0 P9 baseline locked 2026-08-09; Gacha remains a separate PR/topic.

alter table public.owned_characters
  add column if not exists star smallint not null default 1,
  add column if not exists shards integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'owned_characters_star_range'
  ) then
    alter table public.owned_characters
      add constraint owned_characters_star_range check (star between 1 and 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'owned_characters_shards_nonnegative'
  ) then
    alter table public.owned_characters
      add constraint owned_characters_shards_nonnegative check (shards >= 0);
  end if;
end;
$$;

create table if not exists public.star_ascension_history (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  character_id text not null,
  from_star smallint not null check (from_star between 1 and 5),
  to_star smallint not null check (to_star between 2 and 6 and to_star = from_star + 1),
  shards_spent integer not null check (shards_spent in (1, 2, 4, 8, 12)),
  shards_remaining integer not null check (shards_remaining >= 0),
  created_at timestamptz not null default now(),
  primary key (profile_id, request_id)
);

alter table public.star_ascension_history enable row level security;

drop policy if exists "own star ascension history" on public.star_ascension_history;
create policy "own star ascension history"
  on public.star_ascension_history
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

-- Supabase's Data API grants exposed tables broadly. Remove the table-wide write grants first,
-- then allow only the progression fields savePlayer legitimately persists. Star and shards have
-- no direct client write path; only the SECURITY DEFINER RPC below can change them.
revoke all on public.star_ascension_history from public, anon, authenticated;
grant select on public.star_ascension_history to authenticated;

drop policy if exists "own characters insert" on public.owned_characters;
revoke insert, update on public.owned_characters from authenticated;
grant update (
  level, exp, exp_to_next, skill_levels, talent_state, awakening_state
) on public.owned_characters to authenticated;

create or replace function public.ascend_character_star(
  p_request_id uuid,
  p_character_id text
)
returns table (
  new_star integer,
  shards_remaining integer,
  shards_spent integer,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_existing_character_id text;
  v_existing_star integer;
  v_existing_remaining integer;
  v_existing_spent integer;
  v_current_star integer;
  v_current_shards integer;
  v_next_star integer;
  v_required integer;
begin
  if v_profile_id is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนเลื่อนระดับดาว';
  end if;
  if p_request_id is null then
    raise exception 'request ID ไม่ถูกต้อง';
  end if;
  if p_character_id is null or length(btrim(p_character_id)) = 0 then
    raise exception 'รหัสฮีโร่ไม่ถูกต้อง';
  end if;

  -- Serialize all ascension requests for one account. This closes the concurrent retry race even
  -- when a reused request ID names a different Hero row.
  perform 1 from public.profiles where id = v_profile_id for update;
  if not found then
    raise exception 'ไม่พบบัญชีผู้เล่น';
  end if;

  select
    history.character_id,
    history.to_star,
    history.shards_remaining,
    history.shards_spent
  into
    v_existing_character_id,
    v_existing_star,
    v_existing_remaining,
    v_existing_spent
  from public.star_ascension_history as history
  where history.profile_id = v_profile_id
    and history.request_id = p_request_id;

  if found then
    if v_existing_character_id <> p_character_id then
      raise exception 'request ID ถูกใช้กับฮีโร่คนละตัว';
    end if;
    return query select v_existing_star, v_existing_remaining, v_existing_spent, true;
    return;
  end if;

  select owned.star, owned.shards
  into v_current_star, v_current_shards
  from public.owned_characters as owned
  where owned.profile_id = v_profile_id
    and owned.character_id = p_character_id
  for update;

  if not found then
    raise exception 'ไม่พบฮีโร่ที่ครอบครอง';
  end if;
  if v_current_star >= 6 then
    raise exception 'ฮีโร่อยู่ที่ระดับดาวสูงสุดแล้ว';
  end if;

  v_next_star := v_current_star + 1;
  v_required := case v_next_star
    when 2 then 1
    when 3 then 2
    when 4 then 4
    when 5 then 8
    when 6 then 12
    else null
  end;

  if v_required is null then
    raise exception 'ระดับดาวเป้าหมายไม่ถูกต้อง';
  end if;
  if v_current_shards < v_required then
    raise exception 'ชิ้นส่วนไม่เพียงพอ (ต้องการ %, มี %)', v_required, v_current_shards;
  end if;

  v_current_shards := v_current_shards - v_required;
  update public.owned_characters
  set star = v_next_star,
      shards = v_current_shards
  where profile_id = v_profile_id
    and character_id = p_character_id;

  insert into public.star_ascension_history (
    profile_id, request_id, character_id, from_star, to_star,
    shards_spent, shards_remaining
  ) values (
    v_profile_id, p_request_id, p_character_id, v_current_star, v_next_star,
    v_required, v_current_shards
  );

  return query select v_next_star, v_current_shards, v_required, false;
end;
$$;

revoke all on function public.ascend_character_star(uuid, text) from public, anon, authenticated;
grant execute on function public.ascend_character_star(uuid, text) to authenticated;
