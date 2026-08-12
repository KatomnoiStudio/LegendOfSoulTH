# MEMORY — System 09: Enemy AI System

Owner: system-09 seat. Owns `EnemyAISystem.ts` decision-making only (state transitions + move direction).

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

Other fixes: publish-once-per-tick behind a dirty flag (a 10-target AoE was doing 10 full snapshot rebuilds + 10 React notifications inside one 16.7ms tick); allocation-free nearest-K camera selection replacing filter+spread+`toSorted`+slice per frame; `getEntityById()` on the runtime backed by a Map keyed off the enemies-array reference, replacing a per-sprite `find()` per frame; `resolveSpriteMeshPresentation` memoised by `(kind, frameUrl)`, which kills the `.find` + `String.includes` scan every sprite ran every frame; `.push()` instead of `[...events, ev]` on both private event queues.

**Verified against mutation, not just green tests** — each of these was re-broken and the named test failed: publish-per-target, the telegraph-corpse guard, camera tie order, entity-index invalidation, and corpse removal from the snapshot.

(A sixth fix — passing `enemyHpScale` on the auto-advance wave path in `StageVariationSystem.ts`, which had silently dropped it — was found in this same pass but **dropped from this branch on QC's second gate, 2026-08-10**. See the round-2 section below for why: it's a real bug, but not a perf-lane fix. It went out as its own standalone writeup for main to raise behind an owner design-lock.)

Standing lesson for this seat: in this runtime, "dead" is a state an entity keeps, not a removal. Read who depends on a collection's meaning before narrowing it — the perf win was available without touching the meaning at all.

## 2026-08-10 — QC round 2: both bounced defects confirmed closed, one scope violation caught

QC independently reproduced both round-1 findings and confirmed them closed: the corpse-shove (its own fixed-RNG probe measured 105.4000 units reverted, 0.0000 as shipped, and it walked every mutation site between `stepAllies` and `separateEnemies` and found nothing else open) and the publish-hoist (all three sites now caught, each by a distinct test under the reverted-assignment mutation — the structural test at `resolveEnemyAttack` was explicitly endorsed: the gate verified the 120ms-invulnerability argument both structurally, via `HitboxSystem.ts:105`, and empirically, via 16 simultaneous attackers × 30s × 3 stages × fixed RNG → `MAX_PER_TICK=1` every trial, and found it over-determined besides — `resolveEnemyAttack:487` passes a one-candidate target list, so the loop cannot iterate twice under any condition, making a call-count test structurally incapable there).

**Blocking finding: `StageVariationSystem.ts:29`'s `enemyHpScale` fix had no business on a perf branch.** Two problems, one of them serious:

1. Unmerged PR #107 touches the same two files (`StageVariationSystem.ts`/`.test.ts`) — my prior RETURN claimed I hadn't touched #107's files. That was false; I hadn't checked, I'd assumed. Corrected: verify collision claims against the actual unmerged diff, not against memory of what I intended to touch.
2. The fix is a real gameplay-difficulty change, not a perf change: `dungeonConfig.ts:24` sets `enemyHpScale: 0.7` for survival stages, previously honoured only on wave 1 and `spawnWaveAt`. Landing it makes survival-dungeon waves 2+ spawn at 0.7× HP where they spawn at 1.0× today — a real balance change with no CHANGELOG line and no design lock, shipped inside a commit titled "cut per-tick allocations". Under AGENTS.md rules 15/16/23 this HOLDs for the owner — not a perf lane's call to make unilaterally.

**Fix: `StageVariationSystem.ts` and `StageVariationSystem.test.ts` reverted to master's exact content** (`git checkout origin/master --`, verified zero-byte diff), dropping the `enemyHpScale` fix from this branch entirely. The bug itself is real and was handed to main as a standalone writeup, to raise as its own lane behind an owner design-lock — not re-raised by this seat.

## Follow-ups QC found and asked to be recorded, not fixed here

