<!-- coalmine: verified 2026-08-16 · exemplar HetCreep ruling 2026-08-13 during PR review of #128/#130, re-read against HEAD 2026-08-16 · revalidate 90d -->

# Mutation-verified fix law

**Scope**: Binding for every dev/agent on this repo, no exceptions. HetCreep ruling,
2026-08-13, during PR review of #128 and #130.

## The rule

A PR or dispatch that claims to fix a defect must include a test that **fails against the
defect and passes against the fix**. Not "a test exists and is green" — a test proven to
have teeth, checked the same way this project already checks a real asset instead of trusting
its declared config: `src/game/spriteContract.test.ts` opens the actual `.webp` files and
measures them with `sharp` rather than trusting `SPRITE_SHEET_CALIBRATIONS`. A bug-fix test
gets the same treatment — measured against the defect it claims to kill, not trusted on its
say-so.

**The check, concretely**: checkout the new test against the OLD (pre-fix) source and run it.

- Goes **red** → the test has teeth. QC passes.
- Stays **green** → the test proves nothing about this defect. QC fails, regardless of
  whether the fix itself is correct.

A fix can be entirely correct and still fail this check, if nothing pins the regression —
that failure is about the test, not the fix. See PR #130 below: the fix was verified correct
by reading the diff, and the check still failed, because there was no test to run it against.

## Why now

Reviewing PR #128 and #130 (both fixing task #73's two findings) the session ran this check
for the first time as a deliberate step, not an audit afterthought:

- **#128** (recovery-effect replay on rerender): checked out the new regression test against
  master's pre-fix `LobbyBattleSession.tsx`. It failed — `onGetPendingRewards` called 3 times
  instead of 1, reproducing the exact reported symptom. Teeth confirmed.
- **#130** (reward pipeline double-writing the same flag key in 3 places): the diff shows the
  fix is real and correct — `withFlags` becomes the single write, `flags` becomes a read-back
  instead of an independent computation, at all 3 sites the finding named. But the PR touches
  only the source file; no test file changed. There is nothing to check out and run against
  the old code, because nothing in the PR would fail against it. The 13 existing tests that
  "pass" never asserted the invariant this fix protects (`flags === next.progress.flags`
  after every branch) — they would have passed identically before the fix too.

Without this check, #130 would have been marked "ready to merge" on the strength of a
correct-looking diff and passing CI — exactly the gap this rule exists to catch. **The prior
generation of this pattern already exists in this project** (MEMORY.md item 195: "red
reproduced by re-injecting the old shape"; the rate-limiter work: "16/16 mutations killed") —
this rule makes it a standing gate instead of something main does occasionally during an
audit.

## What this does and does not cover

- **Covers**: any PR/dispatch whose stated purpose is fixing a defect, a regression, or a
  confirmed finding (rot-canary, an audit row, a `TASKS.md` entry, an owner-reported bug).
- **Does not cover**: new-feature test coverage with no defect being fixed (already governed
  by rule 10/12's "a test pinning a bug this project actually hit is proven-good, write it" —
  a different bar for a different situation), or a refactor with no behavior change to pin.
- **Does not require** a full formal mutation-testing tool/framework — the check is one
  manual step (old source + new test, confirm red), not a CI gate running an automated
  mutation suite. If that ever changes, amend this file, don't silently start assuming it.

## How to apply it as a reviewer

1. Read the diff. Confirm the fix is real (addresses the root cause, not just the reported
   symptom — see `systematic-debugging` discipline).
2. Checkout the new/changed test file(s) against the pre-fix source.
3. Run just that test. Red → teeth confirmed, mark QC passed. Green → the test doesn't pin
   this defect; ask for one before merge, or open a follow-up task if merging anyway for
   other reasons (a correct fix without a pinning test is real progress, just not verified
   progress — say which one it is, don't conflate them).
4. Restore the working tree before doing anything else.

## How to apply it as an author

Before opening the PR, do the check yourself: temporarily revert your own fix, run your new
test, confirm it fails, then reapply the fix and confirm it passes. State in the PR body that
you did this ("verified the regression test fails against the pre-fix code") — the same way
this project's PRs already state which targeted tests passed.

<!-- coalmine: verified 2026-08-16 · exemplar StrykerJS thresholds.break (a mutation score is a gate, not a report) applied through this law's own old-source-red procedure · revalidate 90d -->

## Money-path code gets the same check even when it is not a defect fix (2026-08-16)

This law scopes itself to defect fixes, and that scope is what produced the finding below.
`src/game/reward/rewardValidator.ts` and `src/game/reward/rewardProgress.ts` were never
defect fixes, so nothing ever asked whether their tests had teeth. A 2026-08-16 audit ran
the check by hand:

> **Two mutants that disable real money-path guards — negative/NaN rejection in
> `rewardValidator.ts`, the over-payment clamp in `rewardProgress.ts` — survived all 1185
> tests.** Three neutral control mutants died, so the suite is not toothless; it has teeth
> exactly where someone deliberately gave it teeth, and none where nobody looked.

Two additions, both using the procedure this law already defines:

1. **New code on a money path gets the old-source-red check.** Currency, gacha, item drops,
   ledger, purchase. Break the guard, run the test, confirm red, restore — the same four
   steps as "How to apply it as an author", triggered by the code's subject rather than by
   whether a bug report preceded it.

2. **A guard clause on a money path ships with a test that drives its REJECTING branch** —
   the branch that returns the error, not the one that returns the value. This is the shape
   of the finding, not a restatement of it: nothing that computes a value survived
   mutation; everything that refuses a value did. A suite that drives happy paths and named
   regressions thoroughly, and never drives a guard's refusal, lets guards decay into
   decoration while staying green.

**Enforcement**: ADVISORY, same as the rest of this law — a manual old-source-red step, not
an automated mutation suite. The scoped-Stryker option (`src/game/reward`, `src/game/gacha`
only) is recorded in the 2026-08-16 audit as a costed proposal, not a decision.

<!-- coalmine: verified 2026-08-16 · exemplar Vitest coverage.thresholds (a declared floor that nothing checks is not a floor) · revalidate 90d -->

## The coverage floor is a number in the config, not a sentence in a doc (2026-08-16)

`.agents/rules/ecc/common/testing.md` declares an 80% coverage target and **nothing checks
it**. Measured 2026-08-16: statements 71.55 · branches 60.13 · functions 72.83 · lines
74.38 — every metric below the declared number, with no `thresholds` key in
`vite.config.ts` anywhere.

Worse, **both places recording why there is no threshold now state a false premise** —
"zero component tests" — against 34 component tests and 1185 passing tests. The reason has
outlived itself.

**`vite.config.ts` sets `coverage.thresholds` at the last measured floor. A PR that lowers
coverage either adds a test or lowers the number deliberately in the same commit.**
`thresholds.autoUpdate` writes today's number back, so the floor never has to be guessed
and never silently drifts upward into a wall.

**Enforcement**: becomes a real gate the moment the key exists — `npm run ci` already runs
the suite. Until then, ADVISORY, and the missing key is audit item A10.
