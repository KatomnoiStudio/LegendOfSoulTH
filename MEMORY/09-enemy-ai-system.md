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

## 2026-08-10 — Battle hot-loop perf pass (audit wave 1, F1–F7)

Branch `perf/audit-wave1-battle-loop`. Dispatch extended my seam from `EnemyAISystem.ts` into the runtime loop it runs inside. Every fix is behaviour-preserving; gameplay timing and hitboxes are untouched.

**The load-bearing finding: `state.enemies` means "every enemy this battle has ever spawned", and that meaning is depended on.** The audit prescribed dropping corpses from the array with a separate tombstone list for rendering. Reading the consumers first showed that would break real behaviour in five places:

- `RewardSystem.ts:78` looks rewards up by `state.enemies.find(id === defeatedId)` — corpses gone means rewards gone.
- `stageObjectives.ts:61,178,282,352,382` all gate on `getAliveEnemies().length === 0 && getEnemies().length > 0`; the second clause exists to tell "never spawned" apart from "all dead". Empty the array on death and dungeon stages never register a clear.
- `EnemyHealthBar.tsx:30,49` sizes its DOM pool by total-across-waves and indexes `enemies[index]` positionally — removing corpses shifts every later enemy's bar.
- `combatSummary.ts:30` iterates the same "all spawned" meaning.
- `RealtimeBattleRuntime.test.ts:230` asserts the array grows across waves, on purpose.

So the array stayed, and the hot loops got an alive-only view instead: **one filter per tick in `step()`, threaded into `stepEnemies`/`stepAllies`/`separateEnemies` plus a single hoisted `blockers` array**. Same O(alive) win the finding asked for, no semantic break. `stepMovement` already skips `state === 'dead'` blockers, so collision results are bit-identical.

**Trap this created, and closed:** `stepEnemies` no longer walks corpses, so a brain that died mid-`telegraph` never transitions to `dead` — its ground marker would hang for the rest of the battle. `getTelegraphMarkers()` now skips dead enemies. Pinned by a test; verified it fails without the guard.

Other fixes: publish-once-per-tick behind a dirty flag (a 10-target AoE was doing 10 full snapshot rebuilds + 10 React notifications inside one 16.7ms tick); allocation-free nearest-K camera selection replacing filter+spread+`toSorted`+slice per frame; `getEntityById()` on the runtime backed by a Map keyed off the enemies-array reference, replacing a per-sprite `find()` per frame; `resolveSpriteMeshPresentation` memoised by `(kind, frameUrl)`, which kills the `.find` + `String.includes` scan every sprite ran every frame; `.push()` instead of `[...events, ev]` on both private event queues; and `enemyHpScale` passed on the auto-advance wave path, which had silently dropped it.

**Verified against mutation, not just green tests** — each of these was re-broken and the named test failed: publish-per-target, the telegraph-corpse guard, camera tie order, entity-index invalidation, the dropped `enemyHpScale`, and corpse removal from the snapshot.

Standing lesson for this seat: in this runtime, "dead" is a state an entity keeps, not a removal. Read who depends on a collection's meaning before narrowing it — the perf win was available without touching the meaning at all.

## Open notes for future dispatches on this system

- Contract's own "Stay-current note" (line 47) already flags: doc needs a revision pass to describe the shipped #10/#11-aware system rather than pre-2026-08-08 baseline. This dispatch only fixed line numbers, not that structural staleness — still open.
- `EnemyAISystem.ts:189-191` has a `ponytail:` comment: boss `phase-transition` state borrows `EntityState: 'skill'` as a stopgap render state (no dedicated render-distinguishable state exists yet). Upgrade path is gated on the render layer, which has no owning file yet (ground-marker telegraph VFX gap, also flagged in Scope). Not mine to fix — raise when that rendering system gets contracted.
