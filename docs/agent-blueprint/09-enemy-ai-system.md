# 9. Enemy AI System

> Category: Enemy / Boss · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

`EnemyAISystem.ts` (`src/game/realtimeBattle/EnemyAISystem.ts`) owns per-enemy **decision-making** only: given one enemy, the player, and a time delta, decide the next `EnemyAIState` (`idle → chase → telegraph → attack → recover`, plus `hit`/`knockdown`/`getUp`/`dead` interrupts, and a boss-only `phase-transition` state) and which direction to move. It does not own movement execution (`MovementSystem.ts` applies the returned vector, collision, arena clamp), damage application (`DamageSystem.ts` / `RealtimeBattleRuntime.resolveEnemyAttack`), hitbox/hit detection (`HitboxSystem.ts`), or rendering/telegraph VFX (none exists yet — see Stay-current note). Per-enemy tuning data (ranges, cooldowns, HP/atk/def) lives in `stageConfig.ts`'s `RealtimeEnemyTemplate`; attack selection is per-enemy via `RealtimeEnemyTemplate.attackId` resolved through `getEnemyAttackById()` against the `ENEMY_ATTACKS` registry in `attacks.ts` (`src/game/realtimeBattle/attacks.ts:296-303`), and bosses additionally select per-phase from `BossTemplate.phases[].attacks` (`stageConfig.ts:107-126`) — the single shared `ENEMY_ATTACK` constant is now `@deprecated`, kept only as an alias for `ENEMY_ATTACK_MELEE` (`attacks.ts:253-254`).

### Inputs/Outputs

```ts
stepEnemyAI(
  enemy: RealtimeBattleEntity,   // mutated in place: .state
  brain: EnemyBrain,             // mutated in place: .state, .stateElapsedMs, .hitTargets
  player: RealtimeBattleEntity,  // read-only
  deltaMs: number,
): EnemyDecision                 // { move: Vec2 } — zero vector when not moving
```

`EnemyBrain = { state: EnemyAIState; stateElapsedMs: number; hitTargets: Set<string> }` (`EnemyAISystem.ts:34-49`). One `EnemyBrain` per enemy, held in `RealtimeBattleRuntime`'s `brains: Map<string, EnemyBrain>` (`RealtimeBattleRuntime.ts:74`, `:448-454`), not persisted to the React-facing snapshot (`RealtimeBattleSnapshot`, `types.ts:96-113`).

### Dependencies

