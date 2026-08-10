-- Task #26 / #35 — the economy half: make the COST side of a hero upgrade server-authoritative.
--
-- ── THE DEFECT THIS CLOSES ──────────────────────────────────────────────────────────────────
-- `savePlayer` writes skill_levels / talent_state / awakening_state, and CANNOT write gold or
-- inventory (profiles.gold has been column-locked since 0009:103; inventory_items has `select`
-- alone since 0001_init.sql:111). progressionService.spendCost() debits gold in the client's
-- own copy of the Player and that debit is dropped on save. So the EFFECT of an upgrade
-- persists and its COST evaporates: free, unlimited upgrades, live in production.
--
-- This is the contract's own Scar 1 (docs/agent-blueprint/22-currency-system.md:63 — "can the
-- 'cost' side be driven to zero while the 'reward' side still fires") answered YES.
--
-- The column lock is CORRECT and stays. The fix is the missing half: one SECURITY DEFINER RPC
-- that debits and applies in the SAME transaction, plus removing the client's ability to apply
-- an upgrade on its own.
--
-- 20260810130000:49-50 predicted this exact file: "skill_levels / talent_state / awakening_state
-- stay client-writable on purpose: that is F2, task #26's topic, not this one."
--
-- ── HOW THIS IS DEPLOYED ────────────────────────────────────────────────────────────────────
-- Applied by the OWNER via the Supabase SQL Editor (migration relay), NEVER `supabase db push`.
-- This file is the durable record of what was pasted and the source of truth for db reset/CI.
--
-- ⚠ ORDERING — paste strictly in filename order. This file assumes applied:
--   * 20260808204905 (owned_characters column allowlist introduced; ascend_character_star's
--     compare-and-swap shape is the model this RPC follows)
--   * 20260810130000 (narrowed that allowlist to the three columns this file now removes)
--   * 20260810160000 (item_catalog's locked-table pattern; the validate-BEFORE-rate-limit
--     ordering this file copies)
--
-- ⚠ DEPLOY ORDER AGAINST THE CLIENT — CLIENT FIRST, then this file.
-- §5 revokes the client's UPDATE on skill_levels/talent_state/awakening_state. The CURRENT
-- shipped `savePlayer` sends all three on every save, so applying this file before the client
-- that stops sending them makes Postgres answer 42501 and savePlayer returns false — which
-- useAuth turns into a FULL rollback of the whole save (team, friends, flags), not just the
-- progression fields. Exactly the failure 20260810130000's own header warns about. Wait for the
-- client deploy.
--
-- ⚠ EVERY statement here is RE-RUNNABLE — a double-paste of the whole file is safe. Manual
-- relay means retry-after-interruption is a real scenario; keep this property when editing.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. THE COST TABLE — because today the prices exist only in the client
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Stated plainly: before this migration there is NO server-side notion of what an upgrade
-- costs. The numbers live in TypeScript fixtures (src/game/progression/progressionConfig.ts —
-- SKILL_PROGRESSION_FIXTURES, TALENT_NODE_FIXTURES, AWAKENING_TIER_FIXTURE_COSTS) which the
-- server cannot read. A server that cannot price an upgrade can only trust the client's price,
-- which is the bug wearing a different hat.
--
-- So the prices come across into a table the client cannot touch, exactly the way
-- 20260810160000 brought src/game/items.ts across into item_catalog. Same lockdown, same
-- maintenance contract, same friction-is-the-feature reasoning.
--
-- ⚠ MAINTENANCE CONTRACT: changing a cost in progressionConfig.ts now REQUIRES a companion
-- migration updating the matching row here, or the RPC prices the upgrade at the OLD number
-- (or refuses it outright if the row is missing). src/data/progressionCostParity.test.ts fails
-- the build when the two disagree, so the drift cannot ship silently — but it is a real
-- two-place edit and pretending otherwise would be dishonest.
--
-- ⚠ GOLD ONLY, and that is a REAL limit, not an omission. SkillUpgradeCost also has a
-- `materials` field. No fixture uses it today (verified across all three fixture tables), so
-- this table prices gold alone. The client wiring REFUSES to submit an upgrade whose cost
-- carries materials rather than silently dropping them, and the parity test asserts no fixture
-- has grown one. Adding the first material cost means extending this table AND the RPC.
create table if not exists public.progression_cost_catalog (
  -- 'skill' | 'talent' | 'awakening'
  upgrade_kind text not null check (upgrade_kind in ('skill', 'talent', 'awakening')),
  -- '' means "any hero" — awakening tiers are priced globally today. Exact matches win.
  hero_id text not null,
  -- skill: the slot id ('skill1'..'ultimate') · talent: the node id · awakening: ''
  upgrade_key text not null,
  -- the level/tier being upgraded FROM. Talent nodes are a one-shot unlock, so 0.
  from_level int not null check (from_level >= 0),
  gold_cost int not null check (gold_cost >= 0),
  primary key (upgrade_kind, hero_id, upgrade_key, from_level)
);

