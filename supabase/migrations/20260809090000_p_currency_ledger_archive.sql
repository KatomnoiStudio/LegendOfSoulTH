-- Currency ledger archive (hot/cold split) + lifetime-earned reconciliation
--
-- .agents/rules/currency-ledger-retention.md's own trigger condition fired the day after it
-- was written: commit 6172d52 (2026-08-08) wired earnGold/grantItem into
-- lobbyBattleRewardPipeline.ts's automatic battle-end reward, and no archive system landed
-- in that PR or since. Surfaced as design-fork #1 in a full doc-vs-code audit (2026-08-10),
-- handed to nustanakritwithai for a call between "build now" and "rule doesn't apply to the
-- live Postgres backend, only the localStorage one it was written against" — answered 1.a:
-- build it now, the rule fired as written.
--
-- Shape is prescriptive, not a design choice made here (ask-CB 4-seat 2026-08-07, grounded in
-- double-entry general-ledger practice + PCI DSS v4.0 Req. 10.5.1 — both converge on the same
-- hot/archive split, never-delete pattern):
--   - archive, never delete
--   - source IN ('coupon','topup') NEVER moves to archive, at any age — redeem_coupon's
--     already-redeemed check (0003_redeem_coupon_returns_amount.sql:25-28) and
--     cleanup_dead_unplayed_accounts' paying-player exemption (0014_dead_account_cleanup.sql:
--     71-74) both scan public.currency_transactions directly for every account's full
--     history, not just a recent window — archiving either source out from under them turns
--     a performance fix into a coupon-replay hole or a false-positive account deletion
--   - a lifetime-earned total that reconciles even once detail rows move to the archive

-- 1. Reconciling lifetime totals — incremented once at insert (see the function changes
--    below), never decremented on spend or archival, so the running total stays correct
--    no matter what later moves to the archive table.
alter table public.profiles
  add column if not exists lifetime_gold_earned bigint not null default 0,
  add column if not exists lifetime_gem_earned bigint not null default 0;

update public.profiles p set lifetime_gold_earned = coalesce(sub.total, 0)
from (
  select profile_id, sum(amount) as total
  from public.currency_transactions
  where currency = 'gold' and amount > 0
  group by profile_id
) sub
where sub.profile_id = p.id;

update public.profiles p set lifetime_gem_earned = coalesce(sub.total, 0)
from (
  select profile_id, sum(amount) as total
  from public.currency_transactions
  where currency = 'gem' and amount > 0
  group by profile_id
) sub
where sub.profile_id = p.id;

-- 2. Cold table — same row shape as the hot table plus an archived_at marker. RLS mirrors
--    the hot table's own-row-only select so a future transaction-history screen (the rule's
--    own named reason to eventually widen the hot window) can union both without a second
--    access model to design.
create table if not exists public.currency_transactions_archive (
  id uuid primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null,
  source text not null,
  amount int not null,
  ref_id text,
  created_at timestamptz not null,
  archived_at timestamptz not null default now()
);

alter table public.currency_transactions_archive enable row level security;
create policy "own archived transactions select"
  on public.currency_transactions_archive for select using (auth.uid() = profile_id);

create index if not exists currency_transactions_archive_profile_idx
  on public.currency_transactions_archive (profile_id);

-- 3. Archive function — moves rows older than the cutoff out of the hot table. coupon/topup
--    excluded unconditionally regardless of age (see header). SECURITY DEFINER, cron-invoked
--    only, same as cleanup_dead_unplayed_accounts (0014) and cleanup_old_audit_log_entries
--    (0007) — no direct grant to authenticated/anon.
create or replace function public.archive_currency_transactions(p_older_than interval default interval '12 months')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with moved as (
    delete from public.currency_transactions
    where created_at < now() - p_older_than
      and source not in ('coupon', 'topup')
    returning id, profile_id, currency, source, amount, ref_id, created_at
  )
  insert into public.currency_transactions_archive (
    id, profile_id, currency, source, amount, ref_id, created_at
  )
  select id, profile_id, currency, source, amount, ref_id, created_at from moved;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Monthly, off-peak — matches this project's existing maintenance-job cadence (0006/0007/
