# MEMORY/19-pvp-ranked-system.md

Caretaker memory for system 19 (PvP / ranked). Own: ranked 1v1 loop end-to-end — hero select,
matchmaking queue (rank/MMR band matching + expansion), win/lose resolution, rank/MMR update.
Currently unbuilt (P13), design/docs only. Never touch: combat tick/hit/damage engine
(`src/game/realtimeBattle/*`), hero/star math, `accountRepository.ts` persistence pattern, PvE
stage content, `#20`'s normalization delivery (`rankedNormalization.ts` — consumed, not owned),
`#21`'s private-room netcode (`PvPAuthorityEngine.ts`/`PvPAuthorityService.ts`/
`pvpRoomRepository.supabase.ts`, gated `PVP_BACKEND_DEPLOYED=false`). QC'd by a spawned opus·xhigh
seat per `AGENT_REGISTRY.md` row 19; ~7 seats expected at P13 build.

## 2026-08-10 — onboarding + first dispatch (design-lock 1.a, citation correction)

**Onboarding finding:** contract (`docs/agent-blueprint/19-pvp-ranked-system.md`) claimed `#21`'s
P12 private-room prototype "never calls `rankedNormalization.ts`." False — live code check found
`supabase/functions/pvp-authority/index.ts:10` imports `createRankedPlayerEntity`, `:195-196` call
it for both host and guest entities. The "never persists rank/MMR" half of the same sentence was
verified true (no `mmr`/`rank`/`rankDelta` read or write in that file).

**Owner ruling (design-lock 1.a):** the call is sanctioned — normalizing combatant stats for a
fight and persisting a ranked outcome are different surfaces; only the latter (queue/band/MMR
write) is this system's still-open P13 scope. `#21` normalizing through `#20` doesn't relax any of
this contract's done-criteria.

**Fix:** corrected the Scope paragraph's false claim, cited the real call site
(`supabase/functions/pvp-authority/index.ts:10,195-196`). Design-fork 4.b's own ruling (the room/
netcode _shape_ is scope drift, stays gated) was already accurate and left untouched.

**Citation re-derive (full Scope paragraph, per lesson from wave 1 — [[16-stage-adventure-system]]
already hit this):**

| Citation                                                                         | Status                                                             | Fix                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `docs/agent-blueprint/20-pvp-power-normalization.md`                             | live                                                               | —                                                      |
| `src/game/pvp/rankedNormalization.ts` (83 lines + 109-line test)                 | live                                                               | —                                                      |
| PR #95                                                                           | confirmed (`git log`: "Merge PR #95: P12 PvP power normalization") | —                                                      |
| MEMORY.md item 170                                                               | confirmed, text matches                                            | —                                                      |
| TASKS.md row 26 at 90%                                                           | confirmed                                                          | —                                                      |
| `docs/MASTER_BLUEPRINT_v3.0.md:454-460` (P13 mention)                            | **stale** — now points at §6.0 (inserted 2026-08-10, +19 lines)    | → `:471-482` (§6.1 Mode + §6.2 Matchmaking philosophy) |
| roadmap tag table `:530-531`                                                     | **stale** — same §6.0 shift                                        | → `:553` (P13 row)                                     |
| MEMORY.md item 173                                                               | confirmed, quote exact                                             | —                                                      |
| `PvPAuthorityEngine.ts`/`PvPAuthorityService.ts`/`pvpRoomRepository.supabase.ts` | all exist                                                          | —                                                      |
| Design-fork 4.b, `docs/MASTER_BLUEPRINT_v3.0.md` §6.0                            | live, section header (doesn't drift like bare line numbers)        | —                                                      |
| `PVP_BACKEND_DEPLOYED = false`                                                   | confirmed `src/game/featureFlags.ts:18`                            | —                                                      |

**Lesson (recurs from #16):** a doc's own bare line-number citations rot silently when an earlier,
unrelated edit inserts lines above them elsewhere in the same target file — section-header
citations (`§6.0`) survive that; bare `:NNN-NNN` ranges don't. Re-derive every citation in a
touched paragraph, not just the one the dispatch was about.

**Verify:** doc-only dispatch, no code/test touched. All citations re-checked against live
source/git this session (not trusted from the contract's prior text).