-- Same zero-policy lockdown as item_catalog (20260810160000:144), rpc_rate_limit (0011) and
-- lobby_progression_commits (20260810130000): RLS on, every grant revoked, read only from
-- inside a SECURITY DEFINER function. A client that could read this could not do anything with
-- it, but a client that could WRITE it would set every price to zero.
alter table public.progression_cost_catalog enable row level security;
revoke all on public.progression_cost_catalog from public, anon, authenticated;

-- Seed = progressionConfig.ts as of this migration, transcribed one-for-one.
--   SKILL_PROGRESSION_FIXTURES[hero][slot].upgradeCosts[i] is the cost to go from level i+1 to
--   i+2 — see getSkillUpgradeCost(), which indexes `upgradeCosts[currentLevel - 1]`. So the
--   from_level below is the array index + 1.
-- `on conflict do update` (not `do nothing`) so a re-paste after a price edit converges rather
-- than silently keeping the old number.
insert into public.progression_cost_catalog (upgrade_kind, hero_id, upgrade_key, from_level, gold_cost)
values
  -- monkey-king skill1: [50, 80, 120, 180], maxLevel 5
  ('skill', 'monkey-king', 'skill1', 1, 50),
  ('skill', 'monkey-king', 'skill1', 2, 80),
  ('skill', 'monkey-king', 'skill1', 3, 120),
  ('skill', 'monkey-king', 'skill1', 4, 180),
  -- monkey-king skill2: [40, 70, 100, 150], maxLevel 5
  ('skill', 'monkey-king', 'skill2', 1, 40),
  ('skill', 'monkey-king', 'skill2', 2, 70),
  ('skill', 'monkey-king', 'skill2', 3, 100),
  ('skill', 'monkey-king', 'skill2', 4, 150),
  -- monkey-king skill3: [40, 70, 100, 150], maxLevel 5
  ('skill', 'monkey-king', 'skill3', 1, 40),
  ('skill', 'monkey-king', 'skill3', 2, 70),
  ('skill', 'monkey-king', 'skill3', 3, 100),
  ('skill', 'monkey-king', 'skill3', 4, 150),
  -- monkey-king ultimate: [100, 200], maxLevel 3
  ('skill', 'monkey-king', 'ultimate', 1, 100),
  ('skill', 'monkey-king', 'ultimate', 2, 200),
  -- pig-warrior skill1: [45, 90], maxLevel 3
  ('skill', 'pig-warrior', 'skill1', 1, 45),
  ('skill', 'pig-warrior', 'skill1', 2, 90),
  -- TALENT_NODE_FIXTURES
  ('talent', 'monkey-king', 'mk-talent-1', 0, 30),
  ('talent', 'monkey-king', 'mk-talent-2', 0, 60),
  -- AWAKENING_TIER_FIXTURE_COSTS — priced by tier, not by hero
  ('awakening', '', '', 0, 200),
  ('awakening', '', '', 1, 400),
  ('awakening', '', '', 2, 800)
