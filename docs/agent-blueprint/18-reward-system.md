# 18. Reward System

> Category: Adventure · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns pure reward _calculation_ for a completed real-time PvE battle: gold/EXP totals from defeated enemies + wave-clear bonus, deterministic material drop selection, and applying earned EXP to the account level and the lead hero's level (`src/game/realtimeBattle/RewardSystem.ts:14-128`). Deliberately does **not** own persistence (gold/items must flow through the ledgered `earnGold`/`grantItem` in `src/data/accountRepository.ts:631,761`, per file comment `RewardSystem.ts:11`), does not own gear/affix drops (blueprint §5.3, line 442: "No gear/affix drops in early phase"), does not own PvP rewards (§6 has no reward section — PvP is rank/MMR only), and does not own save-order orchestration (that lives in `src/components/LobbyBattleSession/LobbyBattleSession.tsx:46-90`).

### Inputs/Outputs

- `calculateBattleReward(state: RealtimeBattleState, outcome: 'victory'|'defeat'): BattleReward` where `BattleReward = { earnedExp: number; earnedGold: number; droppedItems: Array<{ itemId: string; quantity: number }> }` (`RewardSystem.ts:14-18,51-89`).
- `applyBattleExp(player: Player, earnedExp: number): Player` — mutates only `level/exp/expToNext` on the account and on the team's lead hero slot (`RewardSystem.ts:96-128`).
- Downstream consumer (`LobbyBattleSession.tsx:59-67`) feeds `earnedGold`/`droppedItems` into `onEarnGold(source: GoldSource, amount, refId?)` and `onGrantItem(itemId, quantity, source)`, both ledger calls returning `CurrencyResult`/`ItemResult` (`accountRepository.ts:627-651`).

### Dependencies

- **adventure** — consumes `RealtimeBattleState` (defeated enemies, wave index) from `createRealtimeBattle` and `getEnemyTemplate` from `stageConfig.ts` (`RewardSystem.ts:2-3`).
- **hero** — mutates `Player.ownedCharacters` (lead hero level/exp) (`RewardSystem.ts:109-125`).
- **economy** — feeds `earnGold`/`grantItem` ledger functions in `accountRepository.ts`, which enforce currency-ledger retention rules (AGENTS.md rule 14).
- **backend** — those ledger writes go through the Supabase-seam persistence layer (§8, `accountRepository.ts` save path).
- Not consumed by **combat** internals, **pvp**, or **social** — no references found.

### Done-criteria

1. `outcome === 'defeat'` always returns `{ earnedExp: 0, earnedGold: 0, droppedItems: [] }` — already pinned by `RewardSystem.test.ts:34-41`.
2. `calculateBattleReward` is pure: no `Math.random`/`Date.now` in the file (verified — none present), same `state` input always yields identical output.
3. `calculateBattleReward` never mutates its `state` argument (read-only `.find`/iteration only, `RewardSystem.ts:62-67`).
4. `applyBattleExp` never writes `currency` or `inventory` fields — only `level/exp/expToNext` on player and on the matching `ownedCharacters` slot.
5. `droppedItems` ids never resolve to an equipment/affix item — add a test asserting emitted ids stay within the current material/consumable set (`iron-essence`, `spirit-incense`, `healing-peach`) until §5.3's "early" gate lifts.
6. `LobbyBattleSession`'s gold→item→exp save sequence (lines 59-69) fires exactly once per battle even under duplicate `onComplete` calls — regression-test the `savedRef` guard (line 44,48-49).

### World-class bar

**Fire Emblem Heroes** (Intelligent Systems) — its story/paralogue maps give fixed, deterministic clear rewards (Orbs, SP, hero EXP) with no RNG loot roll, matching this project's explicit "no RNG, tests must be deterministic" design (`RewardSystem.ts:9`) and its early-phase "no gear drops" constraint. Pattern already followed here: FEH declares rewards per-map in flat data rather than a shared formula, and this file already does the same for every enemy that exists — `TEMPLATE_REWARD` (`RewardSystem.ts:28-32`) has an explicit entry for all 3 templates in `ENEMY_TEMPLATES` (`stageConfig.ts:78-123`: `shadow-soldier`, `demon-captain`, `spirit-guardian`), full 1:1 coverage. The HP-scaled fallback (`RewardSystem.ts:41-48`) is unreachable dead code for any template that exists today — it only activates if a future enemy template is added to `stageConfig.ts` without a matching `TEMPLATE_REWARD` entry. No action needed now; flag it as a checklist item when the next enemy template is added (add its `TEMPLATE_REWARD` row in the same PR, so the fallback formula stays permanently unreachable rather than becoming a live balance-drift path).

