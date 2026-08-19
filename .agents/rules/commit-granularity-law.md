<!-- coalmine: verified 2026-08-06 · exemplar this project's own commit history (mixed granularity observed — some tasks split across 2-4 commits, others clean) · revalidate 90d -->

# Commit Granularity Law

> **Scope**: Binding for every agent, every machine, no exceptions.

## The rule

**One completed task = one commit.** When a unit of work reaches a real stopping point — verified, working, ready to hand off — it lands as exactly one commit, not spread across several partial ones and not bundled into an unrelated one.

## What counts as "one task"

The unit the human actually asked for or agreed to, at the granularity they'd recognize as "done." Examples from this project's own history:

- "Fix the broken image paths" → one commit, even though it touched 12 files (`fix: root-absolute public/ asset paths 404 on GitHub Pages subpath`).
- "Merge the battle system from Hih#11" → one commit for the merge content itself; separate commits for the _conflict-resolution merge commits_ that followed are fine (those are git's own mechanism, not a violation — see "What this doesn't mean" below).
- Governance/rule changes → one commit per rule, matching `.agents/rules/pre-push-sync-law.md`'s own commit (`docs: codify pre-push sync law`).

## Why

A reviewer (human or future agent) reading `git log` should be able to tell what happened from the commit list alone, without needing to reconstruct which of 3 half-finished commits together made up one real change. Splitting a single completed task across multiple commits — "wip", "fix typo", "actually fix it this time" — makes `git bisect`, `git blame`, and code review all harder for no benefit once the task itself is a single coherent thing.

## What this doesn't mean

- **Don't squash unrelated work together** to hit "one commit" artificially. Two genuinely separate tasks (e.g. a bug fix and a new feature) are two commits, even back-to-back.
- **Merge commits are exempt** — `git merge` producing its own commit (per `.agents/rules/pre-push-sync-law.md`) is git's mechanism, not a task being split.
- **Don't hold work uncommitted** to wait for a "bigger" batch either — per `pre-push-sync-law.md`, verify and push each completed task promptly. This rule is about _shape_ (one task, one commit), not about delaying commits to accumulate several tasks into one.
- A task big enough to need checkpoints (e.g. a large multi-file merge with several verify passes) still lands as one commit once it's actually done — the checkpoints are `npm run ci` runs during the work, not separate commits.

## When a task turns out bigger than expected mid-flight

If what looked like one task splits into genuinely separate sub-tasks partway through (discovered scope, like the `publicUrl` bug found in more files after the main fix), each sub-task still gets its own single commit once _it's_ done — don't retroactively force everything into the original commit via `--amend` (amending already-pushed commits violates other constraints too). Multiple single-task commits in a row is correct; multiple partial commits for the _same_ task is what this rule forbids.

**Enforcement**: ADVISORY. "One completed task" is a judgment about what the unit of work
was, and a diff does not carry it — two unrelated fixes and one two-part fix produce the same
shape. Nothing here is mechanically checkable without inventing a task ledger the commit
never referenced.