on conflict (upgrade_kind, hero_id, upgrade_key, from_level)
  do update set gold_cost = excluded.gold_cost;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. THE SPEND LEDGER — server-owned, never pruned
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Keyed (profile_id, request_id) for network-retry replay, the way star_ascension_history
-- (20260808204905:29-36) and item_grant_ledger (0013:78-87) are.
--
-- ⚠ BUT THE REFID IS NOT THE REAL GUARD, and it cannot be: the CLIENT mints request_id, so a
-- client that wants a second free upgrade simply mints a second uuid. The ledger only makes a
-- RETRY of the same call safe. What actually stops a replay is the compare-and-swap in §3: the
-- caller states the level it believes the hero is at, the server reads the true current level
-- from owned_characters, and a mismatch is a rejection. After the first upgrade commits, the
-- true level has moved, so the same upgrade submitted again under a fresh uuid finds
-- from_level stale and is refused. The server's own state is the idempotency key; request_id
-- only decides whether a duplicate is answered with the old result or with an error.
--
-- NEVER PRUNE THIS TABLE — same reasoning as lobby_progression_commits (20260810130000) and
-- .agents/rules/currency-ledger-retention.md: deleting a row makes its request id replayable.
create table if not exists public.progression_spend_ledger (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  upgrade_kind text not null,
  hero_id text not null,
  upgrade_key text not null,
  from_level int not null,
  to_level int not null,
  gold_spent int not null check (gold_spent >= 0),
  created_at timestamptz not null default now(),
  primary key (profile_id, request_id)
);

alter table public.progression_spend_ledger enable row level security;

drop policy if exists "own progression spend ledger" on public.progression_spend_ledger;
create policy "own progression spend ledger"
  on public.progression_spend_ledger
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

-- Read-only to the client (a player may audit their own spending); every write path is the
-- SECURITY DEFINER function below.
revoke all on public.progression_spend_ledger from public, anon, authenticated;
grant select on public.progression_spend_ledger to authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. THE LEDGER CONSTRAINT — a gold DEBIT row has to become legal
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- currency_transactions currently permits exactly one negative row: gem/gacha (added
-- 20260809073000:132, carried forward verbatim by 20260810100000:47). Gold has been credit-only
-- since 0001. A spend needs `(currency='gold' and source='upgrade' and amount<0)`.
--
-- ⚠ EVERY EXISTING BRANCH IS CARRIED FORWARD VERBATIM. This project's own memory records the
-- trap (MEMORY/22-currency-system.md): a constraint rewrite that drops the gem/gacha negative
-- branch breaks gacha the moment someone pulls. The three lines below are byte-for-byte
-- 20260810100000:45-47 plus one new line.
--
-- 'upgrade' is NOT excluded from the guest-inactivity signal in 20260810160000's cleanup
-- rewrite, and should not be: spending gold on an upgrade is unambiguously playing.
alter table public.currency_transactions
  drop constraint if exists currency_transactions_source_check,
  drop constraint if exists currency_source_match;

