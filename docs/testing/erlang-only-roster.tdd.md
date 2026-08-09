# Erlang-only Roster — TDD Evidence

- Operator: HetCreep
- Agent: Codex / primary
- Date: 2026-08-08
- Journey: The game exposes and loads only Erlang Shen while remaining playable in Lobby and real-time battle.

| Guarantee                                                    | Evidence                                       | Result |
| ------------------------------------------------------------ | ---------------------------------------------- | ------ |
| Roster contains only `spear-warrior`                         | `src/game/characters.test.ts`                  | PASS   |
| Enemy templates request only Erlang sprites                  | `src/game/characters.test.ts`                  | PASS   |
| Deployed battle sprite URLs exist after deletion             | `src/game/realtimeBattle/battleAssets.test.ts` | PASS   |
| Battle, AI, account and admin-command paths use Erlang       | Relevant six-file regression run, 45 tests     | PASS   |
| Changed TypeScript files are lint-clean                      | Targeted `npm run lint -- ...`                 | PASS   |
| Production application compiles and bundles                  | `npm run build`                                | PASS   |
| Localhost renders Erlang and loads no removed-model resource | Chrome runtime capture after reload            | PASS   |

RED evidence: both new roster tests initially failed because four playable characters and Pigsy/Tripitaka enemy sprites remained. GREEN evidence: the same tests passed after the roster, starter, enemy sprites, fallback, skill owner and fixtures were migrated to Erlang.

Asset removal: 505 Wukong/Monkey/Pigsy/Tripitaka files and two resulting empty directories were removed from the three character asset roots. Each resolved deletion target was checked to remain inside its intended asset root. All three roots contain zero non-Erlang character files afterward.

Full-suite note: 202 tests passed; three unrelated pre-existing timing-sensitive password/AuthModal tests failed under the full concurrent run. All task-related tests passed, targeted lint passed, and production build passed.