### Stay-current note

§5.3 is explicitly headed "(early)" and states no gear/affix drops "in early phase" (line 442) — when the later phase adds gear/affix, `BattleReward.droppedItems` and its all-materials assumption (done-criterion 5) will need revisiting; this is sourced churn, not speculative.

### Low-maintenance-cost design

Keep `RewardSystem.ts` a pure, storage-free module (already the stated intent, line 11) and keep reward numbers in flat `Record`/const tables (`TEMPLATE_REWARD`, `WAVE_CLEAR_GOLD/EXP`, `DEFAULT_GOLD/EXP_PER_ENEMY`, lines 20-32) rather than a per-enemy-type class or strategy interface — there is exactly one implementation (real-time PvE), so an interface would be premature abstraction. This mirrors the project's existing separation: calculation stays pure here, ledger/persistence stays in `accountRepository.ts`, and reward tuning is a data edit, not a code change.

Exemplar used: Fire Emblem Heroes (Intelligent Systems) — same exemplar already cited in docs/agent-blueprint/18-reward-system.md's "World-class bar" section

### Known scars (real historical precedent)

- **Scar**: FEH's "Restart" feature could be used to re-trigger the SP reward grant on a completed map by retrying/surrendering and re-attempting it, effectively doubling SP earned per cycle, until Intelligent Systems patched it in July 2018. — Source: Nintendo Everything, "Fire Emblem Heroes: new Tactics Drills map, SP exploit fixed" (nintendoeverything.com/fire-emblem-heroes-new-tactics-drills-map-sp-exploit-fixed/) — fetched directly and confirmed: "It was possible to double the amount of SP earned each time you used the Restart feature to attempt a map again. This has now been fixed," published 2018-07-19.
  **Test-for-us**: Take an already-completed `RealtimeBattleState` and drive it through `calculateBattleReward` + the `LobbyBattleSession` save sequence a second time via a _retry/re-entry_ path rather than a same-tick duplicate call — e.g. re-open or re-complete the same battle session, or re-fire `onComplete` after the `savedRef` guard has already reset for a new battle — and check whether `earnGold`/`grantItem`/`applyBattleExp` fire again for the same underlying clear. Done-criterion 6 only pins the "duplicate `onComplete` calls in the same session" shape; this is the "leave and come back to re-claim" shape, which is mechanically different.

- **Scar**: Fire Emblem Heroes' Aether Raids Rematch feature had a bug where, after a raid's Defense Results had already been computed and displayed to the player, actually attempting the Rematch battle could fail to start at all — "[p]roblems occur due to opponent data not being obtained correctly for Aether Raids Rematch battles, in which a battle does not start and the 'No opponents found.' error message appears after Defense Results are displayed" — leaving the player stuck between an outcome the game had already shown them and a battle session that never completes (and therefore never resolves any reward tied to completing it). Intelligent Systems patched this in the version 3.5.1 update (mid-May 2019) and compensated all players 10 Orbs and 100 Heroic Grails "to thank players for their patience." — Source: Nintendo Everything, "Fire Emblem Heroes update out now (version 3.5.1)" (nintendoeverything.com/fire-emblem-heroes-update-out-now-version-3-5-1/) — fetched directly, both the bug description and compensation amount quoted verbatim above; corroborated by Serenes Forest's bug-fix tag archive independently listing the same version and the same 10-Orbs-plus-100-Heroic-Grails compensation (serenesforest.net/tag/bug-fix/).
  **Test-for-us**: The failure shape here is "the game already showed the player a determined outcome, but the step that actually fires the completion/reward path never ran." Probe whether this codebase's terminal/victory UI state can render _without_ the reward hook having fired — e.g. force `RealtimeBattleState` into a win/terminal state and check whether it's possible for the victory screen to display (or for the component to re-render as "complete") via a path that bypasses or precedes the `onComplete` call into `calculateBattleReward`, such as a thrown exception in an effect right after the state transition, or a remount between the state reaching "won" and the effect that calls `onComplete` actually running. If the codebase can show "you won" without `earnGold`/`grantItem`/`applyBattleExp` ever having fired, that reproduces this scar's shape. This is distinct from the third scar below: that one is about a save/ledger call that starts but never resolves; this one is about the reward-triggering call never starting even though the outcome was already displayed.

