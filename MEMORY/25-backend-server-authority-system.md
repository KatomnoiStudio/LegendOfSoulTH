# MEMORY/25 — Backend / Server-Authority System

Caretaker memory. Working knowledge only — git log holds history.

## What I own (contract: `docs/agent-blueprint/25-backend-server-authority-system.md`)

Auth/session, the profile row and its child records, and the **server-authority boundary**:
what a client may write directly vs. what must go through a validated server transaction.
Not mine: combat resolution, PvP MMR/netcode (#19/#21), gacha roll math (#23 — I only host
its RPC call site), payment gateway, hero stat formulas (#14).

Sensitive throughout. No delegate-down. Migration apply is the owner relay, never mine —
I write migration files, I never apply them.

## Load-bearing facts about this system

- **Live path is `src/data/accountRepository.supabase.ts`**; `accountRepository.ts` (localStorage)
  is dormant — `useAuth.ts:2` imports only the Supabase one. Both satisfy
  `AccountRepositorySubset` (`accountRepository.shared.ts:156`), which deliberately excludes
  `importSave`/`exportSave` (the one genuine asymmetry between them).
- **`accountRepository.supabase.ts` is a HOST file** — 5+ systems' RPC wrappers live in it.
  Editing near a foreign function is seam work: belt end's, not mine.
- **The central lesson this schema keeps re-teaching: RLS is row-scoped, never value-scoped.**
  A `for all using (auth.uid() = profile_id)` policy says _which rows_ a client may write, and
  says nothing at all about _what values_ may go into them. Every integrity defect found in this
  schema so far is that same sentence in a new table:
  - `profiles.gold/gem` (0009 Fix 3) — closed by `revoke update` + a column allowlist `grant`.
    Note the sub-lesson recorded in that file: a _column-scoped_ revoke is a no-op against
    Supabase's default table-wide grant; the table-wide grant has to go first.
  - `team_slots.character_id` (issue #101 Finding 7, 2026-08-10) — closed by a BEFORE trigger.
  - `profiles/owned_characters.level/exp/exp_to_next` (#25, CoalBoard scope B, 2026-08-10) —
    closed by narrowing both allowlists (`20260810130000`), but only half the job: the real
    hole was the SECURITY DEFINER RPC writing the same columns unbounded. **A column lock is
    worthless while any DEFINER function writes those columns without its own bounds.** When
    locking a column, enumerate every DEFINER writer of it in the same pass.

  **When a new table lands, ask that question about it before anything else.**

- **Server-side bounds must permit the game's own terminal states.** `progressionConfig
.maxLevelExpBehavior = 'clamp_zero'` means a hero at `maxHeroLevel` (60) legitimately stores
  `exp = 0, exp_to_next = 0` (`heroExpService.ts:20-30,43-56`; `progressionMigration.ts:51,58`).
  A blanket `exp_to_next <= 0` reject in the commit RPC would refuse that state — and because
  one `commit_lobby_battle_progression` call carries the profile row, the hero row and
  `battle_history` together, the whole account's lobby progression freezes, not just the hero's
  EXP. Caught in the #25 draft before ship; pinned by a test in `starAscension.integration.test.ts`
  (mutation-verified: restoring `<= 0` fails it). Generalization: **before adding a validity
  bound in SQL, read the client config that produces the value and check its edge states** —
  cap, zero, and empty are usually legal somewhere.
- Client/server progression-curve divergence, live today and NOT mine to fix: the lobby path
  (`applyBattleExp`, contract #14's file) has **no `maxHeroLevel` clamp at all** and its loop
  guard is 20, while the dungeon path (`heroExpService`) clamps at 60 with a guard of 100. The
  RPC's per-call ceiling (20) and hero cap (60) are sized to the lobby path only. Practically
  unreachable today (~23.5M EXP to hit hero 60 on the x1.2 curve), but wiring the dungeon path
  through this RPC, or #14 changing either guard, silently starts rejecting honest commits.

- Write-order invariant the ownership trigger depends on: `owned_characters` is always written
  before `team_slots`, in both writers — `handle_new_user()` (0001_init.sql) and `savePlayer()`
  (`accountRepository.supabase.ts`, ~line 450 then ~470). A future writer that reverses this
  breaks signup/save. Regression-pinned by the signup test in
  `src/data/teamSlotOwnership.integration.test.ts`.
- `owned_characters` rows are never deleted anywhere in this repo (verified 2026-08-10: no
  `.delete()` in `src/`, no `DELETE` in any migration). Rows are only added or updated. Profile
  deletion (0006 guest cleanup, 0014 dead-account cleanup) cascades the whole subtree instead.

## Testing this system

Two harnesses, both real:

- **PGlite integration** (`src/data/*.integration.test.ts`) — applies the actual
  `supabase/migrations/*.sql` and exercises RPCs/constraints against real Postgres. Use this for
  anything a constraint, trigger, or policy is supposed to enforce.
- **Mocked client** (`accountRepository.supabase.test.ts`) — pins RPC name/param wiring only.

PGlite bootstrap gotcha: the `auth.users` stub needs a `raw_user_meta_data jsonb` column if the
test fires the signup trigger. Most harnesses omit it because they insert into `auth.users`
_before_ applying `0001_init.sql`, so `handle_new_user()` never runs.

## Live state (2026-08-10)

- DF9 graduated 100% (PR #76) — 3 Path of Exile scars pinned (retry idempotency, concurrent
  serialization, atomic bounded grants).
- **Open, verified against the code:** the contract's done-criterion #4 is stale — it describes
  the shared-interface work as pending, but `AccountRepositorySubset` shipped. Its `file:line`
  citations for `importSave` (says :548, is :497) and `exportSave` (says :333, is :761) have
  drifted too. Flagged to main at onboarding; awaiting the call on who edits the contract
  (contract edits are security-grade per BELT-PORT §6).
- Delivered this dispatch: `20260810101000_security_team_slots_ownership.sql` — **written, NOT
  applied.** Production apply is owed through the owner relay. Both triggers guarded with
  `drop trigger if exists` before `create trigger` (repo precedent: 20260809064000:370-371) —
  apply is a manual-paste relay, a re-paste/retry-after-interruption is realistic, and bare
  `create trigger` aborts on retry. **Lesson: every DDL statement I write for the manual-relay
  path needs its own idempotency guard, not just the table/policy-level ones** — trigger/function
  creation is as retry-exposed as `create table`/`create policy`, easy to forget since it's the
  last statement and doesn't "feel" like schema. Corollary: this guard only helps pre-apply — once
  a migration file has actually landed in prod, a further fix is a NEW migration, never an
  in-place edit of the applied file (prod's migration history table has already recorded the old
  hash/content).
- `20260810130000_security_harden_lobby_progression_rpc.sql` (#25 scope B) — **written, NOT
  applied**, owner relay owed, and **the client MUST deploy before the migration** or the column
  lock 42501s `savePlayer`, which `useAuth.ts` treats as a whole-save rollback (team/friends/flags
  too). New server-owned table `lobby_progression_commits`: never prune it — a deleted row makes
  its transaction id replayable, same trap as the currency ledger.
- `20260810160000_security_audit_hardening_wave1.sql` (audit F1-F8) — **written, NOT applied**,
  owner relay owed, paste strictly AFTER 20260810100000 and 20260810130000. Contents: guest
  cleanup rewritten to inactivity (F1, deadline was ~2026-09-06), EXECUTE sweep over 12 DEFINER
  RPCs with the 4 cron jobs getting NO grant at all (F2), the grant_item 3-arg overload drop
  finally in a FILE (F3 — the prod hand-fix from item 148 previously existed nowhere replayable),
  server item_catalog + grant_item check (F4 — **new items now need a catalog insert migration**),
  validate-before-rate-limit + denial `raise warning` (F5), pending-reward bounds/row-cap-64 (F6),
  gem-only gacha banner CHECK (F8). F7 (within-level exp monotonicity) documented as accepted
  residual in the file header — an attacker's best move is already the direct +20 level claim, the
  guard defends against nobody's best move; real fix is scope C. Triple-paste proven safe in
  PGlite. New lessons this pass: (1) **an apply-time backfill poisons activity heuristics** —
  20260810100000 stamped `signup` ledger rows on every account at APPLY time, so any "recent
  currency row = active" test must exclude `source='signup'` or every guest reads active for 30
  days post-apply; (2) **fresh-env parity of prod hand-fixes**: any SQL ever run by hand in the
  SQL Editor MUST land in a migration file, or CI/PGlite/db-reset silently diverges from prod —
  the grant_item overload sat in that gap for 2 days with the integration harness actively
  recreating it. QC bounced v1 with two more, both now fixed and mutation-pinned:
  (3) **`revoke ... from public, anon` IS NOT ENOUGH on this project.** Supabase's bootstrap runs
  `alter default privileges in schema public grant all on functions to anon, authenticated`, so
  every function a migration creates carries a DIRECT grant to `authenticated` — the PUBLIC
  revoke never touches it. Any internal helper must revoke from `authenticated` too (a DEFINER
  caller runs as owner and needs no grant). `0011:72` still has this gap for the rate-limit
  helper, whose ceiling is CALLER-SUPPLIED — reachable over PostgREST it disables its own
  throttle. And the PGlite harness was **structurally blind** to the whole class: bare
  `create role` inherits only via PUBLIC. The fixture now runs the same `alter default
  privileges`, so `has_function_privilege` assertions actually bite (proven: stripping
  `authenticated` from any revoke now fails a test; before, it passed).
  (4) **Never state a grounding claim you did not recount.** v1's seed comment said "the complete
  ITEMS record (7 ids)" and listed two ids that exist nowhere in the repo — I had trusted a
  `grep -c "id:"` (which counts the interface field too) instead of the 5 real keys. In a
  436-line file the owner pastes by hand and cannot re-verify, a false grounding statement is
  itself the defect. There is now a test parsing `src/game/items.ts` and asserting the catalog
  equals it exactly.
  Rebase pass (2026-08-10, branch 15 commits behind): merged `origin/master` clean, no conflicts;
  sentinel clean (only my 3 files). **Prod state changed under this branch while it sat parked** —
  the owner unscheduled BOTH account-deletion cron jobs (item 190 Part B), so applying this
  migration does not re-arm anything, and `cleanup_dead_unplayed_accounts` is still defective in
  prod (my file only revokes its EXECUTE). Both facts are now in the migration header. **Standing
  check for a parked branch: re-read what moved in prod, not just in git** — a migration written
  against a live system can be invalidated by an operator action that leaves no trace in the repo.
