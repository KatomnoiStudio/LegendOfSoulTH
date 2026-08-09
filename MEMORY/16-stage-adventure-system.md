# MEMORY/16-stage-adventure-system.md

Caretaker memory for system 16 (stage/adventure). Own: `REALTIME_STAGES` data catalog +
`RealtimeBattleStage`/`BossTemplate`/`ELITE_STAT_MULTIPLIER` symbols hosted in `stageConfig.ts`,
chapter/gating logic (`isStageUnlocked`, `getOrderedStages`, `getAdventureChapters`), `adventure/`
energy system, `StageSelect.tsx`. Never touch: combat resolution, `StageVariationSystem.ts` (#17),
`RewardSystem.ts` (#18) — sibling consumers of the same host file. QC'd by a spawned opus·xhigh seat
per `AGENT_REGISTRY.md` row 16.

## 2026-08-10 — onboarding + first dispatch (design-lock 2.b, citation rot 11.a)

**Onboarding finding:** the contract (`docs/agent-blueprint/16-stage-adventure-system.md`) was
written 2026-08-07 and had drifted hard from reality by 2026-08-10 — it described a "gap" (no
chapter type, 2 flat stages, no gating) that had already been closed in code: `chapterId`/`order`/
`isBoss` fields, 10 chapter-1 trial stages + 4 internal P5 test arenas, `isStageUnlocked` pure
predicate (tested), `StageSelect.tsx` surface, `StageVariationSystem.ts` (#17) all shipped. Several
file:line citations were stale too (`RealtimeBattleStage` moved from `:61-186` to `:219-265`,
`getRealtimeStage` call site in `createRealtimeBattle.ts` moved `:117`→`:253`).

**Owner ruling (design-lock 2.b):** chapter grouping + gating + StageSelect BLESSED retroactively
— docs corrected to match code, no code change needed for those three. The one genuinely-open item
was energy/stamina: `adventure/energySystem.ts` + `energyCost` data were built ahead of §5.1's still
-open owner call, and were live (consuming energy + blocking on afford) with nobody having decided
that's the final shape.

**Ship fix:** added `ENERGY_GATING_ENABLED = false` to `src/game/featureFlags.ts` (same pattern as
`PVP_BACKEND_DEPLOYED`). Guarded:

- `LobbyBattleSession.tsx` `handleSelectStage` — flag off skips `consumeStageEnergy`/
  `onPlayerChange` entirely, goes straight to `setStageId`.
- `StageSelect.tsx` — `affordable` short-circuits to `true` when flag off, so the "พลังงานไม่พอ"
  label and the disabled state never trigger.

Energy module + data stay in the tree, deliberately inert. Flip only when the owner locks §5.1 —
and even then, the Stay-current note in the contract flags that a client-only energy counter is
cheatable while Backend/Server-Authority (#25) is still an early seam; that's a second gate on top
of the flag flip, not implied by it.

**Test changes:** `LobbyBattleSession.test.tsx` "Exit Early" test previously asserted
`onPlayerChange` called once ("energy only"); with the flag off that call no longer fires, so the
assertion changed to `not.toHaveBeenCalled()` — comment updated to explain why. Added one new
pinning test asserting stage entry doesn't call `onPlayerChange` at all while the flag is off. No
other tests needed changes — `StageSelect.test.tsx`/`stageConfig.test.ts` already used full-energy
fixtures so they weren't exercising the blocked path either way.

**Docs:** contract corrected in place (Scope/Inputs-Outputs/Done-criteria/Stay-current sections) —
stale "Gap" language replaced with "BLESSED (was Gap)", stale citations fixed, new Energy section
added naming the flag and the reason it's off.

**Verify:** touched tests green (6 files, 57 tests — extra +1 from the new pinning test), `npx tsc
-b` clean, `npx oxlint --deny-warnings` clean.

**Open for the owner:** §5.1's stamina-vs-clear-gate-only decision is still unmade — this caretaker
cannot make it (per contract's own Stay-current note, this is explicitly HetCreep's call, not a
default an agent picks). Flag stays off until that lands.

## 2026-08-10 — QC bounce on wave-1 (4 stale citations), reclaimed and verified

Wave-1 energy-flag dispatch passed QC on code, failed on docs: my own edits to
`LobbyBattleSession.tsx`/`StageSelect.tsx` (adding `ENERGY_GATING_ENABLED` import/checks) shifted
line numbers out from under citations I'd just written in the same dispatch — `stageConfig.ts:881`
level was fine (unedited file) but `LobbyBattleSession.tsx:176`→`182`, `StageSelect.tsx:102`→`103`
both drifted by exactly the lines I inserted. Separately, the `trial_cleared_${stageId}` WRITE
citation was flat wrong — pointed at `LobbyBattleSession.tsx` (zero occurrences) instead of the
real writer, `lobbyBattleRewardPipeline.ts:130` (system #18's file). Fixed by main as emergency
fallback while this caretaker was down; verified line-by-line against current source 2026-08-10,
all 4 correct — adopted as-is.

**Lessons:**

- **Citations into a file you're editing must be re-derived AFTER the edit lands, not written
  against the pre-edit mental model.** Any insertion above a cited line invalidates that citation.
  Re-grep/re-read the target line post-edit before putting it in the contract, every time — don't
  trust the line number I had in mind while writing the diff.
- **The clear-flag producer (`trial_cleared_${stageId}` write) lives in `lobbyBattleRewardPipeline.ts`
  (system #18), not in this system's own files** — a real cross-system seam. This system only
  consumes the flag (`isStageUnlocked`, `StageSelect.tsx`, `useRealtimeBattle.ts`). Expect to hit
  this seam again on any future gating change — the write site is not mine to move, only to cite
  correctly.
