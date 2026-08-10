-- Security audit hardening, wave 1 — findings F1-F8 from the 2026-08-10 repo-wide audit
-- (12 agents: 7 CoalMine canaries + a 5-seat CoalBoard at nasa rigor; consolidated by the
-- system-25 caretaker). ONE migration on purpose: these are all server-authority fixes and
-- the owner pastes migrations by hand — fewer pastes, fewer ordering mistakes.
--
-- ── HOW THIS IS DEPLOYED ────────────────────────────────────────────────────────────────────
-- Applied by the OWNER via the Supabase SQL Editor (migration relay), NEVER `supabase db push`.
-- This file is the durable record of what was pasted and the source of truth for db reset/CI.
--
-- ⚠ ORDERING — paste strictly in filename order. This file assumes:
--   * 20260810100000 already applied (its earn_gold body is the base being replaced here;
--     lifetime_gold_earned exists from 20260809090000).
--   * 20260810130000 already applied (this file leaves commit_lobby_battle_progression alone
--     BECAUSE that file already hardened it — pasting this file without that one closes
--     nothing on the progression RPC).
--   If either is still relay-pending, paste them first, in order.
--
-- ⚠ EVERY statement here is RE-RUNNABLE — a double-paste of the whole file is safe. That is
-- a deliberate property (manual relay, retry-after-interruption is a real scenario); keep it
-- when editing.
--
-- ── F7, DOCUMENTED AS ACCEPTED RESIDUAL (no code change, decision recorded here) ────────────
-- 20260810130000's commit_lobby_battle_progression rejects a level rollback and bounds the
-- per-call level gain, but a client may still resend the SAME level with a LOWER exp, or send
-- exp_to_next = 1 to accelerate its next legitimate level-up. Judged and accepted, not missed:
-- level itself is monotonic + ceiling-bounded + capped, and the client ALREADY authors level
-- directly (the accepted client-authoritative PvE model, board scope B) — an attacker gains
-- strictly more by claiming +20 levels outright than by manipulating exp_to_next to reach the
-- same +20 through extra rate-limited calls, so a within-level guard adds defense against
-- nobody's best move. Down-writing one's own exp harms only the caller. The real closure is
-- server-side recompute of the whole curve — board scope C, tracked, NOT this wave.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F3 (CRITICAL): grant_item is overloaded — kill the 3-arg survivor, in a FILE this time
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 0011:111 defined grant_item(text,int,text); 0013:93 defined grant_item(text,int,text,text
-- default null). Different arity = `create or replace` keeps BOTH. Production was hand-fixed
-- live (MEMORY.md item 148) but the drop existed in no migration file, so every fresh env /
-- CI / db reset silently recreates the collision — and the surviving 3-arg twin has NO
-- item_grant_ledger idempotency. PostgREST additionally refuses to route an overloaded name
-- called with named params it can't disambiguate. The repo's own PGlite harness proves the
-- collision is live in CI today (starAscension.integration.test.ts applies 0011 then 0013).
drop function if exists public.grant_item(text, integer, text);

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F1 (CRITICAL, deadline ~2026-09-06): guest cleanup deletes by AGE, not inactivity
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 0006 deletes any is_anonymous account older than 30 days — a guest who plays EVERY DAY is
-- deleted on day 31 at 03:00 UTC, cascading through profiles into every child table. Backend
-- went live 2026-08-07, so the first real deletion fires ~2026-09-06. The sibling job (0014)
-- already models this correctly; this rewrite gives the guest job the same guards PLUS a real
-- inactivity test.
--
-- "Inactive" = ALL of these signals stale for 30 days:
--   * last_sign_in_at (GoTrue updates it on each sign-in; coalesce to created_at for rows
--     that predate the column having a value),
--   * battle_history (the one signal that requires actually playing — same reasoning 0014
--     documents at length),
--   * currency_transactions (any earn/spend implies a live session) — EXCLUDING source
--     'signup': those rows mark account creation, not play, and 20260810100000's backfill
--     stamped one onto every pre-existing account at APPLY time, which would otherwise read
--     as "every guest was active the day the migration landed".
-- Plus 0014's two standing exemptions: cleanup_exempt_profiles and any topup ever.
--
-- KNOWN LIMIT, stated not hidden: a guest with a persisted session who opens the game daily
-- but never battles and never earns/spends does NOT refresh last_sign_in_at (token refresh is
-- not a sign-in). Such an account still reads as inactive after 30 days. That residual class
-- is "installed, idles in the lobby, touches nothing for a month" — accepted; the exempt
-- table covers any real case that surfaces.
create or replace function public.cleanup_stale_guest_accounts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users u
  where u.is_anonymous is true
    and u.created_at < now() - interval '30 days'
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (
      select 1 from public.battle_history bh
      where bh.profile_id = u.id
        and bh.finished_at > now() - interval '30 days'
    )
    and not exists (
      select 1 from public.currency_transactions ct
      where ct.profile_id = u.id
        and ct.source <> 'signup'
        and ct.created_at > now() - interval '30 days'
    )
    and not exists (
      select 1 from public.cleanup_exempt_profiles ce where ce.profile_id = u.id
    )
    and not exists (
      select 1 from public.currency_transactions ct
      where ct.profile_id = u.id and ct.source = 'topup'
    );
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F4 (HIGH): grant_item mints ANY item id — the catalog check the localStorage twin has
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- src/data/accountRepository.ts:710 validates against the client catalog (`getItem(itemId)`)
-- before granting; the backend port lost that guard, and the refId dedupe is no defence
-- because the CLIENT mints the refId. No catalog table existed server-side — this is the
-- smallest one that closes the hole: one column, seeded from src/game/items.ts (the game's
-- declared single source of truth for items).
--
-- ⚠ MAINTENANCE CONTRACT: adding an item to src/game/items.ts now REQUIRES a companion
-- migration inserting its id here, or grant_item refuses it. That friction is the feature —
-- an unreleased item id cannot be minted into inventories before the game ships it.
create table if not exists public.item_catalog (
  item_id text primary key,
  created_at timestamptz not null default now()
);

