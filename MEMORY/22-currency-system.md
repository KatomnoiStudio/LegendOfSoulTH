# MEMORY/22 — Currency System (caretaker)

Contract: `docs/agent-blueprint/22-currency-system.md`. Sensitive throughout: opus floor on
ledger/RPC/migration work, no delegate-down, QC runs `resilience-audit` + `drift-canary` +
security lens. Retention law `.agents/rules/currency-ledger-retention.md` binds every dispatch.

## Live state (2026-08-10)

- **Live backend is `accountRepository.supabase.ts`.** `accountRepository.ts` (localStorage) is
  DORMANT — `useAuth.ts` stopped importing it months ago (`accountRepository.shared.ts:6`).
  TASKS.md row 10's "22 tests, graduated" all target the dormant module. **The production RPC
  path still has no test suite of its own** beyond call-shape mocks; the PGLite integration
  files are the only real Postgres coverage.
- Ledger sources now: `quest` `drop` `topup` `coupon` `admin` `gacha` `signup`.
  `earn_gold` allowlist is `quest`/`drop` ONLY. `topup` stays legal in the TABLE (historical
  rows, archive exclusion, `cleanup_dead_unplayed_accounts` paying-player exemption) — never
  confuse "removed from an RPC allowlist" with "removed from the ledger vocabulary."
- Archive never touches `coupon`, `topup`, `signup`. Hot/archive split + `lifetime_gold_earned`
  / `lifetime_gem_earned` shipped 2026-08-09 (`20260809090000`), cron jobid 5.
- `topUpGold`/`topUpGems` on Supabase are `{ok:false}` stubs (fork issue #19). A real payment
  gateway is owner+legal only, never agent work.

## Decisions I made (defend these at QC, or reverse them deliberately)

- **`GoldSource` in `accountRepository.shared.ts` was NOT narrowed to `'quest'|'drop'`.** The
  type still describes the ledger's gold vocabulary, and the dormant local `topUpGold` writes a
  `topup` row through `appendTransaction`. Narrowing it would break that file and misstate the
  schema. The RPC allowlist is the fence, not the TS union.
- **`signup` grant carries `ref_id`**: `'signup'` from the trigger, `'signup-backfill'` from the
  one-time reconstruction. 0013's unique index `(profile_id, currency, source, ref_id) where
ref_id is not null` makes both idempotent at the DB layer for free.
- **`signup` added to the archive exclusion list.** The backfill's "does this account already
  have its grant?" guard scans the hot table; letting a signup row age out would re-credit it.

## Scars this system owns

- **0013 apply (2026-08-08):** pre-idempotency `earn_gold` had no `ref_id` guard — one real
  account got the same `trial-01` drop credited **74×**. Any change to the dedupe path is a
  re-opening of this.
- **0010:** coupon dedup was app-level SELECT-then-INSERT (TOCTOU); two concurrent redeems could
  both pass. Closed by a partial unique index, not by application logic.
- **#101 F1 (2026-08-10):** `earn_gold` accepted `p_source='topup'` — free gold laundered through
  the one source tag that means "this player paid." The lesson generalizes: **a source tag that
  another system treats as evidence must not be settable by the party it is evidence about.**
- **#101 F4 (2026-08-10):** signup grant bypassed the ledger for the project's whole life, which
  also silently falsified `lifetime_*` (they were backfilled FROM ledger sums). A reconciliation
  column derived from a trail is only as complete as the trail.

## Working notes

- Migrations are WRITE-ONLY for me. Production apply is the owner relay through the belt end.
- Constraint rewrites must carry `(currency='gem' and source='gacha' and amount<0)` forward
  verbatim — gacha's debit row is the one negative amount the ledger allows, and it is #23's.
- PGLite harness pattern: stub `auth.users` **with `raw_user_meta_data jsonb`** if the test needs
  the `on_auth_user_created` trigger to fire; seed a "legacy" account by inserting into
  `auth.users` BEFORE applying the migration under test, never by inserting the profile directly
  (the 0001 trigger already made it — a manual insert hits `profiles_pkey`).
- Contract file:line citations drift (verified 2026-08-09: 6 of them off by 7–50 lines, content
  still correct). Trust the contract's mechanism claims, re-grep its coordinates.

## 2026-08-10 — audit wave 1, the CLIENT persistence path (branch `fix/audit-wave1-persistence`)

The lane's first work outside migrations: `savePlayer`/`loadPlayer` in
`src/data/accountRepository.supabase.ts`, `useAuth`, `supabaseClient`, the lobby reward pipeline.

- **The debit half of every currency spend is unpersistable from the client, and always was.**
  `progressionService.spendCost()` deducts `currency.gold` and `inventory` for skill/talent/
  awakening upgrades. `profiles.gold` is column-locked (0009) and `inventory_items` has NO write
  policy for `authenticated` at all (0001_init.sql:111 grants `select` only). So the upgrade's
  EFFECT persists (`skill_levels`/`talent_state`/`awakening_state` are written) while the COST
  evaporates on reload — free unlimited upgrades. **This is a missing RPC, not a missing
  `savePlayer` column, and it must never be "fixed" by re-granting UPDATE on the gold column
  (that is #25 undone).** Proposed smallest shape, documented in the code above `savePlayer`:
  `spend_progression_cost(p_request_id uuid, p_hero_id text, p_upgrade text, p_gold int,
p_materials jsonb)` — atomic gold+material debit, reject on insufficient, idempotent on
  `p_request_id` like `ascend_character_star`, and a `currency_transactions` spend row. Belongs
  with #26.
- **Standing guard installed:** `src/data/accountRepository.supabase.persistence.test.ts` derives
  savePlayer's real written columns from a recording mock and forces EVERY field of `Player` /
  `PlayerProgress` / `OwnedCharacter` to declare an owner (`save-player` / `rpc` / `read-only` /
  a NAMED `known-gap`). A field nobody owns fails the suite. This is the cheapest defence this
  system has against the whole silent-non-persistence class — `friends` was exactly that bug, and
  `progress.energy` plus `progressionVersion` are still open, named gaps.
- **Never mint a fresh id inside `lobbyBattleTransactionId`.** It is called on EVERY finalize
  attempt, so a `crypto.randomUUID()` there hands every retry a new ledger refId and double-grants
  — strictly worse than the clock-collision bug it was meant to fix. The id has to be minted once
  at battle end and carried; the resume path now carries the one the pending row stored.
- **Widening a derived transaction-id format is a currency hazard at deploy time.** A pending row
  written by the old client keeps its old id in flags and ledger refIds; if the new client derives
  a different id for the same battle, resume grants it a second time. Considered and rejected for
  that reason.
