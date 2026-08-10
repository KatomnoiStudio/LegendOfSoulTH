-- Security hardening — TASKS.md #25 "server-owns-progression (F1/F4)".
--
-- CoalBoard-designed: `.coalboard/reports/server-owns-progression-2026-08-10.md` (2026-08-10,
-- rigor=high, 3 blind lenses — empirical/formal/adversary — plus judge; all three converged).
-- The board offered scopes A / B / C; the owner chose **B — harden the RPC**. Read that report
-- for the full WHY; this header records only what B means for this file.
--
-- ── HOW THIS IS DEPLOYED ────────────────────────────────────────────────────────────────────
-- Applied by the OWNER via the Supabase SQL Editor (migration relay), NOT `supabase db push`.
-- This file is the durable record of what was pasted, and the source of truth for any future
-- `db reset` / CI / fresh environment.
--
-- ⚠ DEPLOY ORDER — THE CLIENT SHIPS FIRST, THIS MIGRATION SECOND. The client change that stops
-- sending level/exp/exp_to_next (`savePlayer` in src/data/accountRepository.supabase.ts) must be
-- live BEFORE the column lock below lands. Migration-first means an old client still PATCHes the
-- now-revoked columns, Postgres answers 42501, `savePlayer()` returns false, and
-- src/hooks/useAuth.ts rolls back the WHOLE save — team slots, friends, flags — not just the
-- progression fields. The blast radius of getting this order wrong is much larger than the hole.
--
-- ⚠ FILENAME TIMESTAMP IS LOAD-BEARING. It must sort AFTER 20260810110000. A `0016_*.sql` name
-- would sort BEFORE 20260808204905_p9_star_ascension_server_authority.sql, whose
-- `grant update (level, exp, ...) on owned_characters` would then run last and silently re-open
-- exactly the hole this file closes, on every replay of the migration chain.
--
-- ── WHAT THIS DOES *NOT* DO (accepted residual, scope C) ────────────────────────────────────
-- The server still does NOT recompute level/exp from the battle result — the client remains the
-- author of PvE outcomes (the project's accepted model), and this RPC still stores the numbers
-- it is handed. B bounds them; it does not derive them. A patient scripted client can therefore
-- still CREEP upward inside the per-call ceiling times the rate limit (see the ceiling comment
-- below for the exact arithmetic). Closing that means porting the exp→level curve into SQL —
-- board scope C — tracked separately, with its own client/server curve-divergence risk.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. COLUMN LOCK — level/exp/exp_to_next stop being client-writable on both tables
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- ⚠ DO NOT "OPTIMIZE AWAY" THE `revoke update` LINES. Each one does DOUBLE DUTY:
--   (a) it strips Supabase's project-bootstrap TABLE-WIDE update grant (a column-scoped REVOKE
--       cannot touch that — Postgres OR's table-level relacl against column-level attacl, the
--       finding 0009's Fix 3 comment records at length); and
--   (b) `revoke update on <table>` CASCADES to that table's existing per-column UPDATE ACLs, so
--       the narrower allowlist re-granted immediately after genuinely NARROWS the previous one
--       rather than adding to it.
-- Without (b) this file would be a no-op against the allowlists already in place. Verified in
-- CI by src/data/starAscension.integration.test.ts's has_column_privilege assertions.
--
-- Previous allowlists being narrowed:
--   profiles          — 0009_economy_integrity_fixes.sql:103-105
--   owned_characters  — 20260808204905_p9_star_ascension_server_authority.sql:53-57
-- skill_levels / talent_state / awakening_state stay client-writable on purpose: that is F2,
-- task #26's topic, not this one. Narrowing them here would be a second topic in one migration.

revoke update on public.profiles from authenticated;
grant update (name, title, frame_id, flags, defeated_npc_ids)
  on public.profiles to authenticated;

revoke update on public.owned_characters from authenticated;
grant update (skill_levels, talent_state, awakening_state)
  on public.owned_characters to authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. SERVER-OWNED IDEMPOTENCY LEDGER
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- The 0013 RPC guarded replay by READING flags->>'reward_tx_<id>_prog' and then OVERWRITING the
-- whole flags column with the client's own p_flags in the same statement — a guard whose state
-- the attacker supplies. `{p_flags: {}}` made even a repeated transaction id replayable, and a
-- freshly minted client-side id (`lobby:<stage>:<client clock>`) passed unconditionally.
--
-- Its own table, keyed the way item_grant_ledger (0013:78-87) and pending_lobby_rewards
-- (0013:151-164) already are: the row is written by the SECURITY DEFINER function itself and the
-- unique constraint — not application logic — is what makes a second commit a no-op.
--
-- NEVER PRUNE THIS TABLE. Deleting a row makes its transaction id replayable again, the same
-- trap .agents/rules/currency-ledger-retention.md records for coupon/topup rows. It grows one
-- narrow row per committed battle, the same shape and growth rate as item_grant_ledger.
create table if not exists public.lobby_progression_commits (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id text not null,
  committed_at timestamptz not null default now(),
  primary key (profile_id, transaction_id)
);

-- RLS on with ZERO policies, plus every grant revoked — identical to rpc_rate_limit (0011:16-25).
-- Only the SECURITY DEFINER function below (running as owner, unaffected by both) ever touches
-- it. A client that could read it learns nothing useful; a client that could write it could
-- forge or erase a replay guard, so it gets neither.
alter table public.lobby_progression_commits enable row level security;
revoke all on public.lobby_progression_commits from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. THE HARDENED RPC
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Same 21-argument signature as 0013:221-243 — deliberately unchanged so the shipped client
-- (accountRepository.supabase.ts commitLobbyBattleProgression) keeps working across the deploy
-- window in both directions.
--
-- `set search_path = public` matches every other SECURITY DEFINER function in this schema (see
-- 20260810101000's header); every object this body touches is schema-qualified regardless.
create or replace function public.commit_lobby_battle_progression(
  p_transaction_id text,
  p_name text,
  p_title text,
  p_profile_level int,
  p_profile_exp int,
  p_profile_exp_to_next int,
  p_frame_id text,
  p_flags jsonb,
  p_defeated_npc_ids text[],
  p_lead_character_id text,
  p_hero_level int,
  p_hero_exp int,
  p_hero_exp_to_next int,
  p_skill_levels jsonb,
  p_talent_state jsonb,
  p_awakening_state jsonb,
  p_battle_external_id text,
  p_opponent text,
  p_battle_result text,
  p_duration_ms int,
  p_finished_at timestamptz
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_current_profile_level int;
  v_current_hero_level int;
  result public.profiles;

  -- Per-call level-gain ceiling. 20 is not a taste call — it is the client's OWN structural
  -- maximum, read off the code that produces these numbers:
  --   * applyAccountExp   loops `while (...) guard < 20`  (RewardSystem.ts:112)
  --   * applyBattleExp    loops `while (...) cGuard < 20` (RewardSystem.ts:139)
  --   * exactly ONE applyBattleExp call feeds one commit  (lobbyBattleRewardPipeline.ts:114)
  -- so an honest client cannot construct a commit worth more than 20 levels even in principle,
  -- and a failed commit returns the ORIGINAL player (lobbyBattleRewardPipeline.ts:156) rather
  -- than keeping the gain, so a rejected call leaves no drift to accumulate into a later,
  -- larger delta. NOTE for whoever wires the dungeon path (see the dormant-trap comment in
  -- rewardGrantService.ts): the dungeon curve runs through heroExpService, whose loop guard is
  -- `guard < 100` (heroExpService.ts:34), not 20. Routing dungeon progression through this RPC
  -- without revisiting this ceiling would start rejecting honest commits.
  -- It is also enormous against real play: at account level 1 (expToNext 100,
  -- x1.2/level) twenty levels costs ~18,670 EXP in ONE battle, where the richest configured
  -- rewards are two digits (RewardSystem.ts 35-55/enemy + 25/wave; rewardConfig.ts heroExp 45).
  -- Generous on purpose, for the reason 0009's cap comment gives: content growth should not
  -- need a migration. It still kills the probed exploit outright — level 1 -> 999 is a gain of
  -- 998. RESIDUAL (scope C, see header): 20 levels x the 20-calls/60s limit below still allows
  -- a determined script to creep, loudly, with every call logged in rpc_rate_limit.
  v_max_level_gain constant int := 20;

  -- progressionConfig.maxHeroLevel (src/game/progression/progressionConfig.ts:12). The account
  -- level has no configured cap anywhere in the game, so only the per-call delta bounds it.
  v_max_hero_level constant int := 60;
begin
  if v_profile_id is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนบันทึกความคืบหน้า';
  end if;
  if p_transaction_id is null or length(btrim(p_transaction_id)) = 0 then
    raise exception 'รหัสรายการไม่ถูกต้อง';
  end if;

  -- (i) Rate limit. Same 20/60 as earn_gold/grant_item (0011). The helper's pg_advisory_xact_lock
  -- on (uid, rpc_name) also serializes concurrent calls of this RPC for this account for the rest
  -- of the transaction, which is what makes the read-current-then-write bounds check below safe
  -- against a Promise.all burst rather than merely safe against a sequential loop.
  perform public.check_and_log_rpc_rate_limit('commit_lobby_battle_progression', 20, 60);

  -- (ii) Idempotency, server-minted. A replayed transaction id is a no-op that returns the
  -- profile as it stands — the same contract the old flags guard promised, now backed by a
  -- constraint the caller cannot author. Any raise below this point aborts the transaction, so
  -- this row rolls back with it: a rejected commit never burns its transaction id.
  begin
    insert into public.lobby_progression_commits (profile_id, transaction_id)
    values (v_profile_id, p_transaction_id);
  exception
    when unique_violation then
      select * into result from public.profiles where id = v_profile_id;
      return result;
  end;

  -- (iii) Ownership. p_lead_character_id was free-form, and the persist step was an INSERT
  -- ... ON CONFLICT DO UPDATE running as the function owner — so the caller could name any hero
  -- id at all and have this RPC MINT it, at any level, bypassing gacha (#23), star ascension
  -- (#15) and the deliberate no-upsert invariant savePlayer documents at its owned_characters
  -- call site. Refusing an unowned lead is what allows step (v) to be a plain UPDATE.
  select level into v_current_hero_level
  from public.owned_characters
  where profile_id = v_profile_id and character_id = p_lead_character_id
  for update;

  if not found then
    raise exception 'ไม่พบฮีโร่ที่ครอบครอง: %', p_lead_character_id;
  end if;

  select level into v_current_profile_level from public.profiles where id = v_profile_id;
  if not found then
    raise exception 'ไม่พบบัญชีผู้เล่น';
  end if;

  -- (iv) Bounds — monotonic, then per-call ceiling, then the game's own hero cap.
  if p_profile_level < v_current_profile_level then
    raise exception 'เลเวลบัญชีย้อนหลังไม่ได้ (ปัจจุบัน %, ส่งมา %)',
      v_current_profile_level, p_profile_level;
  end if;
  if p_hero_level < v_current_hero_level then
    raise exception 'เลเวลฮีโร่ย้อนหลังไม่ได้ (ปัจจุบัน %, ส่งมา %)',
      v_current_hero_level, p_hero_level;
  end if;
  if p_profile_level - v_current_profile_level > v_max_level_gain then
    raise exception 'เลเวลบัญชีเพิ่มเกินขีดจำกัดต่อครั้ง (%): % -> %',
      v_max_level_gain, v_current_profile_level, p_profile_level;
  end if;
  if p_hero_level - v_current_hero_level > v_max_level_gain then
    raise exception 'เลเวลฮีโร่เพิ่มเกินขีดจำกัดต่อครั้ง (%): % -> %',
      v_max_level_gain, v_current_hero_level, p_hero_level;
  end if;
  if p_hero_level > v_max_hero_level then
    raise exception 'เลเวลฮีโร่เกินขีดสูงสุดของเกม (%): %', v_max_hero_level, p_hero_level;
  end if;
  -- EXP is a bare `int not null` on both tables with no CHECK constraint behind it; a negative
  -- value is never producible by the client's own curves and would render as garbage forever.
  --
  -- exp_to_next = 0 is NOT garbage on the HERO side, and this asymmetry is deliberate.
  -- progressionConfig.maxLevelExpBehavior is 'clamp_zero' (progressionConfig.ts:18), so
  -- heroExpService.applyHeroExpToProgress returns {newExp: 0, expToNext: 0} for a hero standing
  -- at maxHeroLevel (heroExpService.ts:20-30 and 43-56), and progressionMigration.ts:51,58
  -- normalizes an already-stored level-60 hero the same way. A blanket `<= 0` rejection would
  -- therefore refuse the game's own documented terminal state: every later commit from that
  -- account raises, and since ONE call carries the profile row, the hero row and battle_history
  -- together, the whole account's lobby progression freezes — not just that hero's EXP. Zero is
  -- legal exactly AT the cap and nowhere below it.
  -- The account side keeps the strict rule: there is no configured account-level cap anywhere in
  -- the game, and applyAccountExp holds expToNext at Math.max(1, ...) (RewardSystem.ts:114), so
  -- a zero arriving for profiles is always malformed.
  if p_profile_exp < 0 or p_profile_exp_to_next <= 0 or p_hero_exp < 0
    or p_hero_exp_to_next < 0
    or (p_hero_exp_to_next = 0 and p_hero_level < v_max_hero_level) then
    raise exception 'ค่า EXP ไม่ถูกต้อง';
  end if;

  -- (v) Persist. UPDATE only, on both tables — step (iii) has already proven the hero row
  -- exists, so there is nothing left for an INSERT to do except mint.
  update public.profiles set
    name = p_name,
    title = p_title,
    level = p_profile_level,
    exp = p_profile_exp,
    exp_to_next = p_profile_exp_to_next,
    frame_id = p_frame_id,
    flags = p_flags,
    defeated_npc_ids = p_defeated_npc_ids
  where id = v_profile_id;

  update public.owned_characters set
    level = p_hero_level,
    exp = p_hero_exp,
    exp_to_next = p_hero_exp_to_next,
    skill_levels = p_skill_levels,
    talent_state = p_talent_state,
    awakening_state = p_awakening_state
  where profile_id = v_profile_id and character_id = p_lead_character_id;

  -- Unchanged from 0013: battle_history is deduped by its own (profile_id, external_id) unique
  -- index, so a resumed commit re-inserting the same battle is absorbed here rather than failing.
  begin
    insert into public.battle_history (
      profile_id, external_id, opponent, result, duration_ms, finished_at
    )
    values (
      v_profile_id, p_battle_external_id, p_opponent, p_battle_result, p_duration_ms, p_finished_at
    );
  exception
    when unique_violation then
      null;
  end;

  select * into result from public.profiles where id = v_profile_id;
  return result;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. EXECUTE LOCK
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER never restricted WHO may call a function — the lesson 0011:68-72 and
-- 0012:53-54 each had to re-learn. Every sibling server-authority RPC in this schema revokes
-- from public/anon and grants only to authenticated; 0013 shipped this one without it, so an
-- unauthenticated anon-key caller was only ever stopped by auth.uid() coming back null.
revoke execute on function public.commit_lobby_battle_progression(
  text, text, text, int, int, int, text, jsonb, text[], text, int, int, int,
  jsonb, jsonb, jsonb, text, text, text, int, timestamptz
) from public, anon;

grant execute on function public.commit_lobby_battle_progression(
  text, text, text, int, int, int, text, jsonb, text[], text, int, int, int,
  jsonb, jsonb, jsonb, text, text, text, int, timestamptz
) to authenticated;