-- 0014). A cheap no-op today given the real volume this repo measured (see the rule file),
-- but running on its own rather than left as a manual step someone has to remember later.
select cron.schedule(
  'archive-currency-transactions',
  '0 4 1 * *',
  $$select public.archive_currency_transactions();$$
);

-- 4. Every function that credits currency keeps the lifetime counter in step with what it
--    inserts — this is what makes the reconciliation promise hold once archiving starts
--    moving detail rows out from under it. Full bodies copied from their latest prior
--    definition (earn_gold: 0013_reward_idempotency.sql; redeem_coupon:
--    0003_redeem_coupon_returns_amount.sql; grant_gold_admin: 0015_admin_grant_and_chat_
--    block.sql) with only the lifetime_* increment added — no other behavior changes.

create or replace function public.earn_gold(p_source text, p_amount int, p_ref_id text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  v_profile_id uuid := auth.uid();
  v_max_amount constant int := 1000;
begin
  perform public.check_and_log_rpc_rate_limit('earn_gold', 20, 60);

  if p_amount <= 0 then
    raise exception 'จำนวนทองไม่ถูกต้อง';
  end if;
  if p_amount > v_max_amount then
    raise exception 'จำนวนทองเกินขีดจำกัดต่อครั้ง (%): %', v_max_amount, p_amount;
  end if;
  if p_source not in ('quest', 'drop', 'topup') then
    raise exception 'แหล่งที่มาทองไม่ถูกต้อง: %', p_source;
  end if;

  if p_ref_id is not null then
    begin
      insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
      values (v_profile_id, 'gold', p_source, p_amount, p_ref_id);
    exception
      when unique_violation then
        select * into result from public.profiles where id = v_profile_id;
        return result;
    end;
  else
    insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
    values (v_profile_id, 'gold', p_source, p_amount, p_ref_id);
  end if;

  update public.profiles
  set gold = gold + p_amount,
      lifetime_gold_earned = lifetime_gold_earned + p_amount
  where id = v_profile_id
  returning * into result;

  return result;
end;
$$;

drop function if exists public.redeem_coupon(text);

create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  v_code text := upper(trim(p_code));
  v_gem int;
  v_already_redeemed boolean;
begin
  if v_code = 'WELCOME2026' then
    v_gem := 50;
  else
    raise exception 'โค้ดนี้ไม่ถูกต้องหรือหมดอายุแล้ว';
  end if;

  select exists(
    select 1 from public.currency_transactions
    where profile_id = auth.uid() and source = 'coupon' and ref_id = v_code
  ) into v_already_redeemed;

  if v_already_redeemed then
    raise exception 'ใช้โค้ดนี้ไปแล้ว';
  end if;

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values (auth.uid(), 'gem', 'coupon', v_gem, v_code);

  update public.profiles
  set gem = gem + v_gem,
      lifetime_gem_earned = lifetime_gem_earned + v_gem
  where id = auth.uid()
  returning * into result;

  return jsonb_build_object('profile', to_jsonb(result), 'amount', v_gem);
end;
$$;

create or replace function public.grant_gold_admin(p_amount int)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  v_max_amount constant int := 1000000;
begin
  if not exists (select 1 from public.admin_accounts where profile_id = auth.uid()) then
    raise exception 'ไม่มีสิทธิ์เสกทอง';
  end if;
  if p_amount <= 0 then
    raise exception 'จำนวนทองไม่ถูกต้อง';
  end if;
  if p_amount > v_max_amount then
    raise exception 'จำนวนทองเกินขีดจำกัด (%): %', v_max_amount, p_amount;
  end if;

  insert into public.currency_transactions (profile_id, currency, source, amount)
  values (auth.uid(), 'gold', 'admin', p_amount);

  update public.profiles
  set gold = gold + p_amount,
      lifetime_gold_earned = lifetime_gold_earned + p_amount
  where id = auth.uid()
  returning * into result;

  return result;
end;
$$;
