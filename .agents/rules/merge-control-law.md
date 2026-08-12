<!-- coalmine: verified 2026-08-08 · exemplar this project's own PR #19/#21/#22/#23/#24 merge history + the real PR #19 silent-regression incident (item 90) + GitHub's native merge queue (atomic remote merge, no local-only merge state) + Bors/Mergify (queue pause/priority) · gaps found via a 4-seat opinion-lane sweep (2026-08-08), each spot-verified against live repo state before being filled here · revalidate 90d -->

# Merge Control Law

> **Scope**: Binding for every dev/agent on this repo, no exceptions. HetCreep instruction, 2026-08-07: with several devs (some not fluent with git/agents) converging on this repo, **HetCreep does the merging to `master`, continuously.**
>
> **Renamed 2026-08-12** from `ring0-traffic-control-law.md`. The Ring 0 / Ring 1 tiering it was written around is gone (`AGENTS.md` rule 6, retired) — every mechanism below is unchanged, only the vocabulary. Where this file said "Ring 0" it now says the owner; where it said "Ring 1" it says a contributor.

## The rule

**The owner merges to `master`. Nobody else pushes to `master` directly.** This supersedes `pre-push-sync-law.md`'s "every machine, every push" framing for the _final push to `master`_ specifically — that file's fetch/merge/verify discipline still applies in full to every merge the owner performs, and still applies to a contributor syncing their own branch against `master`. What changes is the last step: a contributor's finished work goes through the owner, never straight onto `master` under their own push.

## How work arrives

**Code: a branch and a PR. That is the only door.**

