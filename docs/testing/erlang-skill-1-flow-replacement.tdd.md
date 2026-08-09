# Erlang Skill 1 Flow Replacement - TDD Evidence

- Operator: `HetCreep`
- Agent: `Codex / primary`
- Timestamp: `2026-08-09T12:48:39+07:00`
- Source plan: user instruction in the active task; no separate plan file.

## User journey

As the player controlling Erlang Shen, I want the supplied 16-frame lightning action to play as Skill 1 so that the in-game skill uses the approved visual sequence without missing or extra frames.

## Guarantees

| #   | What is guaranteed                                                              | Evidence                                                                                        | Type        | Result |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------- | ------ |
| 1   | Skill 1 exposes exactly frames 0-15 and plays at 14 fps                         | `src/game/battleSpriteSequences.test.ts`                                                        | Unit        | PASS   |
| 2   | Every referenced battle asset exists                                            | `src/game/realtimeBattle/battleAssets.test.ts`                                                  | Integration | PASS   |
| 3   | Skill 1 damage creates lightning at the hit enemy position                      | `src/game/realtimeBattle/RealtimeBattleRuntime.test.ts`                                         | Integration | PASS   |
| 4   | All 16 runtime files are unique 640x512 images with no alpha on the output edge | `public/characters/erlang-shen-skill-1-flow-preview/fixed-grid-metadata.json` and local QC scan | Asset QC    | PASS   |

## RED / GREEN evidence

- RED 1: focused test expected 16 frames and received 24.
- RED 2: timing assertion expected 14 fps and received 20 fps.
- RED 3: alpha regression expected a retained neutral midtone to be at least 220/255 opaque and received 121/255, reproducing the visible holes.
- GREEN: `npm.cmd test -- --run src/game/battleSpriteSequences.test.ts src/game/realtimeBattle/battleAssets.test.ts src/game/realtimeBattle/RealtimeBattleRuntime.test.ts` - 28/28 passed.
- Alpha GREEN: `python -m unittest tools/test_erlang_flow_skill_1_alpha.py` - 4/4 passed.
- Changed-file lint: `oxlint --deny-warnings` - passed.
- Typecheck: `npm.cmd run typecheck` - passed.
- Production build: `npm.cmd run build` - passed, 171 modules transformed.
- Localhost: the 16-frame transparent GIF loaded from the Vite server. The saved browser profile had no team character, so an interactive battle could not be entered through that profile; runtime behavior remains covered by the integration tests above.

## Known gap

The supplied sheet has an authored dark gradient background rather than a chroma-key color. One deterministic solid-matte formula removes it for all cells; no per-frame cleanup or normalization is used. Visual QC passed on a checkerboard preview without see-through holes in the character.
