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

### Round 2 (rebase onto the post-audit master) — the retry that stacked

QC (MEMORY item 189) failed round 1's `fetch` wrapper. Confirmed by reading `node_modules`, not
by argument:

- **`postgrest-js` already retries.** `DEFAULT_MAX_RETRIES = 3`, `retryEnabled` defaults **true**,
  backoff 1s/2s/4s, and it retries **only `GET`/`HEAD`/`OPTIONS`** (`RETRYABLE_METHODS`) — because
  replaying a `POST`/`PATCH` can write twice. `auth-js` retries `_refreshAccessToken` with its own
  exponential backoff on top.
- **Stacked:** one failing GET = 4 postgrest attempts × 2 of mine = **8 requests**, and
  4×(15s×2) + 7s backoff ≈ **127s** — from a wrapper whose own comment promised a 15s ceiling.
- **And mine was less careful than the library it wrapped:** it retried 5xx on _every_ method, so
  a `savePlayer` PATCH (no refId to dedupe on) could be replayed where postgrest would refuse.

Fix = **delete the retry, keep only the deadline.** The deadline is the real gap (browser `fetch`
has no default timeout; postgrest has no deadline). Retry is the library's job and it does it
better. A `it.each` guard now pins "one request in, one request out" for 500/503/409/200 and for a
network error — verified to fail when the retry is re-injected.

**Standing lesson for this seat: before wrapping a client library's transport, read what the
library already does at that layer.** "Add a retry" looked like pure hardening and was a latency
and double-write regression. The idempotent-ledger argument I used to justify it was true and
irrelevant — it covers `earn_gold`/`grant_item`, not the profile writes the wrapper also touched.

## 2026-08-10 — #26/#35: the cost side of an upgrade becomes server-authoritative

Closed the free-upgrade bug the wave-1 lane could only document. Migration
`20260810180000_p26_progression_cost_authority.sql` + client wiring.

- **The prices did not exist on the server at all.** They live in TypeScript fixtures
  (`SKILL_PROGRESSION_FIXTURES`, `TALENT_NODE_FIXTURES`, `AWAKENING_TIER_FIXTURE_COSTS`), which
  Postgres cannot read — so "server computes the cost" first required _bringing the cost across_
  into `progression_cost_catalog`, the same move `20260810160000` made for `item_catalog`. That
  is now a **two-place edit**: a price changed in the fixtures without a companion migration row
  fails `src/data/progressionCostParity.test.ts`, which re-parses the seed out of the migration
  rather than keeping a third copy of the numbers.
- **The RPC alone would have fixed NOTHING.** `savePlayer` could still PATCH `skill_levels`
  directly, so the upgrade stayed free for anyone who skipped it. The load-bearing line is
  `revoke update on public.owned_characters from authenticated` with no re-grant — the client
  now holds zero writable columns on that table, and `savePlayer` stopped sending the three it
  used to. `20260810130000:49-50` had already reserved this exact change for this task.
- **Idempotency cannot be keyed on the refId, because the CLIENT mints it.** A second uuid is
  free. The real guard is a **compare-and-swap**: the caller states the level it believes the
  hero is at, the server reads the true level from `owned_characters`, mismatch = rejection.
  After a successful upgrade the true level has moved, so the same purchase under a fresh uuid
  is refused. `progression_spend_ledger` only decides whether a _duplicate_ call is answered
  with the old result or with an error.
- **A row-count assertion cannot pin the validate-before-rate-limit ordering.** Measured, not
  assumed: moving the `check_and_log_rpc_rate_limit` call above the validation block left every
  behavioural assertion green, because a raise aborts the transaction and takes the log row with
  it either way — exactly what `20260810160000`'s own F5a note says. The ordering is pinned on
  `pg_proc.prosrc` instead, with the reason written next to it. **A property whose only
  observable is statement order has to be asserted on the source, or it is not asserted.**
- `lifetime_gold_earned` is untouched by a spend: it is lifetime EARNED, and the
  `20260810100000` backfill derives it from credit rows only. Decrementing it would corrupt the
  one reconciliation column this system has.
