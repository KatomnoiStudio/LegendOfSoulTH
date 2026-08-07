<!-- coalmine: verified 2026-08-07 · exemplar docs/MASTER_BLUEPRINT_v2.0.md · revalidate 90d -->

# Project Law: Master Blueprint Authority

> HetCreep / SOL WORK command, 2026-08-07. Updated for v2.0 direction reset. `RULES_VERSION` bump in `AGENTS.md`.

## The rule

**`docs/MASTER_BLUEPRINT_v2.0.md` is the Product North Star for Legend of Soul TH.**

[`docs/MASTER_BLUEPRINT_v1.0.md`](../../docs/MASTER_BLUEPRINT_v1.0.md) and [`docs/BLUEPRINT_GAP_ANALYSIS.md`](../../docs/BLUEPRINT_GAP_ANALYSIS.md) are **SUPERSEDED** — historical only.

Agents must treat locked decisions in v2.0 as binding product direction.

## What this means

1. Before proposing or implementing gameplay/systems work, read the relevant section(s) of Master Blueprint v2.0 and the current [`docs/BLUEPRINT_V2_MIGRATION_AUDIT.md`](../../docs/BLUEPRINT_V2_MIGRATION_AUDIT.md).
2. Code that conflicts with the blueprint is **CURRENT / LEGACY / SUPERSEDED** — document it; do not silently “fix the blueprint to match the code.”
3. A **documentation / governance / audit** PR must not implement combat, stage, hero, loot, gacha, progression, AI, boss, PvP, backend, or large refactors. Classify and plan only.
4. Implementation PRs must name which blueprint section(s) / roadmap priority (P1–P20) they advance and stay inside that scope — **one topic = one PR** (v2.0 §42).
5. After a docs/governance PR: **stop and wait for human review** — do not auto-start the next implementation PR.

## What this does not license

- Rewriting the blueprint to excuse existing code without an explicit HetCreep decision.
- Deleting LEGACY trees in a docs PR “to clean up.”
- Treating the practice fork as the product baseline remote.
- Reverting to v1.0 premium-one-time, dungeon-only, or 360°-attack assumptions without a new HetCreep command.