- **Deletion-mutation survives at 2 of 3 publish sites** (`RealtimeBattleRuntime.ts:301`, `:404` — `stepPlayerAttack`/`stepPlayerSkill`). Deleting the `publishRequested = true` assignment outright leaves all 26 tests green: both multi-hit tests assert only an upper bound (`toBe(1)`), never a lower one, and `PUBLISH_INTERVAL_MS = 100` against 16ms steps means the interval-timer publish still reaches 1 within the test's own loop window. Not a defect in shipped code — a one-sided coverage gap. A future refactor that silently drops the flag-set would make the HUD's HP bar up to 100ms stale on every hit while the suite stays green. Fix (not done here): add a lower-bound assertion (`toBeGreaterThanOrEqual(1)` isn't it either — need to assert the flag actually gates something, e.g. spy on `buildSnapshot` call count directly rather than inferring it from `calls`).
- **The snapshot's event arrays are no longer immutable.** `RealtimeBattleRuntime.ts:460` (`pushEffectEvent`) and `:513` (`pushDamageEvent`) moved from spread-copy to `.push()` in the perf pass, and `buildSnapshot:880-881` hands `this.damageEvents`/`this.effectEvents` out by reference — so a published snapshot's array is now live-mutated by the next tick's pushes, not a frozen copy. Nothing breaks today: `DamageNumberLayer` dedupes by id, `BattleArena` filters at render, both read-tolerant of a mutating backing array. But the comment at `:458-459` says the queue "เป็นของส่วนตัวของ runtime" (private to the runtime) — it is not; it's handed out as a field of the exported `RealtimeBattleSnapshot` type (`types.ts:177-178`). Fix (not done here): either copy on publish (reintroduces the allocation this pass removed) or correct the comment to state the actual contract (readers must tolerate a live-mutating array, never hold a reference across ticks) — comment must not claim the opposite of what the type shape allows.
- **The i-frame argument (used to justify the `resolveEnemyAttack` structural test) rests on a data value, not an invariant.** `combatReaction.ts:53-60` skips the i-frame entirely on the knockdown path (`target.state = 'knockdown'`, returns before `:64`'s `invulnerableUntilMs` write). This is unreachable for the player today only because `createRealtimeBattle.ts:130` builds the player entity with `combatTier: 'mob'`, and `canApplyKnockdown` (`combatReaction.ts:15-19`) requires `elite`/`boss`. But `PvPAuthorityEngine.ts:145` already builds a _different_ player entity with `combatTier: 'elite'` for a different engine — no live bug (different engine, not this one), but if the realtime player entity ever gains elite/boss tier, the double-hit-in-one-tick this seat's structural test assumes impossible becomes possible again, silently. Fix (not done here): move `target.invulnerableUntilMs = elapsedMs + 120` above the knockdown branch (or set it in both branches) so the i-frame is unconditional on any hit, making it a real invariant instead of a tier-gated coincidence.

## Open notes for future dispatches on this system

- Contract's own "Stay-current note" (line 47) already flags: doc needs a revision pass to describe the shipped #10/#11-aware system rather than pre-2026-08-08 baseline. This dispatch only fixed line numbers, not that structural staleness — still open.
- `EnemyAISystem.ts:189-191` has a `ponytail:` comment: boss `phase-transition` state borrows `EntityState: 'skill'` as a stopgap render state (no dedicated render-distinguishable state exists yet). Upgrade path is gated on the render layer, which has no owning file yet (ground-marker telegraph VFX gap, also flagged in Scope). Not mine to fix — raise when that rendering system gets contracted.
- **enemyHpScale bug, held for owner design-lock (see standalone writeup handed to main):** `StageVariationSystem.ts:29`'s `createWaveEnemies(state.stage, nextWaveIndex)` should be `createWaveEnemies(state.stage, nextWaveIndex, state.enemyHpScale ?? 1)`. One line, but a difficulty change — do not land it without an owner decision, even though it's technically "in scope" for a future system-17 (Stage Variation) dispatch to pick up once locked.