- Constraint rewrite carried the `(currency='gem' and source='gacha' and amount<0)` branch
  forward verbatim, per this file's own standing warning, and there is now a test that inserts a
  gacha debit row to prove it survived.

### QC bounce on the first #26/#35 attempt — the enumeration, not the implementation

All eight security properties passed and three mutations turned red; the gate still bounced it,
because the fix was applied to an incomplete list of writers.

- **I enumerated the writers of `owned_characters` from the migration HEADERS instead of opening
  the sibling function's argument list.** `commit_lobby_battle_progression` declares
  `p_skill_levels/p_talent_state/p_awakening_state` (20260810130000:112-114) and writes all three
  verbatim at :256-263 with no validation — SECURITY DEFINER, so it runs as the OWNER and
  `revoke ... from authenticated` never touched it. Measured cost of buying every upgrade through
  that path: **0 gold**, against a catalogued price of 2,940. The revoke closed one door in a
  room with two. **When a fix is "take the write away", the deliverable is the list of writers,
  and the list is built by reading signatures — a header comment is a claim, not an inventory.**
- **A deleted check is not a moved check.** Making the server authoritative killed
  `progressionService.unlockTalent`'s prerequisite rule, and the RPC never grew one, so
  `mk-talent-2` was purchasable with `mk-talent-1` absent. Worse, the new file's own prose
  asserted the check existed. When authority moves, every rule that lived in the old layer has to be
  re-listed and re-homed one at a time; "the server enforces the rules" is not a migration plan.
- **`jsonb_set` with `create_if_missing` still needs every EARLIER path step to exist.**
  `jsonb_set('{}','{skill2,level}',2,true)` returns `'{}'` — measured. Gold debited, ledger rows
  written, level unmoved, and the compare-and-swap then re-reads the OLD level so the same
  purchase is chargeable forever. Use `||` merge on the parent object instead. Every fixture had
  the slot present, which is why it survived a green suite.
- **`null not in (...)` is NULL, not true.** An `if` guarding only membership never fires for a
  null key, so the input slipped past the validate-before-rate-limit block. Name null explicitly.
- **Chose to DROP the three parameters rather than ignore them.** An ignored parameter is a
  signature that lies, PostgREST would answer 200 to a client still sending them, and this repo
  had already made exactly this move twice (savePlayer, #25 and #26). Dropping needs an explicit
  `drop function` at the old arity first — `create or replace` at a different arity keeps BOTH
  (20260810160000 F3) and PostgREST refuses to route an overloaded name at all.
- **Traced, and reported at its measured size:** exactly ONE await (`onRecordPending`) sits
  between the `Player` snapshot entering `finalizeLobbyBattleRewards` and the commit RPC; the
  other five are after it. With the parameters live that one round trip could revert a paid
  upgrade. I had first written "roughly six awaits" — wrong, and the same class of unchecked
  claim that caused the bounce. Measure the window before describing it.

### Open, recorded not fixed (QC follow-ups 4 and 6)

- **~250 lines of dead client upgrade code.** `progressionService.ts` `spendCost` (:24-46) and
  `upgradeSkill`/`unlockTalent`/`advanceAwakening` (:113-358) have no non-test importer now that
  `HeroProgressionPanel` routes through the RPC — `applyHeroExp`, `applyHeroExpToLeadHero` and
  `normalizePlayerProgression` in the same file ARE still used, so this is a partial deletion, not
  a file removal. `progressionService.test.ts` still asserts client-side gold deduction: **a green
  suite pinning the model the server now rejects.** Left in place because the gate scoped this to
  RECORD; it is one commit's work and should not wait long.
- **`accountRepository.ts` (localStorage backend) has no `spendProgressionUpgrade`.** The two
  backends hand-mirror their exports with nothing catching drift — the gap the contract already
  flags (`AGENT_BLUEPRINT.md:85`). Harmless today: nothing imports the localStorage backend.
