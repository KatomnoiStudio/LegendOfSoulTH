<!-- coalmine: verified 2026-08-07 · exemplar this project's own PR #19/#21/#22/#23/#24 merge history + the real PR #19 silent-regression incident (item 90) · revalidate 90d -->

# Ring 0 Traffic Control Law

> **Scope**: Binding for every dev/agent on this repo — Ring 0 and Ring 1 alike. HetCreep instruction, 2026-08-07: with 3+ devs (some not fluent with git/agents) converging on this repo, **HetCreep's own machine (Ring 0) is now the standing traffic controller** — it does the actual merging to `master`, continuously. Settled via `ask CB` opinion-lane governance-gap sweep (4 seats, all four independently converged on the same core gap: no rule anywhere said this, so `pre-push-sync-law.md` still told every dev, Ring 0 included, to push straight to `master` themselves).

## The rule

**Ring 0 merges to `master`. Ring 1 does not push to `master` directly anymore.** This supersedes `pre-push-sync-law.md`'s "every machine, every push" framing for the _final push to `master`_ specifically — that file's fetch/merge/verify discipline still applies in full to every merge Ring 0 performs, and still applies to a Ring-1 dev syncing their own branch against `master`. What changes is the last step: a Ring-1 dev's finished work goes through Ring 0, never straight onto `master` under their own push.

## Two ways to hand off work — pick whichever fits the dev

**Path A — dev is comfortable with git/PRs (the default):**

1. Branch off latest `master`: `<dev>/<slug>`.
2. Push the branch, open a PR (same-repo or fork, matching this project's existing pattern).
3. Claim/update the matching row in `TASKS.md` per `multi-dev-task-queue-law.md` — unchanged.
4. Ring 0 picks it up per the merge procedure below.

**Path B — dev isn't fluent with git/agents, or just wants to hand off informally (explicit, first-class, not a lesser option):**

1. Tell Ring 0 directly what's done and where the code lives — a branch name, a zip, a diff, a description of the change, whatever they actually have. No git ceremony required from them.
2. Ring 0 does the git mechanics on their behalf: creates the branch/PR if none exists, or works directly from what was handed off.
3. Ring 0 still runs the full merge procedure below (verify, CI, review) exactly the same as Path A — the low-bar handoff changes _how the work arrives_, never _what gate it has to pass_.

Neither path is a workaround of the other — a dev who doesn't know git well is not blocked from contributing. **A dev on Path B still owns updating `TASKS.md`, or asking Ring 0 to do it for them** — the task ledger stays accurate either way.

## Merge procedure (codifying what this project already does — PR #19/#21/#22/#23/#24)

1. `git fetch origin`, pull the source branch/PR (`git fetch origin pull/N/head:pr-N-work` for a fork PR, or the branch directly for same-repo).
2. `git merge --no-commit --no-ff <source>` against current `master` tip — **re-fetch and use the CURRENT tip, not a tip cached from when the PR was opened.** Two PRs against the same file, merged serially, can merge with zero conflict markers and still silently undo what an earlier merge just fixed (real precedent: PR #19 stripped `harden-runner`, un-pinned SHA actions, and dropped SBOM/attestation — a clean merge, passing CI, caught only by an ad hoc manual re-diff against master's prior state, per item 90). **Before finalizing, diff the merged tree against master's immediately-prior state for anything a recent merge specifically fixed, not just "did CI stay green."**
3. Resolve any real conflict by hand, preserving both sides' intent (`pre-push-sync-law.md`'s existing rule, unchanged) — `MEMORY.md` conflicts especially: interleave/renumber, never drop one side's entries.
4. `npm run ci` green.
5. Commit with a descriptive message naming the PR (`merge: <description> (PR #N)`, matching existing convention), push to `master`.
6. Close the source PR via API, comment with the merge SHA — don't leave it dangling as "open" (this project's own `MEMORY.md` had exactly this drift: PR #23 and #24 both sat listed as "Open PRs" long after actually merging — caught and fixed in this same governance pass, see item 96).
7. **If the merge touched a file a specific dev owns/authored recently**, leave a one-line note in the merge commit or a PR comment naming what changed and why — not a blocking review gate, just enough that the dev finds out from the commit, not by surprise later.

## Controller offline / unavailable

**Correction (2026-08-08, live `gh api collaborators` check):** `nustanakritwithai` and `DemoGODRTX` are **no longer `admin:true`** — both dropped to push-only access at some point after this law's original 2026-08-07 draft (which named them as break-glass-eligible). The only `admin:true` accounts today are `HetCreep` and `katomnoistudio-oss` (an org/bot account HetCreep controls, not an independent human) — meaning **there is currently no real break-glass fallback**: no other person holds the technical ability to merge if Ring 0 is genuinely unavailable. This is a tighter access model than this law originally assumed, not a gap — but the break-glass mechanism below is now aspirational until a second trusted human is (re-)granted admin, if HetCreep ever wants that.

No rigid SLA hour-count for a team this size — but the fallback must be _named_, not invented ad hoc under pressure. If Ring 0 is genuinely unavailable and a dev's work is finished, CI-green, and blocking something real:

- **Today**: no fallback exists. Work waits for Ring 0 (or HetCreep operating as `katomnoistudio-oss`, the same person, not a different party).
- **If HetCreep grants a second human `admin:true` in the future**, that person may merge as a **break-glass fallback**, logged, never silent: the merge commit message states `break-glass: Ring 0 unavailable`.
- Break-glass is for finished, CI-green, non-risky work only. Anything touching security/auth/payments/schema/migrations waits for Ring 0 — no exception via break-glass for that category (ties to this project's own CoalBoard error-not-allowed domain list).
- No dev gets standing merge rights as a workaround for this. Break-glass is a named exception per-incident, not a new standing role.

## Silent-regression re-check (closing the gap PR #19 already proved real)

Every merge under this law re-verifies against the CURRENT `master` tip (procedure step 2 above), not stale CI from when a branch was cut. This is the concrete fix for the one class of failure this project has already hit for real: a clean, conflict-free merge that quietly undoes an earlier fix because nothing forced a fresh look at the combined result.

## What this doesn't mean

- Doesn't relax `pre-push-sync-law.md`'s fetch/merge/verify discipline — it still governs every merge Ring 0 performs, and still governs a Ring-1 dev syncing their OWN branch against `master` (just not pushing straight to `master` themselves anymore).
- Doesn't replace `multi-dev-task-queue-law.md`'s claim protocol — `TASKS.md` ownership is unchanged; this law only changes how finished work physically lands.
- Doesn't create a second review process on top of `.agents/rules/ecc/common/code-review.md` — this project's existing practice (review after merge via ask-CB, per HetCreep's own prior calls, e.g. PR #11/#12) stays the default; this law only adds the fresh-tip re-check as a mandatory step, not a new review gate.
- Doesn't mean a less-git-fluent dev's work is worth less scrutiny — Path B work passes through the exact same merge procedure as Path A.

## Known limits, not swept under the rug

- **Single point of failure**: this design does not remove Ring 0 as a bottleneck — as more devs join, a serialized controller caps total throughput. Not solved here; revisit if it becomes the real constraint, not before (no scaling ceremony for a problem that doesn't exist yet).
- **Who reviews the controller's own merges**: this law doesn't add a check above Ring 0's own merge judgment. Existing practice (post-hoc ask-CB review) is the closest thing that exists; not a full answer.
