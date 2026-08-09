# Erlang Normal Attack Preview Cycle — TDD Evidence

- Operator: HetCreep
- Agent: Codex / primary
- Date: 2026-08-08
- Journey: The operator can press the Lobby preview button repeatedly to inspect Attack 1, Attack 2, and Attack 3 without waiting for random selection.

| Guarantee                                              | Test or command                                                                                                                              | Type        | Result                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| Preview requests cycle `1,2,3,1,2,3`                   | `npm test -- --run src/game/battleSpriteSequences.test.ts`                                                                                   | Unit        | PASS (6 tests)                                                                  |
| Changed source has no lint findings                    | `npm run lint -- src/game/battleSpriteSequences.ts src/game/battleSpriteSequences.test.ts src/components/AdventureScene/WukongAdventure.tsx` | Static      | PASS                                                                            |
| Application compiles and bundles                       | `npm run build`                                                                                                                              | Integration | PASS                                                                            |
| Real Lobby button renders all three animation families | Chrome localhost runtime capture                                                                                                             | Browser     | PASS (`attack-2`, `attack-3`, `attack-1` from the tab's current cycle position) |

RED evidence: the new cycle test initially failed with `TypeError: undefined is not a function` before the selector existed. GREEN evidence: the same target passed after implementing and wiring the deterministic selector. No checkpoint commits were created because the shared worktree contains extensive unrelated user changes that must not be bundled into this task.

Known gap: full-project coverage remains below the skill's general 80% target; this change's pure selector branches and user-visible browser path are directly covered.
