# 11 — boss-system (caretaker memory)

## Scope (from contract)

Own: HP-threshold phase-transition state machine for boss tier only — `telegraph`/`phase-transition` `EnemyAIState` branch (host file `EnemyAISystem.ts`, owned by #9) + `BossTemplate`/`BossAttackRow`/`BossPhaseTemplate`/`BOSS_TEMPLATES` (host file `stageConfig.ts`, owned by #16).
Never touch: generic enemy AI loop (#9), Elite/Mini-boss tier — explicitly single-phase, no transition, §3.8.4 (#10), per-move schema (#5), knockdown eligibility (#6), stage/wave placement (#16/#17).
Co-tenant files, no own source file: name owned symbols when dispatched, not just files.

## Live state

- System graduated 100% before this caretaker's first dispatch (TASKS.md row 16 / DF16, PR #57, 2026-08-08). This dispatch was citation-rot-only (design-lock 11.a), no design/scope edits.
- 6 stale citations fixed 2026-08-10, all off-by-a-few-lines drift, none a fabricated quote or wrong symbol:
  - `docs/MASTER_BLUEPRINT_v3.0.md:217` → `:218` ("Boss/enemy attacks additionally define" clause, §3.6.7).
  - `docs/MASTER_BLUEPRINT_v3.0.md:270` → `:271` ("Heavy 3D telegraph VFX (markers + tint first)", §3.6.10).
  - `stageConfig.ts:6-9` → `:14-15` (the header comment banning hard-coded stage data) — cited wrong twice (Dependencies section + Low-maintenance section), fixed both.
  - `EnemyAISystem.ts:17` → `:31-42` (Done-criterion 4's `EnemyAIState` union citation — `:17` lands mid-file-header-comment, not the union).
  - `EnemyAISystem.ts:76` → `:129` (`stepEnemyAI` function definition — `:76` lands inside the `EnemyDecision.telegraph` doc-comment, not the function).
- Confirmed CORRECT on re-derivation (no edit needed): `EnemyAISystem.ts:31-42` (union, Scope section), `types.ts:47` (`EntityType` incl. `'boss'`), `stageConfig.ts:92-154` (`BossAttackRow`/`BossPhaseTemplate`/`BossTemplate`/`BOSS_TEMPLATES` — interfaces at 92-127, table 132-154), `types.ts:67-119` (`RealtimeBattleEntity`), `types.ts:96` (`invulnerableUntilMs`), `types.ts:130` (`'ground-marker'` in `BattleEffectKind`), `HitboxSystem.ts:105,146` (both invuln checks), `EnemyAISystem.ts:163-207` (boss-gated branch in `stepEnemyAI`), `EnemyAISystem.ts:266` (attack-pool swap line), `EnemyAISystem.test.ts:321` (the boss describe block).

## Substance claim flagged, not edited (per dispatch scope)

- Dependencies section (contract, "Enemy AI System (#9)" bullet): "The `Telegraph` state referenced in §3.6.8 doesn't exist in `EnemyAISystem.ts` yet — Boss System is what has to add it." Present tense reads as still-pending, but the system graduated 100% (PR #57) and `telegraph` has been a live `EnemyAIState` union member since — this line was written pre-ship and never updated post-graduation. Citation-accuracy-only scope for this dispatch; flagging for the next design-lock/status pass rather than editing prose myself.

## Scars to hold (from contract, real-precedent, not yet stress-tested by this caretaker)

- AI-inactive spawn window (Dark Souls "AFK glitch" / trigger-skip) — probe the gap between boss entity spawn and its first `stepEnemyAI` tick for free/unanswerable damage.
- Telegraph-cancel race (Super Ornstein phase-2) — `selectedAttack` is latched at Telegraph entry specifically to close this; verify a state re-entry or second HP-threshold crossing can't swap the executed attack away from what the ground-marker/cast-bar told the player.
- Simultaneous dual-trigger corruption (Gwyn parry+backstab) — two same-tick threshold/lethal events must not leave `PhaseTransition` and death/other-state both partially fired; direct stress test for Done-criterion 5 ("single-use per boss instance").
- Position/state desync at arena bounds (Ornstein wall-warp) — boss mid-attack/telegraph driven toward arena boundary/trigger volume must not decouple AI state from renderable/playable position.

## Open questions for owner

1. 4 citation-drift entries were found and fixed this dispatch (see Live state) — no further action needed, closing the item raised at onboarding.
2. "Stay-current note" (shader-based telegraph VFX gated on R3F/WebGPU pipeline maturity) — still reads as CUT per §3.6.10, no signal seen this dispatch to re-evaluate; carrying the question forward, not resolved.
