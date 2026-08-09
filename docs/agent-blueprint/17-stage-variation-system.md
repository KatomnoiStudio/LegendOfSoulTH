# 17. Stage Variation System

> Category: Adventure · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns: the definition of a stage's **type** (Survival, Defend, Chase, Hazard, Mini-boss, Time Attack, Custom per §5.2) and that type's win/lose condition + pacing target (normal 2–5 min, boss 5–8 min, §5.1). Does **not** own: enemy AI behavior (`EnemyAISystem.ts` resolves encounters via its `EnemyAIState` machine — `'idle' | 'chase' | 'telegraph' | 'attack' | 'recover' | 'hit' | 'knockdown' | 'getUp' | 'dead' | 'phase-transition'`, `EnemyAISystem.ts:31-42` — §3.6.8's Idle→Chase→Telegraph→AttackActive→Recovery sequence is now wired: telegraph is its own distinct state, landed alongside Boss System #11, TASKS.md row 22, 2026-08-08), reward math (`RewardSystem.ts` owns EXP/gold/drop calculation, §5.3), inter-stage gating/stamina cost (§5.1 explicitly OPEN, needs a HetCreep call, not this system's decision), or numeric difficulty tuning (data-table values, deferred to P7/P11 per §5.1).

**Current code state: shipped 2026-08-08 (TASKS.md row #17/DF19, graduated 100%, PR #60).** `src/game/realtimeBattle/StageVariationSystem.ts` implements `resolveStageOutcome()` with 8 win-condition functions dispatched on `stageType` (wave/survival/defend/time-attack/mini-boss/chase/hazard/custom), covered by 24 tests in `StageVariationSystem.test.ts`. `stageConfig.ts`'s `RealtimeBattleStage` interface carries a `stageType` field plus per-type params (`survival`/`defend`/`timeAttack`/`miniBoss`/`chase`/`hazard`), and `REALTIME_STAGES` now has stage entries spanning all 7 non-wave types, not just plain waves. `RealtimeBattleRuntime.checkBattleEnd()` calls `resolveStageOutcome()` and doesn't branch on `stageType` itself. The exploration/stage-select layer that would host a `BattleContext.stageId` picker is still fully commented out (`src/game/flow/types.ts:1-18`, disabled 2026-08-07 per HetCreep) — currently both lobby buttons open `LobbyBattleSession` directly, so stage-type selection happens via the stage's own config record, not a player-facing picker.

### Inputs/Outputs

**In:** a stage config record — extend `RealtimeBattleStage` (`stageConfig.ts:61-76`) with `stageType: 'wave' | 'survival' | 'defend' | 'chase' | 'hazard' | 'mini-boss' | 'time-attack' | 'custom'` plus a small type-specific params object (e.g. survival: `durationMs`; defend: `objectiveHp`/position; time-attack: `timeBudgetMs`; mini-boss: single Elite-tier `templateId`).
**Out:** `outcome: 'victory' | 'defeat'` — same shape `RewardSystem.calculateBattleReward(state, outcome)` already consumes (`RewardSystem.ts:51-54`), so no downstream contract change needed.

### Dependencies

- **combat/enemy** — `EnemyAISystem.ts`, `DamageSystem.ts`, `HitboxSystem.ts` for encounter resolution; mini-boss type reuses Elite-tier stats/knockdown-eligibility with the Boss phase-transition system explicitly withheld (§3.8.4, blueprint line 354-358) — that system now has a real implementation (Boss System #11 graduated 2026-08-08, TASKS.md row 22: `'phase-transition'` EnemyAIState, HP-threshold gate, per-phase attack swap). Mini-boss correctly avoids it not because the mechanism is absent but because mini-boss enemies use `entityType: 'enemy'` (not `'boss'`), and `stepEnemyAI`'s boss-gated branch only fires for `entityType === 'boss'` — verified by `StageVariationSystem.test.ts:260-267`.
- **hero** — one hero pre-selected per stage, no mid-stage switch (§5.1, blueprint line 416).
- **feeds → economy** — `RewardSystem.ts` consumes this system's win/lose output.
- **feeds → adventure** — stage select / chapter progression (currently disabled, see Scope).
- No direct pvp/backend/social dependency today; backend server-authority over stage-clear is a later concern (§8) not yet wired.

### Done-criteria

1. Each of the 7 stage types has its own win-condition function returning `'victory' | 'defeat'`, covered by a deterministic unit test (mirrors `RewardSystem`'s own "no RNG, tests must be deterministic" rule, `RewardSystem.ts:9`).
2. Stage type + params live entirely in `stageConfig.ts`-equivalent data — zero stage-type branching hardcoded in a component, per that file's own stated rule (`stageConfig.ts:8`: "ห้าม hard-code ข้อมูลด่านไว้ใน Component").
3. A test asserts a `mini-boss` stage's enemy runs through the same `EnemyBrain`/`EnemyAIState` path as a regular enemy with no boss-specific fork or extra state — i.e. mini-boss reuses Elite-tier AI as-is (§3.8.4: no Boss phase-transition dependency). Do not phrase this as "never enters the Boss phase-transition state" — that state doesn't exist anywhere in code yet (System #11 per `AGENT_BLUEPRINT.md` is "zero implementation found"), so a test asserting its absence would be vacuous, not a real regression guard. Revisit this criterion once System #11 lands.
4. At least 2 non-wave types (e.g. Survival + Defend) are playable end-to-end — spawn → objective → win/lose → `RewardSystem` payout — before this counts as delivered, not just typed.
5. Normal-stage clear time lands in 2–5 min and boss in 5–8 min (§5.1) confirmed by an actual playtest/timing check, not asserted from design intent alone.

### World-class bar

**Exemplar: Guardian Tales (Kong Studios)** — a shipped, well-known gacha action-RPG whose defining stage-design trait is exactly §5.2's ask: stages aren't uniform combat arenas but mix combat rooms, environmental puzzles/hazards, chase/switch sequences, and boss rooms, often _within one stage traversal_. Concrete pattern worth borrowing: **compose a stage as a sequence of objective segments, not a single stage-level type enum** — a stage can chain a Chase segment into a Hazard room into a boss fight, rather than forcing each stage into exactly one of the 7 named types.

### Stay-current note

The straightforward `stageType` single-discriminant design (Done-criteria #2) will likely need to become a composable segment list as content grows past the first few stages of each type, per the exemplar above — a flat enum can't express a stage that wants to mix two types.

### Low-maintenance-cost design

Extend the _existing_ single-source-of-truth data file (`stageConfig.ts`'s `REALTIME_STAGES`/`ENEMY_TEMPLATES` records) with a `stageType` field and per-type params **in the same file**, and dispatch win-conditions as plain functions keyed by `stageType` in one module — mirroring `RewardSystem.ts`'s pure-function, no-framework style. Do **not** introduce a strategy-pattern class/interface per stage type: only 2 stages exist today (`stageConfig.ts:140-186`), so a plugin interface for 7 types with 1-2 real implementations each is premature abstraction (YAGNI, matches this repo's ponytail/ECC lean-implementation norm already visible in the plain-object `REALTIME_STAGES` pattern).

### Known scars (real historical precedent)

- **Scar**: Monsters in certain battle areas (World 6's ants, and "some battle areas" in World 7's Dungeon Entrance) could attack and damage the player before the battle-start trigger had actually fired. — Source: Guardian Tales Patch Update, Nov 16, 2021 (guardiantalesguides.com/game/patches/view/21): _"The phenomenon that monsters in some battle areas can attack before the battle begins is fixed."_
- **Test-for-us**: For each `stageType`'s win/lose function, try walking into a stage's spawn/segment boundary and see whether `EnemyAISystem` can chase/attack and land damage before that stage's win-condition function has finished initializing its state — a spawn-vs-condition-activation race, worth trying hardest on Survival/Hazard/Chase types where the "clock"/objective start is implicit rather than a hard gate.

- **Scar**: A quest-relevant NPC (villager) could get stuck inside the battle area during the Dragon Claw quest, which is the kind of entity-in-battle-area geometry issue that blocks quest/stage resolution. — Source: Guardian Tales Patch Update, Nov 16, 2021 (guardiantalesguides.com/game/patches/view/21): _"An issue where villagers could get stuck in the battle area during the Dragon Claw quest will be fixed."_
- **Test-for-us**: For Defend-type stages (`objectiveHp`/position) and any escort-like design, try knocking/pushing the objective entity into corners or geometry edge cases and check whether it can get wedged such that the win-condition function can never resolve to either `'victory'` or `'defeat'` — i.e., an un-resolvable stuck state rather than a clean loss.

- **Scar**: A moving jump-platform mechanic in a specific sub-stage (World 11, Potion Factory) "worked abnormally." — Source: Guardian Tales Patch Update, Aug 16, 2022 (guardiantalesguides.com/game/patches/view/40): _"An issue where the jump platform of the World 11 Sub-Stage Potion Factory works abnormally will be fixed."_
- **Test-for-us**: For Hazard-type stage params, try interacting with the hazard element under timing edge cases (mid-animation input, frame hitches/lag, rapid repeated triggers) and verify the hazard's contribution to the win-condition read stays consistent — i.e., that the hazard's internal state can't desync from what the win/lose function is checking.

⚠️ unverified: no well-documented public Guardian Tales incident specifically matching a "mixed-segment stage" (chase→hazard→boss chained within one traversal) breaking end-to-end was found in this search pass — the three scars above are the closest sourced analogues (pre-battle-trigger race, objective-entity stuck state, hazard-mechanic desync) rather than a single traversal-chaining failure.

None of this prescribes how Guardian Tales fixed these — only the failure _shape_ to probe for. What "correct" looks like for the Stage Variation System is defined by this project's own `docs/agent-blueprint/17-stage-variation-system.md` (Done-criteria, win-condition functions, `stageConfig.ts` data-only rule) and `docs/MASTER_BLUEPRINT_v3.0.md`, not by Guardian Tales' implementation.