- **Scar**: Fire Emblem Heroes' own official support FAQ documents "I completed a mission but didn't receive any points" and "I didn't receive my reward from the Arena" as standing, acknowledged issue classes — a completed, eligible in-game action not reliably resulting in a delivered reward, attributed by Nintendo's own troubleshooting copy to network/connection-timing gaps between client-side completion and server-side grant. — Source: official FEH support FAQ, faq.fire-emblem-heroes.com/hc/en-us/articles/4409432732825 and faq.fire-emblem-heroes.com/hc/en-us/articles/4409347195801 (content confirmed via search-indexed excerpts; direct fetch returned HTTP 403, so treat the specific wording as ⚠️ unverified beyond what's quoted in Nintendo's own article titles).
  **Test-for-us**: Break the seam between `calculateBattleReward` returning a value and the ledger actually committing it — e.g. have `LobbyBattleSession` receive a valid `BattleReward` but have the subsequent `onEarnGold`/`onGrantItem` calls into `accountRepository.ts` never resolve (simulated disconnect, app kill, or tab close mid-save) — then check what state the battle/session is left in once persistence resumes: is the reward silently lost, or does the retry path grant it a second time on top of a partial first grant?

This project's own spec — `docs/agent-blueprint/18-reward-system.md`'s done-criteria and `docs/MASTER_BLUEPRINT_v3.0.md` — decides what "correct" looks like here (e.g. the existing `savedRef` guard, the ledgered `earnGold`/`grantItem` functions, the "defeat always zero" rule); FEH's own fixes above are not being proposed as this project's fix, only as evidence of the failure shapes worth trying to reproduce against this codebase.

---

### Revision notes (why scar 2 changed)

The original scar 2 claimed an Aether Raids "Aether Consumed" formula bug (`10 + Lift/100`, an inverted-incentive where losing could out-earn a flawless win, "2018-11-20", 10-Orb compensation) sourced to a perfectly-nintendo.com URL. Re-fetching that URL failed with connection errors (domain unreachable), same as the original citation-check found, and this pass could not independently locate any source — primary or secondary — that confirms the specific formula, the inverted-incentive claim, or the 2018-11-20 date. Rather than ship that unconfirmed specific claim (even hedged), it's replaced above with a different Aether Raids bug that was directly fetched and confirmed against a live, working source (Nintendo Everything's version-3.5.1 update article, corroborated independently by Serenes Forest's bug-fix archive) — a real "outcome displayed but completion never fires" bug in the same feature area, which is a legitimate and citable failure shape for this project's reward system to probe, even though it's a different bug than what the original draft described.

Scar 1's uncited "corroborated by Serenes Forest Forums thread / GamePress community thread" mentions were dropped — no URLs were ever supplied for those specific threads, so they added unverifiable rhetorical weight to an already-solid citation without being independently checkable. The primary Nintendo Everything source for scar 1 was re-confirmed directly and stands on its own.

Scar 3 is unchanged — its self-hedge ("⚠️ unverified beyond what's quoted... HTTP 403") was already the correct honest treatment and needed no revision.

**DISCIPLINE-CHECK**: PASS. All three "Test-for-us" lines (including the rewritten scar 2 one) still only describe a failure _shape_ to reproduce/probe against this codebase's own functions (`calculateBattleReward`, `savedRef`, `onComplete`, `onEarnGold`/`onGrantItem`) and ask a yes/no question about what this codebase does — never "so do X like FEH did." Code-grounding of the technical claims (TEMPLATE_REWARD/WAVE_CLEAR_GOLD/WAVE_CLEAR_EXP in RewardSystem.ts:25-32, the dead HP-scaled fallback at RewardSystem.ts:41-48, the savedRef useRef guard in LobbyBattleSession.tsx:44,48-49 resetting on remount, and defeat-always-zero at RewardSystem.ts:55-57) was already verified in the prior pass and is untouched by this revision.