1. Branch off the current `master` tip: `<dev>/<slug>`. Not a tip from three days ago — see "Base drift" below.
2. Push the branch, open a PR (same-repo or fork, matching this project's existing pattern).
3. Claim/update the matching row in `TASKS.md` per `multi-dev-task-queue-law.md` — unchanged.
4. The owner picks it up per the merge procedure below.

**Non-code (a bug report, a finding, a measurement, a question) can arrive however the dev likes** — a message, a comment, a paste. No git ceremony required for something that isn't a patch. The owner files it into `TASKS.md` if it's task-shaped.

The informal hand-off for CODE — "here's a zip / here's a description, you do the git" — is **closed** (owner ruling, 2026-08-09: "dev นอกบังคับ PR อย่างเดียว"). Outside code reaches this repo as a PR or it has not arrived. A PR that fails review is adopted inward and fixed on this side, never bounced back out as homework.

**Status surface**: the PR page is the free one — a contributor can see for themselves whether their work landed. For anything tracked outside a PR, **that dev's own row in `TASKS.md` is the canonical status surface**; the owner keeps it current enough to answer "did my thing land?" without the dev having to ask again.

## Merge procedure (codifying what this project already does — PR #19/#21/#22/#23/#24)

1. `git fetch origin`, pull the source branch/PR (`git fetch origin pull/N/head:pr-N-work` for a fork PR, or the branch directly for same-repo).
2. `git merge --no-commit --no-ff <source>` against the current `master` tip — **re-fetch and use the CURRENT tip, not a tip cached from when the PR was opened.** Two PRs against the same file, merged serially, can merge with zero conflict markers and still silently undo what an earlier merge just fixed (real precedent: PR #19 stripped `harden-runner`, un-pinned SHA actions, and dropped SBOM/attestation — a clean merge, passing CI, caught only by an ad hoc manual re-diff against master's prior state, per item 90). **Before finalizing, diff the merged tree against master's immediately-prior state for anything a recent merge specifically fixed, not just "did CI stay green."**
3. Resolve any real conflict by hand, preserving both sides' intent (`pre-push-sync-law.md`'s existing rule, unchanged) — `MEMORY.md` conflicts especially: interleave/renumber, never drop one side's entries.
4. `npm run ci` green.
5. Commit with a descriptive message naming the PR (`merge: <description> (PR #N)`, matching existing convention), **push to `master` immediately — never batch multiple local merges unpushed** (a real-world merge queue never lets a completed merge exist only in a local working copy — the merge IS the remote push, atomically; a local-only merge is this law's own named single-point-of-failure risk materialized, not just a theoretical one).
6. Close the source PR via API, comment with the merge SHA — don't leave it dangling as "open" (this project's own `MEMORY.md` had exactly this drift: PR #23 and #24 both sat listed as "Open PRs" long after actually merging — caught and fixed in a governance pass, see item 96).
7. **If the merge touched a file a specific dev owns/authored recently**, leave a one-line note in the merge commit or a PR comment naming what changed and why — not a blocking review gate, just enough that the dev finds out from the commit, not by surprise later.

## Base drift — check it before reading a single line of the diff

`git fetch && git log --oneline origin/master -1`, then compare against the PR's merge base. A PR cut from a stale tip is not a small problem: on 2026-08-12 three PRs (#114/#115/#116) arrived 346 commits behind, all three reporting "Conflict 0" in their own audit tables while GitHub reported `mergeable_state: dirty` on every one of them. Two of the three turned out to contain nothing master didn't already have, in newer form.

**A PR's own self-audit is not evidence.** Ask for the output of a command, not a conclusion — `git diff --stat origin/master...HEAD` cannot be narrated wrong the way a summary table can. Check `mergeable_state` and the check-run count on the PR itself before spending review time; all three of those PRs had **zero** check runs, meaning nothing had verified them at all.

## Owner unavailable

**Verified live via `gh api collaborators` (2026-08-08):** `nustanakritwithai` and `DemoGODRTX` are **no longer `admin:true`** — both dropped to push-only access at some point after this law's original 2026-08-07 draft (which named them as break-glass-eligible). The only `admin:true` accounts today are `HetCreep` and `katomnoistudio-oss` (an org/bot account HetCreep controls, not an independent human) — meaning **there is currently no real break-glass fallback**: nobody else holds the technical ability to merge if the owner is unavailable. That is a tighter access model than this law originally assumed, not a gap — but the mechanism below is aspirational until a second trusted human is (re-)granted admin.

No rigid SLA hour-count for a team this size — but the fallback must be _named_, not invented ad hoc under pressure. If the owner is genuinely unavailable and a dev's work is finished, CI-green, and blocking something real:

- **Today**: no fallback exists. Work waits.
- **If HetCreep grants a second human `admin:true` in the future**, that person may merge as a **break-glass fallback**, logged, never silent: the merge commit message states `break-glass: owner unavailable`.
- Break-glass is for finished, CI-green, non-risky work only. Anything touching security/auth/payments/schema/migrations waits — no exception via break-glass for that category.
- No dev gets standing merge rights as a workaround for this. Break-glass is a named exception per-incident, not a new standing role.

## Silent-regression re-check (closing the gap PR #19 already proved real)

Every merge under this law re-verifies against the CURRENT `master` tip (procedure step 2 above), not stale CI from when a branch was cut. This is the concrete fix for the one class of failure this project has already hit for real: a clean, conflict-free merge that quietly undoes an earlier fix because nothing forced a fresh look at the combined result.

## What this doesn't mean

- Doesn't relax `pre-push-sync-law.md`'s fetch/merge/verify discipline — it still governs every merge the owner performs, and still governs a contributor syncing their OWN branch against `master` (just not pushing straight to `master` themselves anymore).
- Doesn't replace `multi-dev-task-queue-law.md`'s claim protocol — `TASKS.md` ownership is unchanged; this law only changes how finished work physically lands.
- Doesn't create a second review process on top of `.agents/rules/ecc/common/code-review.md` — this project's existing practice stays the default; this law only adds the fresh-tip re-check as a mandatory step, not a new review gate.
- Doesn't mean a less-git-fluent dev's work is worth less scrutiny. It does mean they have to send a PR, because that is the only form in which code can be checked before it lands.

## Known limits, not swept under the rug

- **Single point of failure**: this design does not remove the owner as a bottleneck — as more devs join, a serialized controller caps total throughput. Not solved here; revisit if it becomes the real constraint, not before. A formal backup-merger role was weighed against real-world exemplars (GitHub merge queue's batching gets throughput via CI automation, not a second human authority) and explicitly declined for now — a rarely-exercised backup atrophies exactly when a real outage forces its use, and no second trusted `admin:true` account currently exists to hold the role anyway. Still correct to revisit only if throughput becomes the real constraint; this entry records that the question was asked, not ignored.
- **Who reviews the owner's own merges**: this law adds no check above the owner's own merge judgment. GitHub-native review-authorization (Bors' `r+`, GitHub's required-reviewers) doesn't close it either — HetCreep is both the sole `admin:true` human and the author of self-merged commits, so adopting that mechanism wouldn't produce independent review without a second admin.
- **No technical backstop today**: `enforce_admins` on this repo's branch protection is currently `false`, so an admin account can bypass this entire procedure by pushing straight to `master`. This law binds by convention only. Flagged here rather than implied to be enforced; whether to flip `enforce_admins` is a real access decision for HetCreep, not something a rules file can decide for itself.
- **CI doesn't cover the exact asset class PR #19 regressed** (harden-runner / SHA-pinned actions / SBOM presence in `.github/workflows/*.yml`): `npm run ci` doesn't parse workflow YAML, so the fresh-tip re-check (step 2) is currently 100% human judgment for this specific class — the same failure mode the re-check exists to close for everything else. A lightweight CI assertion (grep for pinned SHAs / harden-runner presence) would be proportionate, but building it is out of scope for this rules file; named here as a follow-up, not implemented.
