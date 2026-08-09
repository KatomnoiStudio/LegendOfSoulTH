-- Currency-ledger integrity — issue #101 Findings 1 (HIGH) and 4 (LOW), external security audit.
-- One migration because both findings are the same defect class in the same ledger: a currency
-- path that writes (or lets a client write) a balance the ledger cannot justify.
--
-- ── Finding 1 (HIGH): earn_gold accepted p_source = 'topup' ────────────────────────────────
-- earn_gold is granted to `authenticated`, so any signed-in session could call
--   supabase.rpc('earn_gold', { p_source: 'topup', p_amount: 1000 })
-- and mint gold that the ledger then records as a PAID top-up, with no payment verification
-- anywhere in the path — bounded only by 0009's 1000/call cap and 0011's 20/min rate limit,
-- i.e. ~20,000 free gold per minute per account, laundered through the one source tag the
-- retention rule (.agents/rules/currency-ledger-retention.md) treats as permanent financial
-- evidence and 0014_dead_account_cleanup.sql treats as proof of a paying player.
--
-- Removal breaks no live caller: topUpGold/topUpGems on the Supabase backend are disabled
-- stubs returning {ok:false} (src/data/accountRepository.supabase.ts:501-507, "fork issue #19"),
-- and no other code path passes 'topup' to earn_gold. When a real payment gateway ships it gets
-- its own gateway-verifying RPC — a gold-earning RPC is the wrong place for it by construction.
--
-- 'topup' stays a VALID LEDGER SOURCE (table constraints below keep it): historical rows, the
-- archive exclusion, and cleanup_dead_unplayed_accounts' paying-player exemption all depend on
-- it. Only earn_gold's own allowlist loses it.
--
-- ── Finding 4 (LOW): handle_new_user granted 500 gold / 20 gem with no ledger rows ─────────
-- 0001_init.sql's signup trigger set the starting balance by direct UPDATE. Consequences:
--   * every account's ledger is short by its signup grant — the append-only trail cannot
--     reconstruct the balance it claims to explain
--   * lifetime_gold_earned / lifetime_gem_earned (20260809090000) were BACKFILLED FROM LEDGER
--     SUMS, so the signup grant is missing from them too — the reconciliation column's whole
--     premise ("the total stays correct no matter what detail moves to the archive") is false
--     by exactly 500/20 on every account that exists today
-- Fixed by giving the grant its own source tag ('signup'), writing it as real ledger rows at
-- account creation, and backfilling the rows + lifetime totals for existing accounts.

-- ── 1. Ledger constraints: admit 'signup' ──────────────────────────────────────────────────
-- Extends 20260809073000_p9_gacha_server_authority.sql:125-133. The gacha rules are carried
-- forward verbatim — the gem-debit row (amount < 0) must stay legal.
alter table public.currency_transactions
  drop constraint if exists currency_transactions_source_check,
  drop constraint if exists currency_source_match;

alter table public.currency_transactions
  add constraint currency_transactions_source_check
    check (source in ('quest', 'drop', 'topup', 'coupon', 'admin', 'gacha', 'signup')),
  add constraint currency_source_match check (
    (currency = 'gold' and source in ('quest', 'drop', 'topup', 'admin', 'signup') and amount > 0)
    or (currency = 'gem' and source in ('topup', 'coupon', 'signup') and amount > 0)
    or (currency = 'gem' and source = 'gacha' and amount < 0)
  );

-- currency_transactions_amount_nonzero (same migration) is deliberately left in place — this
-- change does not touch the zero-amount rule.

-- ── 2. earn_gold: 'topup' out of the allowlist (Finding 1) ─────────────────────────────────
-- Body copied verbatim from its latest definition (20260809090000_p_currency_ledger_archive.sql
-- :115-160 — rate limit from 0011, per-call cap from 0009, refId dedupe from 0013, lifetime
-- increment from 20260809090000). The ONLY changes are the source allowlist and its error text.
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
  -- 'topup' removed: a paid top-up must be verified by a payment gateway, never asserted by
  -- the client. 'signup' is not here either — the signup grant is written by the trigger below,
  -- not by any client-callable RPC.
  if p_source not in ('quest', 'drop') then
    raise exception 'แหล่งที่มาทองไม่ถูกต้อง (รับเฉพาะ quest/drop): %', p_source;
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

-- ── 3. handle_new_user: the signup grant becomes real ledger rows (Finding 4) ──────────────
-- Body copied from 0001_init.sql:217-241 (its only definition — 0006/0014 reference it but do
-- not redefine it). Changes: two ledger rows inserted BEFORE the balance update, and the
-- lifetime counters set in the same statement that sets the balance, so an account is never
-- observable in a state where its balance and its ledger disagree.
--
-- ref_id 'signup' is what makes this idempotent at the DB layer: 0013's unique index
-- currency_transactions_profile_ref_unique (profile_id, currency, source, ref_id) where ref_id
-- is not null already rejects a second signup row per currency per profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, uid, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'uid', substr(new.id::text, 1, 10)),
    coalesce(new.raw_user_meta_data->>'name', '')
  );

  insert into public.owned_characters (profile_id, character_id)
  values (new.id, 'monkey-king');

  insert into public.team_slots (profile_id, slot_index, character_id)
  values (new.id, 0, 'monkey-king'), (new.id, 1, null), (new.id, 2, null), (new.id, 3, null);

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values
    (new.id, 'gold', 'signup', 500, 'signup'),
    (new.id, 'gem', 'signup', 20, 'signup');

  update public.profiles
  set gold = 500,
      gem = 20,
      lifetime_gold_earned = 500,
      lifetime_gem_earned = 20
  where id = new.id;

  return new;
end;
$$;

-- ── 4. Archive exclusion for 'signup' ──────────────────────────────────────────────────────
-- Body copied from 20260809090000_p_currency_ledger_archive.sql:74-97; the only change is
-- adding 'signup' to the never-archive list, for the same reason coupon/topup are on it: the
-- backfill guard in step 5 and the DB-level uniqueness of the signup row both answer "does this
-- account already have its signup grant?" by scanning the hot table. Let a signup row age out
-- and a re-run would credit the grant a second time.
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
      and source not in ('coupon', 'topup', 'signup')
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

-- ── 5. Backfill existing accounts (Finding 4) ──────────────────────────────────────────────
-- Ledger + lifetime only. Balances are NOT touched: the old trigger already credited 500/20 to
-- profiles.gold/gem, so adding it again would mint currency rather than record it. ref_id
-- 'signup-backfill' distinguishes a reconstructed row from one written at real account
-- creation — the row is evidence of a grant that happened, not of when it was recorded.
--
-- Idempotent two ways: the `not exists` guard skips any profile that already has a signup row,
-- and 0013's unique index would reject a duplicate even if the guard were bypassed. The lifetime
-- update is driven by the INSERT's own RETURNING set, so an account that was skipped cannot have
-- its counters advanced.
with backfilled as (
  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  select p.id, grant_row.currency, 'signup', grant_row.amount, 'signup-backfill'
  from public.profiles p
  cross join (values ('gold', 500), ('gem', 20)) as grant_row(currency, amount)
  where not exists (
    select 1 from public.currency_transactions t
    where t.profile_id = p.id and t.source = 'signup'
  )
  returning profile_id
)
update public.profiles p
set lifetime_gold_earned = p.lifetime_gold_earned + 500,
    lifetime_gem_earned = p.lifetime_gem_earned + 20
where p.id in (select distinct profile_id from backfilled);
