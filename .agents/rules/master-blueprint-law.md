<!-- coalmine: verified 2026-08-07 · exemplar docs/MASTER_BLUEPRINT_v3.0.md · revalidate 90d -->

# Project Law: Master Blueprint Authority

> HetCreep / SOL WORK command, 2026-08-07. Updated for v3.0 baseline lock. `RULES_VERSION` bump in `AGENTS.md`.

## The rule

**`docs/MASTER_BLUEPRINT_v3.0.md` is the Product North Star for Legend of Soul TH.**

Blueprint v1.0, the v1.0-era gap analysis, and any v2.0 in-flight draft are **SUPERSEDED** and deleted — `docs/MASTER_BLUEPRINT_v3.0.md` is the only blueprint file in the repo (2026-08-07 consolidation).

Agents must treat locked decisions in v3.0 as binding product direction.

## What this means

1. Before gameplay/systems work, read Master Blueprint v3.0 (`docs/MASTER_BLUEPRINT_v3.0.md`) in full.
2. Conflicting code → **CURRENT / LEGACY / SUPERSEDED / DEFERRED** — document; do not silently match code to old blueprints.
3. **Docs/audit PRs** classify only — no combat, stage, gacha, PvP, or loot implementation.
4. Implementation PRs name blueprint section + roadmap priority (P1–P15); **one topic = one PR**.
5. **CUT/DEFERRED** items (loot RPG, affix, set bonus, dash button, skill-4, talent, awakening) must not be built without explicit HetCreep approval.
6. After a docs PR: **stop for human review**.

## What this does not license

- Rewriting the blueprint to excuse existing code without HetCreep decision.
- Mass-deleting LEGACY in a docs PR.
- Treating the practice fork as product baseline remote.
- Reverting to v1/v2 assumptions (4 skills, separate dash, early loot RPG, Ramakien-only ceiling).
