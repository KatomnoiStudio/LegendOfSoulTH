<!-- coalmine: verified 2026-08-07 · exemplar HetCreep's standing instruction, 2026-08-07 · revalidate 90d -->
# Project Law: Proven-good goes in now; everything else gets weighed

> HetCreep's standing instruction, 2026-08-07. This supersedes any earlier rule in this
> repo that gates a change purely on "ask before doing real work" — see the amendment to
> `gold-standard-baseline.md` item 6.

## The rule

**If the change is a kind this project has already proven beneficial, do it. Do not ask.**

**If it is anything else, weigh it — effort against what it actually buys — and say what
you weighed.** Come back with a recommendation, not an open question.

That is the whole rule. What follows is what it does and does not license.

## What counts as "already proven beneficial"

Something this repo has done before and found to be worth it, with the evidence recorded
in `MEMORY.md` or a rule file. As of 2026-08-07 that includes, non-exhaustively:

- **A test that pins a bug this project actually hit.** Every one of these has paid — the
  battle-victory regression, the save-import brick, the version-drift guard.
- **Routing a swallowed failure through `reportError`** with the right tier.
- **Deleting confirmed-dead code**, once reachability has been checked properly (a
  comprehensive grep across all entry routes, not a partial one — see the lesson tags in
  `MEMORY.md`).
- **Correcting a rule, comment, or doc that states something untrue.** A binding rule
  citing a checkable falsehood costs the whole ruleset its authority; seven of them were
  found in one day.
- **Closing a gap an audit named, where the fix is mechanical** and the exemplar is cited.
- **Pinning an action to a current SHA**, or any other supply-chain hygiene with a
  verifiable upstream.

## What still gets weighed, not just done

Anything whose cost is real or whose benefit is a guess:

- Work measured in days rather than minutes, however obviously good.
- Adding a dependency, a build step, or a new layer.
- A change that alters how the game behaves for a player.
- Anything that reverses a decision already recorded with reasoning — that is an ask-CB,
  not a judgment call (see `reportError.ts`'s header for a live example).

For these: state the cost, state what it buys, recommend one, and proceed unless told
otherwise. **"I did not do it because it seemed like a lot of work" is not weighing — it
is deciding without saying so.**

## What this rule does NOT license

- It does not license **skipping verification**. Proven-good means the *kind* of change is
  proven, not that this instance is correct. The gate still has to be green, and a claim
  still needs evidence.
- It does not license **scope creep**. Doing a proven-good thing that was not asked for is
  fine when it is adjacent and small; rewriting a subsystem because it would be better is
  not.
- It does not override anything in `ring0-authority.md`, the confirm-before-destructive
  rail, or the requirement to surface a decision that is genuinely the human's.

## Why this exists

The previous default made an agent stop and ask before any work with real effort attached.
On a project where the same operator answers every question, that turned into a tax paid
on every useful change, and the questions that mattered got buried among the ones that did
not. The point of asking is to surface a genuine fork. If there is no fork, there is
nothing to surface.
