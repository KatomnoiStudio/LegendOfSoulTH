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

## 2026-08-10 — Task #33: #104 dead-sprite regression test (QC-bounced once, then passed)

Wave-scoped, NOT this system's own file territory — `useDungeonStageBattle.ts` (P5 dungeon
orchestration) and `combatCameraConfig.ts` (presentation-only). Picked up per the belt's
deepest-knowledge routing, not because either file is in my owned Scope. Branch
`test/33-dungeon-dead-sprite-regression`, final `2ae8db7` (first attempt `4ce3d79` was bounced).

**The bounce, and the lesson worth keeping — an unfalsifiable test is worse than no test.**
My first version was named for the subscribe/listener mechanism but never observed it. The fake
runtime cached ONE frozen snapshot object per runtime, so `notify()` could never change what
`getSnapshot()` returned; the closing assertion re-checked a value the swap had already produced
and passed whether or not the listener ever fired. QC proved it by reverting the hook and getting
a green test — the named regression would have shipped covered-on-paper.

**Why it fooled me: I verified against the wrong revert.** I flipped only the `useCallback` DEPS
to `[orchestrator]` while keeping the `activeRuntime?.` bodies. That is a stale-closure variant
that does not exist in this repo's history, and it fails for a different reason, so I read a
failure as proof. The REAL pre-#104 body (confirmed via `git show c3c82aa`) was
`orchestrator?.getRuntime()?.subscribe/getSnapshot` — reading LIVE through the orchestrator. That
distinction is the whole bug: the live `getSnapshot` returns the NEW runtime's data on any
re-render, so **any assertion on the post-swap snapshot is satisfied by the broken code too**.
Only `subscribe` was actually broken — frozen on `[orchestrator]`, never re-run on a stage swap,
leaving `useSyncExternalStore` subscribed to stage 1's DISPOSED runtime whose listener Set was
cleared. Stage 2's per-frame `notify()` reached nobody; the battle UI froze for the whole stage.
**Standing rule for myself: when pinning a fix, revert to the EXACT historical body from git, not
a hand-reconstructed approximation — and make sure the assertion fails for the RIGHT reason.**

**Fix:** the fake now replaces its snapshot (`{tag, tick}`) inside `notify()` the way a real store
does (still one stable reference between notifies — `useSyncExternalStore` warns and spins
otherwise), and the closing assertion requires the ADVANCED tick, which only arrives if runtime
B's listener fired. Verified both directions against the exact pre-#104 bodies: reverted → FAILS
on the tick assertion (the earlier post-swap assertion still passes, which is precisely why it was
never a pin); restored → passes.

**Part 2 (cosmetic):** `COMBAT_CAMERA_V082_BASELINE` — my first comment claimed five fields still
feed `DEFAULT_COMBAT_CAMERA_CONFIG`; it reads FOUR (`pitchDeg`, `distance`, `minZoom`, `maxZoom`).
`heightOffset` is a hand-derived `1.264` literal in the live config, so it is dead to it in the
same way `targetCharacterScreenHeightRatio` is — both survive only for
`combatCameraFraming.test.ts`'s baseline spread. Corrected; no runtime value changed. (Doc-rot in
the very comment written to prevent doc-rot — count fields, don't eyeball them.)

**Verify:** typecheck, `oxlint --deny-warnings`, 911 tests (910 baseline + 1), build — all green.

**Process note:** this section had to be written TWICE. The first copy was an uncommitted edit in
the shared working copy and was wiped by another lane's tree-mutating git action (the hazard rule
21 was written for, before it was retired 2026-08-12 as unfollowed). Caretaker `MEMORY/` edits
made in the shared tree are not safe until committed — hand
them to main in the return rather than assuming they survive.
