# Wukong v4 animation refresh — TDD evidence

> Operator: HetCreep · Agent: Codex (`/root`, Ring-1 maker) · 2026-08-11

## Contract

- Wukong uses the accepted 12-frame Idle, 6-frame Normal Attack 1, and 20-frame Run sets.
- Idle plays at 300 ms/frame; Run completes one cycle in 2.04 seconds.
- Battle Normal Attack 1 keeps its existing 16 fps gameplay-facing timing.
- Right-master Wukong frames mirror only when `combatFacing === 'left'`.
- Idle, attack, and run preserve one visible stature and one ground-foot anchor despite using
  different source canvases.

## RED

`npm.cmd test -- src/game/battleSpriteSequences.test.ts --reporter=verbose`

- 4/4 new tests failed against the old implementation: Idle was 24 instead of 12 frames,
  Normal Attack 1 referenced `monkey-attack-new`, Run was 8 instead of 20 frames, and the
  mirror resolver did not exist.

`npm.cmd test -- src/game/realtimeBattle/entitySpritePresentation.test.ts --reporter=verbose`

- The new cross-family stature/foot-anchor test failed because unregistered Wukong v4 sheets
  fell through to the 396×376 default calibration.

## GREEN

`npm.cmd test -- src/game/battleSpriteSequences.test.ts src/game/realtimeBattle/entitySpritePresentation.test.ts src/game/realtimeBattle/battleAssets.test.ts --reporter=verbose`

- 3 files passed, 18 tests passed.
- Asset-path coverage confirms every referenced battle frame exists and is WebP.
- Alpha-scanned calibrations pin the three source families: Idle 640×512, Attack 640×640,
  Run 512×512.

## Browser QA

A temporary, uncommitted localhost harness rendered the generated WebP files on a dark game-like
background. Idle, Run, and Normal Attack 1 were visually present; left flip resolved to
`matrix(-1, 0, 0, 1, 0, 0)`; the QA page produced no console errors. The harness and placeholder
local env were removed afterward. Full authenticated in-game navigation was not claimed because
this worktree has no valid private `.env.local`; runtime wiring is covered by the tests above.

## Full verification

- TypeScript (app + Edge) passed; `oxlint --deny-warnings` passed.
- Full Vitest passed in serial mode: 120/120 files, 1095/1095 tests. Parallel attempts hit only
  PGLite `beforeAll` resource-contention timeouts; affected suites passed isolated and serially.
- Deno Edge tests passed 2/2.
- Production build passed; image pipeline reported all 393 PNG inputs current.
- Bundle-size gate passed 11/11 files.
