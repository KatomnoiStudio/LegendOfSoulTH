# MEMORY — System 09: Enemy AI System

Caretaker: system-09 seat. Owns `EnemyAISystem.ts` decision-making only (state transitions + move direction).

## 2026-08-10 — Citation-rot fix (design-lock 11.a batch)

Re-derived every file:line citation in `docs/agent-blueprint/09-enemy-ai-system.md` against the current tree by reading the actual files (never trusted old numbers). Fixed 6 stale citations, all caused by the file evolving (boss fields, telegraph state, boss-phase branching added) after the doc was written — not fabrication.

| Citation                               | Was                           | Now                                     | Why                                                                                   |
| -------------------------------------- | ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `EnemyBrain` interface                 | `EnemyAISystem.ts:34-49`      | `:44-58`                                | Lines 34-42 are the `EnemyAIState` enum; interface starts at 44                       |
| `brains: Map<...>` declaration         | `RealtimeBattleRuntime.ts:74` | `:90`                                   | Class field moved down as file grew                                                   |
| brain per-enemy evidence               | `:448-454`                    | `:600-606` (`brainFor()` get-or-create) | Old range pointed at unrelated `resolveEnemyAttack` hit-detection code                |
| `RealtimeBattleSnapshot` interface     | `types.ts:96-113`             | `:146-166`                              | 96-113 is actually part of `RealtimeBattleEntity`; snapshot interface is further down |
| `ENEMY_TEMPLATES` map                  | `stageConfig.ts:78`           | `:267`                                  | Line 78 is `ELITE_STAT_MULTIPLIER`; map moved down                                    |
| `faceTargetHorizontally()` call site   | `EnemyAISystem.ts:134`        | `:262`                                  | Old number pointed at a doc-comment, not the call                                     |
| MovementSystem-reuse reasoning comment | `EnemyAISystem.ts:9-11`       | `:16-18`                                | Off by a few lines from import-block growth                                           |
| Elite/Mini-boss Tier System entry      | `AGENT_BLUEPRINT.md:55`       | `:74`                                   | Blueprint doc grew above this section                                                 |
| Boss System entry                      | `AGENT_BLUEPRINT.md:56`       | `:76`                                   | Same                                                                                  |

All other citations in the doc (telegraph state machine, knockdown/getUp mirror, hit-stun, boss phase block, `attacks.ts:60/68/253-254/296-303`, `stageConfig.ts:64,66,107-126`, `types.ts:30,101,113`) were re-checked against current source and already resolve correctly — left untouched.

No substance/design claims were touched — citation accuracy only, per dispatch scope wall.

## Flagged (not fixed — substance claim, not citation)

None found this pass. All Scope/Dependencies/Done-criteria claims verified true against current code during citation re-derivation.

## Open notes for future dispatches on this system

- Contract's own "Stay-current note" (line 47) already flags: doc needs a revision pass to describe the shipped #10/#11-aware system rather than pre-2026-08-08 baseline. This dispatch only fixed line numbers, not that structural staleness — still open.
- `EnemyAISystem.ts:189-191` has a `ponytail:` comment: boss `phase-transition` state borrows `EntityState: 'skill'` as a stopgap render state (no dedicated render-distinguishable state exists yet). Upgrade path is gated on the render layer, which has no owning file yet (ground-marker telegraph VFX gap, also flagged in Scope). Not mine to fix — raise when that rendering system gets contracted.