-- Same zero-policy lockdown as rpc_rate_limit (0011) and lobby_progression_commits
-- (20260810130000): RLS on, every grant revoked, only SECURITY DEFINER functions read it.
alter table public.item_catalog enable row level security;
revoke all on public.item_catalog from public, anon, authenticated;

-- Seed = the complete ITEMS record in src/game/items.ts as of this migration (7 ids).
insert into public.item_catalog (item_id) values
  ('healing-peach'),
  ('spirit-incense'),
  ('iron-essence'),
  ('jade-shard'),
  ('naga-scale'),
  ('lotus-charm'),
  ('golden-gourd')
on conflict (item_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F5a (HIGH): rate-limit denials are invisible — record them the only way a rollback allows
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Two accounting defects, one honest limit:
--   (a) callers logged their rate-limit row BEFORE validating arguments, so a validation
--       raise rolled the log row back — invalid calls throttle nothing, forever. Fixed in the
--       CALLERS below (validate first), not here.
--   (b) a THROTTLED call raises before any row survives (the raise aborts the transaction,
--       taking any inserted row with it), so with the daily prune (0011:147) "is anyone being
--       rate-limited?" was unanswerable by construction.
-- Postgres has no autonomous transactions: NOTHING inserted in a transaction this function
-- then aborts can survive. `raise warning` is the one channel that escapes the rollback — it
-- reaches the Postgres log / Supabase Log Explorer. That is the denial record. Body otherwise
-- verbatim from 0011 (advisory lock reasoning and all — see that file).
create or replace function public.check_and_log_rpc_rate_limit(
  p_rpc_name text,
  p_max_calls int,
  p_window_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_calls int;
begin
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_rpc_name));

  select count(*) into v_recent_calls
  from public.rpc_rate_limit
  where profile_id = auth.uid()
    and rpc_name = p_rpc_name
    and called_at > now() - make_interval(secs => p_window_seconds);

  if v_recent_calls >= p_max_calls then
    raise warning 'rpc_rate_limit deny: profile=% rpc=% recent_calls=% window=%s',
      auth.uid(), p_rpc_name, v_recent_calls, p_window_seconds;
    raise exception 'เรียกใช้งานถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง';
  end if;

  insert into public.rpc_rate_limit (profile_id, rpc_name) values (auth.uid(), p_rpc_name);
end;
$$;