alter table public.currency_transactions
  add constraint currency_transactions_source_check
    check (source in ('quest', 'drop', 'topup', 'coupon', 'admin', 'gacha', 'signup', 'upgrade')),
  add constraint currency_source_match check (
    (currency = 'gold' and source in ('quest', 'drop', 'topup', 'admin', 'signup') and amount > 0)
    or (currency = 'gem' and source in ('topup', 'coupon', 'signup') and amount > 0)
    or (currency = 'gem' and source = 'gacha' and amount < 0)
    or (currency = 'gold' and source = 'upgrade' and amount < 0)
  );

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. spend_progression_upgrade — debit and apply, atomically
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Returns the new balance and level so the caller can render immediately; the client reloads
-- the full Player afterwards anyway.
--
-- Argument validation runs BEFORE check_and_log_rpc_rate_limit, per the ordering
-- 20260810160000 established (F5a): a malformed call must be rejected cheaply, and a call that
-- raises AFTER logging its rate-limit row rolls that row back, so invalid calls would throttle
-- nothing forever.
--
-- ⚠ lifetime_gold_earned is deliberately NOT touched. It is lifetime EARNED — a spend does not
-- un-earn anything, and 20260810100000's backfill derives it from credit rows only. Decrementing
-- it here would corrupt the one reconciliation column this system has.
create or replace function public.spend_progression_upgrade(
  p_request_id uuid,
  p_character_id text,
  p_upgrade_kind text,
  p_upgrade_key text,
  p_from_level int
)
returns table (
  gold_spent int,
  gold_balance int,
  new_level int,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_existing public.progression_spend_ledger;
  v_gold_cost int;
  v_gold_balance int;
  v_to_level int;
  v_skill_levels jsonb;
  v_talent jsonb;
  v_awakening jsonb;
  v_current_level int;
begin
  -- ── validate first, rate-limit second (20260810160000 F5a) ────────────────────────────────
  if v_profile_id is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนอัปเกรด';
  end if;
  if p_request_id is null then
    raise exception 'request ID ไม่ถูกต้อง';
  end if;
  if p_character_id is null or length(btrim(p_character_id)) = 0 then
    raise exception 'รหัสฮีโร่ไม่ถูกต้อง';
  end if;
  if p_upgrade_kind not in ('skill', 'talent', 'awakening') then
    raise exception 'ชนิดการอัปเกรดไม่ถูกต้อง: %', p_upgrade_kind;
  end if;
  if p_from_level is null or p_from_level < 0 then
    raise exception 'ระดับปัจจุบันไม่ถูกต้อง';
  end if;
  if p_upgrade_kind = 'skill' and p_upgrade_key not in ('skill1', 'skill2', 'skill3', 'ultimate')
  then
    raise exception 'ช่องสกิลไม่ถูกต้อง: %', p_upgrade_key;
  end if;

  perform public.check_and_log_rpc_rate_limit('spend_progression_upgrade', 30, 60);

  -- Serialize every spend for one account — closes the concurrent double-submit race the same
  -- way ascend_character_star does (20260808204905:96).
  perform 1 from public.profiles where id = v_profile_id for update;
  if not found then
    raise exception 'ไม่พบบัญชีผู้เล่น';
  end if;

  -- ── retry replay: same request id returns the recorded result, charges nothing ────────────
  select * into v_existing
  from public.progression_spend_ledger
  where profile_id = v_profile_id and request_id = p_request_id;

  if found then
    -- A reused id pointed at a DIFFERENT upgrade is a client bug or an attack, never a retry.
    if v_existing.upgrade_kind <> p_upgrade_kind
      or v_existing.hero_id <> p_character_id
      or v_existing.upgrade_key <> p_upgrade_key
      or v_existing.from_level <> p_from_level
    then
      raise exception 'request ID ถูกใช้กับการอัปเกรดอื่นแล้ว';
    end if;
    select profiles.gold into v_gold_balance from public.profiles where id = v_profile_id;
    return query select v_existing.gold_spent, v_gold_balance, v_existing.to_level, true;
    return;
  end if;

  -- ── read the hero's TRUE state; the client's claim is only a compare-and-swap witness ─────
  select owned.skill_levels, owned.talent_state, owned.awakening_state
  into v_skill_levels, v_talent, v_awakening
  from public.owned_characters as owned
  where owned.profile_id = v_profile_id
    and owned.character_id = p_character_id
  for update;

  if not found then
    raise exception 'ไม่พบฮีโร่ที่ครอบครอง';
  end if;

  if p_upgrade_kind = 'skill' then
    v_current_level := coalesce((v_skill_levels -> p_upgrade_key ->> 'level')::int, 1);
  elsif p_upgrade_kind = 'awakening' then
    v_current_level := coalesce((v_awakening ->> 'tier')::int, 0);
  else
    -- Talent nodes are one-shot: "already unlocked" is the state check, and from_level is 0.
    v_current_level := 0;
    if coalesce(v_talent -> 'unlockedNodes', '[]'::jsonb) ? p_upgrade_key then
      raise exception 'ปลดล็อกพรสวรรค์นี้ไปแล้ว';
    end if;
  end if;

  -- THE replay guard. After a successful upgrade the true level has moved, so re-submitting
  -- the same upgrade under a fresh request id lands here and is refused.
  if v_current_level <> p_from_level then
    raise exception 'สถานะฮีโร่เปลี่ยนไปแล้ว (เซิร์ฟเวอร์: %, ที่ส่งมา: %)',
      v_current_level, p_from_level;
  end if;

  -- ── the server prices it. The client never sends a number. ────────────────────────────────
  select catalog.gold_cost into v_gold_cost
  from public.progression_cost_catalog as catalog
  where catalog.upgrade_kind = p_upgrade_kind
    and catalog.hero_id in (p_character_id, '')
    and catalog.upgrade_key = case when p_upgrade_kind = 'awakening' then '' else p_upgrade_key end
    and catalog.from_level = p_from_level
  order by (catalog.hero_id = '')  -- false sorts first: an exact hero match wins the wildcard
  limit 1;

  if v_gold_cost is null then
    raise exception 'ไม่พบราคาของการอัปเกรดนี้ (% % ระดับ %)',
      p_upgrade_kind, p_upgrade_key, p_from_level;
  end if;

  select profiles.gold into v_gold_balance from public.profiles where id = v_profile_id;

  -- Rejection, never a clamp: an underfunded upgrade buys nothing and costs nothing.
  if v_gold_balance < v_gold_cost then
    raise exception 'ทองไม่เพียงพอ (ต้องการ %, มี %)', v_gold_cost, v_gold_balance;
  end if;

  v_to_level := v_current_level + 1;

  -- ── debit and apply, one transaction ──────────────────────────────────────────────────────
  v_gold_balance := v_gold_balance - v_gold_cost;
  update public.profiles set gold = v_gold_balance where id = v_profile_id;

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values (v_profile_id, 'gold', 'upgrade', -v_gold_cost, p_request_id::text);

  if p_upgrade_kind = 'skill' then
    update public.owned_characters
    set skill_levels = jsonb_set(
      coalesce(skill_levels, '{}'::jsonb),
      array[p_upgrade_key, 'level'],
      to_jsonb(v_to_level),
      true
    )
    where profile_id = v_profile_id and character_id = p_character_id;
  elsif p_upgrade_kind = 'awakening' then
    update public.owned_characters
    set awakening_state = jsonb_build_object(
      'tier', v_to_level,
      'unlockedEffects', jsonb_build_array('awakening-tier-' || v_to_level::text)
    )
    where profile_id = v_profile_id and character_id = p_character_id;
  else
    update public.owned_characters
    set talent_state = jsonb_build_object(
      'unlockedNodes',
      coalesce(talent_state -> 'unlockedNodes', '[]'::jsonb) || to_jsonb(p_upgrade_key)
    )
    where profile_id = v_profile_id and character_id = p_character_id;
  end if;

  insert into public.progression_spend_ledger (
    profile_id, request_id, upgrade_kind, hero_id, upgrade_key, from_level, to_level, gold_spent
  ) values (
    v_profile_id, p_request_id, p_upgrade_kind, p_character_id, p_upgrade_key,
    p_from_level, v_to_level, v_gold_cost
  );

  return query select v_gold_cost, v_gold_balance, v_to_level, false;
end;
$$;

-- Supabase's bootstrap grants EXECUTE to `authenticated` directly, so a revoke aimed only at
-- `public`/`anon` leaves that direct grant standing (20260810160000:440-448 records the whole
-- reasoning). Revoke from all three, then grant back the one role that should have it.
revoke all on function public.spend_progression_upgrade(uuid, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.spend_progression_upgrade(uuid, text, text, text, int)
  to authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 5. CLOSE THE CLIENT'S OWN WRITE PATH — the half that actually kills the free upgrade
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Adding the RPC alone changes nothing: `savePlayer` can still PATCH skill_levels directly, so
-- an upgrade remains free for anyone who skips the RPC. 20260810130000:38-42 documents that
-- `revoke update on <table>` CASCADES to that table's per-column UPDATE ACLs — so this single
-- revoke, with NO re-grant, leaves the client no writable column on owned_characters at all.
--
-- Every legitimate write to this table now goes through a SECURITY DEFINER function:
--   level / exp / exp_to_next   → commit_lobby_battle_progression (20260810130000)
--   star / shards               → ascend_character_star (20260808204905)
--   skill_levels / talent_state / awakening_state → spend_progression_upgrade (this file)
-- SELECT is untouched — the "own characters" policy from 0001 still applies.
--
-- ⚠ See the CLIENT-FIRST warning in this file's header. The shipped savePlayer sends these
-- three columns; applying this before that client deploys makes EVERY save fail with 42501.
revoke update on public.owned_characters from authenticated;