- **combat** (Per-Move Property Schema / Basic Attack&Skill systems) — consumes `AttackDefinition`/`ENEMY_ATTACK` timing (`attacks.ts`).
- **combat** (Hit Reaction System) — reads `enemy.hitStunRemainingMs` to enter `hit` state (`EnemyAISystem.ts:156-161`). Knockdown/GetUp are also handled here: the brain mirrors `enemy.state` while it is `knockdown`/`getUp` (set by `combatReaction.ts`'s `tickKnockdownState`) and resolves back to `chase`/`idle` once cleared (`EnemyAISystem.ts:150-153,245-252`).
- **adventure** (Stage/Adventure System) — reads `RealtimeEnemyTemplate` via `getEnemyTemplate()` sourced from `stageConfig.ts`'s shared `ENEMY_TEMPLATES` map (a flat `Record<string, RealtimeEnemyTemplate>` keyed by template id, `stageConfig.ts:78`; per-stage composition is a separate structure, `RealtimeBattleStage.waves`).
- **feeds** Elite/Mini-boss Tier System (#10, per `AGENT_BLUEPRINT.md:55`, source §3.8.3/§3.8.4) and Boss System (#11, per `AGENT_BLUEPRINT.md:56`, source §3.6.9/§3.6.8) — both systems are now built on top of this one and graduated (TASKS.md: #11 Boss System PR #57, #10 Elite/Mini-boss Tier System PR #58, both 2026-08-08) — `EnemyAISystem.ts` carries boss phase-transition branching (`bossTemplate`, `bossPhaseIndex`, `bossPendingPhaseTransition`, the `phase-transition` state) and `RealtimeBattleEntity` carries both `combatTier` and `tier` fields. (§3.8.3 covers summons reusing the enemy AI core; §3.8.4 maps Mini-boss to Elite-tier stats/knockdown-eligibility without the Boss phase-transition system — neither section states AI-core reuse for Elite/Boss specifically, but #10's own citation in the project's system inventory is §3.8.3/§3.8.4.)
- **feeds** Combat Facing System — calls `faceTargetHorizontally()` on attack entry (`EnemyAISystem.ts:134`).

### Done-criteria

1. `src/game/realtimeBattle/EnemyAISystem.test.ts` passes (already exists — regression bar).
2. No regression in `MovementSystem.test.ts` / `RealtimeBattleRuntime.test.ts`.

Not blocking this contract (decision-making-only scope; tracked as forward-looking gaps, see Stay-current note):

- ~~A literal `Telegraph` phase distinguishable from `AttackActive`~~ — done: `telegraph` is now its own `EnemyAIState` (`EnemyAISystem.ts:34`), timed separately via `resolveTelegraphMs(attack)` (`EnemyAISystem.ts:210-218`) before transitioning into the `attack` case (`:220-229`). Ground-marker VFX rendering (below) is still the only remaining gap.
- Ground-marker telegraph VFX (§3.6.8 layer 1) rendering under `src/components/BattleScene/` — this is a rendering-layer deliverable, out of `EnemyAISystem.ts`'s Scope as stated above, and has no owning file yet. Belongs to a separate rendering work-contract once the Telegraph phase (above) exists to key off.
- ~~Knockdown/GetUp states~~ — done: `EntityState` now includes `knockdown`/`getUp` (`types.ts:30`), `AttackDefinition` carries a `knockdown?: boolean` field (`attacks.ts:60`, set on `ENEMY_ATTACK_ELITE`), and `EnemyAISystem.ts` mirrors `enemy.state` through both states before resolving back to `chase`/`idle` (`EnemyAISystem.ts:150-153,245-252`). Elite/Mini-boss Tier System (#10) graduated 2026-08-08 (TASKS.md row 17).

### World-class bar

**Exemplar: Dark Souls (FromSoftware)** — a genre-defining example of enemy telegraph: every dangerous attack has a distinct, readable wind-up animation _separate in time and visual language_ from the active hit-frame, so the player's reaction window is driven by animation readability, not a hidden timer. (Telegraphed wind-ups predate it by decades in action games generally — the point here is the specific technical pattern, not a claim of invention.) The one concrete pattern worth borrowing: treat the telegraph as a **first-class, separately-timed phase with its own visual signal** (not just "the first N ms of one combined attack timer"), which is exactly what §3.6.8 already locks and what the Done-criteria's forward-looking gaps flag as not yet true of the current `attack` brain-state.

### Stay-current note

Resolved: Elite/Mini-boss Tier System (#10) and Boss System (#11) are now both graduated (TASKS.md rows 17 and 22, 2026-08-08) and reuse this exact file as §3.8.3/§3.8.4 anticipated — `EnemyAISystem.ts` now carries tier-aware branches (`combatTier`/`tier` fields on `RealtimeBattleEntity`, `types.ts:101,113`), Knockdown/GetUp states (`EnemyAISystem.ts:150-153,245-252`), and PhaseTransition/Invulnerable handling (`EnemyAISystem.ts:163-207`, `invulnerableUntilMs`) without a second state machine. This whole contract doc (Scope/Dependencies/Done-criteria above) needs a revision pass to describe the shipped #10/#11-aware system rather than the pre-2026-08-08 baseline.

### Low-maintenance-cost design

The **existing single-source data files** were extended rather than branching the state machine per enemy type, as recommended: `AttackDefinition` (`attacks.ts:60,68`) already carries `knockdown?: boolean` and `telegraphMs?: number` fields, and `RealtimeEnemyTemplate` (`stageConfig.ts:64,66`) already carries `tier: EnemyTier` and `attackId: string` fields — no second `EnemyAISystem` was written for elites/bosses. This directly matches the project's own already-stated reasoning in `EnemyAISystem.ts:9-11` (reusing `MovementSystem` instead of a second movement implementation) and §3.8.3/§3.8.4's core-reuse framing for #10 — one state machine, data-driven per enemy, no premature per-tier abstraction until #10/#11 actually need it.

### Known scars (real historical precedent)

- **Scar**: In the Painted World of Ariandel, certain crystal lizard enemies would not move until they began to attack (i.e. their idle→aware/chase transition silently failed and they sat inert until the attack trigger fired) — Source: Dark Souls III official patch notes, Regulation 1.23 / App Version 1.09 (Nov 25, 2016), as recorded on the Dark Souls III Fextralife wiki "Patches" page.
- **Test-for-us**: In `EnemyAISystem`, try triggering the `idle → chase` transition from many different starting conditions (enemy just spawned this frame, enemy just exited `hit`/`recover` back toward `idle`, player crossing the aggro-range boundary at different deltaMs step sizes) and check whether there's any path where an enemy gets permanently stuck reporting `idle` (zero move vector) even though the player is within whatever range should trigger `chase`.

- **Scar**: A crab enemy in the Painted World of Ariandel would float in the air if led (via its AI movement) to a certain map location — a mismatch between what the AI's pathing decided and what the world/collision actually did with that decision, leaving the enemy stuck in a broken state — Source: same DS3 patch notes (Regulation 1.23 / App Version 1.09), Fextralife wiki.
- **Test-for-us**: Since `EnemyAISystem` only returns a decided move vector and `MovementSystem` separately applies it plus collision/arena-clamp, try chasing/kiting an enemy into every boundary-adjacent and corner position of the arena and check whether the AI's `chase`/`attack` state ever ends up mismatched with the enemy's actual clamped position — e.g. AI thinks it's approaching/attacking while `MovementSystem`'s clamp has pinned it somewhere else, producing a visually or logically "stuck" enemy.

- **Scar**: Crab enemies' movement patterns would change if the player repeatedly saved and reloaded game data near them — enemy AI state didn't survive a save/reload cycle cleanly — Source: same DS3 patch notes (Regulation 1.23 / App Version 1.09), Fextralife wiki.
- **Test-for-us**: This file's own Inputs/Outputs section notes `EnemyBrain` (`state`, `stateElapsedMs`, `hitTargets`) lives only in `RealtimeBattleRuntime.brains` and is **not** persisted to the React-facing `RealtimeBattleSnapshot`. Try forcing whatever this project's equivalent of a reload/remount/reconnect is (component re-render, snapshot serialize/deserialize round-trip, React StrictMode double-invoke, hot-reload) while an enemy is mid-`attack` or mid-`recover`, and check whether the brain's state, elapsed timer, or `hitTargets` set desyncs, resets, or lets an attack re-register hits it already counted.

This project's own spec (`docs/MASTER_BLUEPRINT_v3.0.md` and this file's Scope/Done-criteria/§3.6.8 lock) — not how Dark Souls III's team happened to fix these bugs — is what "correct" means for `EnemyAISystem.ts`. The three scars above only justify what failure _shapes_ are worth trying to reproduce here; they say nothing about the right fix.
