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

  **When a new table lands, ask that question about it before anything else.**

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
  applied.** Production apply is owed through the owner relay.
