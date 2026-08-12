# 01 — movement-system (system-owner memory)

## Scope (from contract)

Own: `src/game/realtimeBattle/MovementSystem.ts` — per-tick movement resolution for any `RealtimeBattleEntity`: input normalize/deadzone, diagonal-speed correction, speed→displacement sub-stepping (`maxStepMs = 50`), circle-vs-circle collision push-out, arena-bounds clamp, derived facing (delegates combat-facing to `combatFacing.ts`).
Never touch: input capture/device mapping, enemy/ally decision-making (`EnemyAISystem.ts` only hands over a direction vector), hit/damage resolution, hit-stun/death state transitions (read-only via `isControlLocked`), rendering/camera.

## Live state

- File is 145 lines now (contract said `:1-134` — grew past that when the `maxStepMs=50` sub-stepping fix landed, commit `56a7d9a`). Contract's own Known-scars section already narrates that fix; the header line range just hadn't caught up.
- `entity.velocity` is fully recomputed from `direction * entity.speed` every call at `MovementSystem.ts:112`, nothing carried from the previous tick — this is why the Quake-style accumulation-bug scar doesn't apply here (contract had this citation off by a few lines, at `:108-109`, which is the sub-step loop setup, not the recompute).
- Call sites for `stepMovement` are `RealtimeBattleRuntime.ts:152-154` (player, normal), `:166-168` (player, mid-skill-animation), `:527-529` (enemy loop) — contract cited `127-130,370-373`, which is unrelated code (tick loop / skill side-effects), not the real call sites.

## Citations corrected this pass (docs/agent-blueprint/01-movement-system.md)

All fixes were re-derived by reading the live file, not carried over from the stale number:

- Scope header `MovementSystem.ts:1-134` → `:1-145` (file line count, `wc -l` = 145).
- Scope: "ไม่มีอะไรผูกกับ React หรือ DOM" comment `MovementSystem.ts:6` → `:7` (text is on the line after `/**`).
- Scope + Low-maintenance-cost: `EnemyAISystem.ts:7-11` (no-reimplement-movement comment) → `:12-18` (read file, comment block starts at line 12). Dependencies section already had this one right at `:12-18` — only the other two occurrences were stale.
- Dependencies: `RealtimeBattleRuntime.ts:127-130,370-373` → `:152-154,166-168,527-529` (grepped `stepMovement`/`blockers:` directly).
- Done-criteria #1 (diagonal no-boost): `MovementSystem.test.ts:45,169` → `:48,172` (the `it(` lines for the normalizeVector diagonal test and the stepMovement equal-distance test).
- Done-criteria #2 (sub-deadzone): `:55,74` → `:59,78` (the actual `expect(...)` lines).
- Done-criteria #3 (displacement formula): `:117` → `:125` (`expect(player.position.x).toBeCloseTo(700)`).
- Done-criteria #4 (arena bounds): `:135` → `:143`.
- Done-criteria #5 (dead/hitstun blocks movement): `:143,151` → `:150-151,156`.
- Done-criteria #6 (overlap push-out incl. zero-distance) and the matching Skyrim-scar Test-for-us citation: `:96,101,106,156` → `:101,106,113`.
- Doom-scar Test-for-us citation: same `:45,169` → `:48,172` fix as #1 (duplicate reference, same underlying tests).
- Revision-note velocity-recompute citation: `MovementSystem.ts:108-109` → `:112`.

Untouched because they already matched live code on read-back: `MovementSystem.ts:15` (`INPUT_DEADZONE = 0.12`), `MovementSystem.ts:108-135` (sub-step loop range), `MovementSystem.test.ts:232-241` and `:243-255` (the two large-deltaMs/multi-blocker scar tests), `EnemyAISystem.ts:12-18` in the Dependencies section.

## Substance flags (NOT edited — citation-accuracy dispatch only)

- **Dependencies gap**: `AllyAISystem.ts:37` also calls `stepMovement` directly, same pattern as `EnemyAISystem.ts`. The contract's Dependencies section names only `EnemyAISystem.ts` as the upstream AI caller — `AllyAISystem` is a real second caller, undocumented. Not an ownership violation (correct use of the exported function), just a missing line in the doc's Dependencies list.
- **Done-criteria #2 test coverage**: the doc claims sub-deadzone input (`< 0.12` magnitude, i.e. small but nonzero) produces "no facing change." The cited test (`directionFromVector({x:0,y:0})` → null, line 78) only exercises the exact-zero vector, not a nonzero sub-threshold magnitude like `{x:0.05,y:-0.03}` (which the sibling `normalizeVector` test at line 59 does use). Zero is a degenerate case of sub-deadzone, so the claim isn't false, but the test doesn't fully pin the stated range.
- **Done-criteria #5 "zeroes velocity"**: the hitstun test (`:150-151`) and dead test (`:156`) only assert `moved === false` / position unchanged — neither asserts `entity.velocity` is actually zeroed on those paths (a different test, the no-input case, is the one that checks velocity-zeroing). Mechanism-correct per source (`isControlLocked` branch sets `entity.velocity = {x:0,y:0}` at `MovementSystem.ts:98`), just not directly pinned by those two specific tests.

## Verdict

Citation-rot fix complete: 12 stale file:line citations in `docs/agent-blueprint/01-movement-system.md` corrected against live source (`MovementSystem.ts`, `MovementSystem.test.ts`, `RealtimeBattleRuntime.ts`, `EnemyAISystem.ts`), all others confirmed still accurate on read-back. No design/scope claims changed. Two substance gaps flagged above for the owner, not edited.