revoke execute on function public.check_and_log_rpc_rate_limit(text, int, int) from public, anon;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F5b: earn_gold — validate BEFORE the rate-limit call
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Body verbatim from 20260810100000:57-105 (topup removed from allowlist, ledger + lifetime).
-- The ONLY change is the order: the three argument checks now run before the rate-limit call,
-- so a malformed call is rejected without taking the advisory lock, the count query, and a
-- doomed insert. (A raise still rolls back everything — malformed calls remain unthrottled;
-- that is a Postgres property, not a choice. The cheap early reject is what's achievable.)
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
  if p_amount <= 0 then
    raise exception 'จำนวนทองไม่ถูกต้อง';
  end if;
  if p_amount > v_max_amount then
    raise exception 'จำนวนทองเกินขีดจำกัดต่อครั้ง (%): %', v_max_amount, p_amount;
  end if;
  if p_source not in ('quest', 'drop') then
    raise exception 'แหล่งที่มาทองไม่ถูกต้อง (รับเฉพาะ quest/drop): %', p_source;
  end if;

  perform public.check_and_log_rpc_rate_limit('earn_gold', 20, 60);

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

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F4 + F5b: grant_item — catalog check, validation before rate limit
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Body from 0013:93-140 (the 4-arg ledger version — now the ONLY version, per F3 above).
-- Changes: argument checks + the new catalog check run before the rate-limit call; error text
-- for an unknown id matches the localStorage twin ('ไม่พบไอเทมนี้') so the client surfaces one
-- consistent message from either repository.
create or replace function public.grant_item(
  p_item_id text,
  p_quantity int,
  p_source text,
  p_ref_id text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  result public.profiles;
  v_max_quantity constant int := 100;
begin
  if p_quantity <= 0 then
    raise exception 'จำนวนไอเทมไม่ถูกต้อง';
  end if;
  if p_quantity > v_max_quantity then
    raise exception 'จำนวนไอเทมเกินขีดจำกัดต่อครั้ง (%): %', v_max_quantity, p_quantity;
  end if;
  if p_source not in ('quest', 'drop') then
    raise exception 'แหล่งที่มาไอเทมไม่ถูกต้อง: %', p_source;
  end if;
  if not exists (select 1 from public.item_catalog ic where ic.item_id = p_item_id) then
    raise exception 'ไม่พบไอเทมนี้: %', p_item_id;
  end if;

  perform public.check_and_log_rpc_rate_limit('grant_item', 20, 60);

  if p_ref_id is not null then
    begin
      insert into public.item_grant_ledger (profile_id, ref_id, item_id, quantity, source)
      values (v_profile_id, p_ref_id, p_item_id, p_quantity, p_source);
    exception
      when unique_violation then
        select * into result from public.profiles where id = v_profile_id;
        return result;
    end;
  end if;

  insert into public.inventory_items (profile_id, item_id, quantity, obtained_from)
  values (v_profile_id, p_item_id, p_quantity, p_source)
  on conflict (profile_id, item_id)
  do update set quantity = public.inventory_items.quantity + excluded.quantity;

  select * into result from public.profiles where id = v_profile_id;
  return result;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F6 (MEDIUM): upsert_pending_lobby_reward — the last ungoverned write path
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 0013:170-206 shipped it with no execute lock, no rate limit, no bounds, and a CLIENT-CHOSEN
-- primary key — unbounded rows per account with arbitrary payloads. It is a resume-cache the
-- client replays through the (already-hardened) earn/grant/commit RPCs, so the values can't
-- mint anything directly; the exposure is storage abuse and garbage payloads. Bounds + rate
-- limit + a per-account row cap close that. The advisory lock inside the rate-limit call
-- serializes concurrent calls per (account, rpc), which is what makes count-then-insert safe
-- against a Promise.all burst — same reasoning as 20260810130000's bounds check.
create or replace function public.upsert_pending_lobby_reward(
  p_transaction_id text,
  p_stage_id text,
  p_stage_name text,
  p_outcome text,
  p_earned_exp int,
  p_earned_gold int,
  p_dropped_items jsonb,
  p_finished_at timestamptz,
  p_duration_ms int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  -- Generous over real play: the client holds at most ONE pending reward per battle resume.
  -- 64 rows means something is wrong; raising beats silently absorbing a flood.
  v_row_cap constant int := 64;
begin
  if v_profile_id is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนบันทึกรางวัลค้าง';
  end if;
  if p_transaction_id is null or length(btrim(p_transaction_id)) = 0 then
    raise exception 'รหัสรายการไม่ถูกต้อง';
  end if;
  if p_earned_exp < 0 or p_earned_gold < 0 then
    raise exception 'ค่ารางวัลไม่ถูกต้อง';
  end if;
  if p_dropped_items is not null and jsonb_typeof(p_dropped_items) <> 'array' then
    raise exception 'รูปแบบไอเทมดรอปไม่ถูกต้อง';
  end if;

  perform public.check_and_log_rpc_rate_limit('upsert_pending_lobby_reward', 20, 60);

  if not exists (
    select 1 from public.pending_lobby_rewards
    where profile_id = v_profile_id and transaction_id = p_transaction_id
  ) and (
    select count(*) from public.pending_lobby_rewards where profile_id = v_profile_id
  ) >= v_row_cap then
    raise exception 'รายการรางวัลค้างเต็มแล้ว (%)', v_row_cap;
  end if;

  insert into public.pending_lobby_rewards (
    profile_id, transaction_id, stage_id, stage_name, outcome,
    earned_exp, earned_gold, dropped_items, finished_at, duration_ms
  )
  values (
    v_profile_id, p_transaction_id, p_stage_id, p_stage_name, p_outcome,
    p_earned_exp, p_earned_gold, coalesce(p_dropped_items, '[]'::jsonb),
    p_finished_at, p_duration_ms
  )
  on conflict (profile_id, transaction_id) do update set
    stage_id = excluded.stage_id,
    stage_name = excluded.stage_name,
    outcome = excluded.outcome,
    earned_exp = excluded.earned_exp,
    earned_gold = excluded.earned_gold,
    dropped_items = excluded.dropped_items,
    finished_at = excluded.finished_at,
    duration_ms = excluded.duration_ms;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F8 (LOW, latent): gacha_banners.currency can say 'gold' while the code only debits gem
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 20260809073000 hardcodes the gem debit (:208-211) and the gem ledger row (:294,:299-300) but
-- the schema permits currency='gold' and the pull payload echoes v_banner.currency — a gold
-- banner would CHARGE GEMS and REPORT GOLD. Honouring gold for real is a product decision
-- nobody has made (every banner shipped is gem); until then the schema must not be able to
-- express the lie. Tighten the CHECK so a gold banner is a loud migration-time decision, not
-- a silent data row. Data alignment first so the ADD cannot fail on a nonconforming row —
-- today that UPDATE matches zero rows in every known environment.
update public.gacha_banners set currency = 'gem' where currency <> 'gem';

alter table public.gacha_banners drop constraint if exists gacha_banners_currency_check;
alter table public.gacha_banners
  add constraint gacha_banners_currency_check check (currency in ('gem'));

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- F2 (CRITICAL): the EXECUTE sweep — twelve SECURITY DEFINER functions, stated policy applied
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and PostgREST exposes every
-- public-schema function at /rest/v1/rpc/<name>. This repo's own standard (0011:68-72,
-- 0012:53-54, 20260810130000 §4) is revoke from public+anon, grant to authenticated where a
-- client legitimately calls it — these twelve shipped without it. `create or replace` above
-- PRESERVES existing ACLs, so this block runs last and is authoritative regardless of what
-- the re-creates did.
--
-- The four cron-only jobs get NO grant at all: pg_cron runs them as the function owner, which
-- needs no grant — no live role has any business calling mass-deletion/archival jobs, and
-- before this block an UNAUTHENTICATED anon-key caller could trigger them at will (they have
-- no auth.uid() guard; "delete every stale account" was one HTTP call away).
revoke execute on function public.cleanup_stale_guest_accounts() from public, anon, authenticated;
revoke execute on function public.cleanup_dead_unplayed_accounts() from public, anon, authenticated;
revoke execute on function public.cleanup_old_audit_log_entries() from public, anon, authenticated;
revoke execute on function public.archive_currency_transactions(interval) from public, anon, authenticated;

-- The eight client-callable RPCs: anon fails closed on auth.uid() today, but the stated
-- standard exists precisely so nobody has to re-derive that argument per function.
revoke execute on function public.earn_gold(text, int, text) from public, anon;
grant execute on function public.earn_gold(text, int, text) to authenticated;

revoke execute on function public.grant_item(text, int, text, text) from public, anon;
grant execute on function public.grant_item(text, int, text, text) to authenticated;

revoke execute on function public.redeem_coupon(text) from public, anon;
grant execute on function public.redeem_coupon(text) to authenticated;

revoke execute on function public.grant_character(text) from public, anon;
grant execute on function public.grant_character(text) to authenticated;

revoke execute on function public.grant_gold_admin(int) from public, anon;
grant execute on function public.grant_gold_admin(int) to authenticated;

revoke execute on function public.grant_item_admin(text, int) from public, anon;
grant execute on function public.grant_item_admin(text, int) to authenticated;

revoke execute on function public.upsert_pending_lobby_reward(
  text, text, text, text, int, int, jsonb, timestamptz, int
) from public, anon;
grant execute on function public.upsert_pending_lobby_reward(
  text, text, text, text, int, int, jsonb, timestamptz, int
) to authenticated;

revoke execute on function public.clear_pending_lobby_reward(text) from public, anon;
grant execute on function public.clear_pending_lobby_reward(text) to authenticated;
