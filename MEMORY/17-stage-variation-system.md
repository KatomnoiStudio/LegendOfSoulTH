# Owner memory — System 17: Stage Variation

Owner: system owner of `src/game/realtimeBattle/StageVariationSystem.ts` and the `stageType`/params slice of `stageConfig.ts`'s `RealtimeBattleStage`. Never touch: `EnemyAISystem.ts` AI behavior, `RewardSystem.ts` payout math, inter-stage gating/stamina (open, HetCreep call), numeric difficulty tuning.

## Status

Shipped, graduated (TASKS.md DF19, 2026-08-08, PR #60). 7 win-condition functions dispatched on `stageType`, 24 tests. `RealtimeBattleRuntime.checkBattleEnd()` calls `resolveStageOutcome()`, zero `stageType` branching outside this system.

## Design-lock 5.a (2026-08-10)

`custom` stageType is intentionally 0 stages. Not a gap — stays empty until a real use case proves the shape. Doc must say "6 of 7 non-wave types" (survival, defend, hazard, chase, mini-boss, time-attack), never "all 7."

## Verified line anchors (re-derive every dispatch — files move)

- `RealtimeBattleStage` interface: `stageConfig.ts:219-265`
- ห้าม-hardcode rule: `stageConfig.ts:14`
- `calculateBattleReward` signature: `RewardSystem.ts:57-61`

## Lesson (wave-1)

Blueprint line citations drift as comments get added above referenced code — never cite from the doc's stated line number, always grep current tree first.

## Open

- Done-criterion #5 (2-5min normal / 5-8min boss playtest timing) still unverified — no playtest data exists.
- Exploration/stage-select picker (`src/game/flow/types.ts:1-18`) fully commented out since 2026-08-07, HetCreep call.
