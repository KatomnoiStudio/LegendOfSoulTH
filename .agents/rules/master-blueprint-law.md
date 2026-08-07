<!-- coalmine: verified 2026-08-07 · exemplar docs/MASTER_BLUEPRINT_v1.0.md · revalidate 90d -->

# Project Law: Master Blueprint Authority

> HetCreep / SOL WORK command, 2026-08-07. `RULES_VERSION` bump in `AGENTS.md`.

## The rule

**`docs/MASTER_BLUEPRINT_v1.0.md` is the Product North Star for Legend of Soul TH.**

Agents must treat locked decisions in that file as binding product direction.

## What this means

1. Before proposing or implementing gameplay/systems work, read the relevant PART(s) of the Master Blueprint and the current [`docs/BLUEPRINT_GAP_ANALYSIS.md`](../../docs/BLUEPRINT_GAP_ANALYSIS.md).
2. Code that conflicts with the blueprint is **CURRENT / LEGACY / CONFLICT** — document it; do not silently “fix the blueprint to match the code.”
3. A **documentation / governance / audit** PR must not implement combat, dungeon, hero, loot, gacha, progression, AI, boss, town, quest, or large refactors. Classify only.
4. Implementation PRs must name which blueprint PART(s) they advance and stay inside that scope.
5. After a docs/governance PR: **stop and wait for human review** — do not auto-start the next implementation PR.

## What this does not license

- Rewriting the blueprint to excuse existing code without an explicit HetCreep decision.
- Deleting LEGACY trees in a docs PR “to clean up.”
- Treating the practice fork as the product baseline remote.
