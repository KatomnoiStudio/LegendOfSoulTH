# 16. Stage / Adventure System

> Category: Adventure · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns the stage **data catalog** and, once built, chapter→stage progression/gating: the `RealtimeBattleStage` records (id, dimensions, spawns, wave composition, background/music assets — `src/game/realtimeBattle/stageConfig.ts:61-186`) and the "pick one hero, no mid-stage switch" + sequential Chapter→Stage→Boss structure locked in §5.1. It does **not** own: in-battle combat resolution (Movement/AI/Combat systems consume `RealtimeBattleStage` via `getRealtimeStage`, `src/game/realtimeBattle/createRealtimeBattle.ts:117`), stage-type behavioral variation (Survival/Defend/Chase/Hazard — System #17, §5.2, not yet implemented), or reward computation (System #18, `RewardSystem.ts`, already implemented and out of scope here).

### Inputs/Outputs

- In: `stageId: string`, `player: Player` (for team/spawn context).
- Out: `getRealtimeStage(stageId): RealtimeBattleStage | null` → `{ id, name, width, height, playerSpawn: Vec2, enemySpawns: Vec2[], waves: BattleWaveDefinition[], backgroundAsset?, musicAsset? }` (`stageConfig.ts:61-76`), consumed to build `RealtimeBattleState`.
- **Gap**: no Chapter type exists — `REALTIME_STAGES` is a flat `Record<string, RealtimeBattleStage>` with two entries (`trial-01`, `trial-02`, `stageConfig.ts:140-186`), no `chapterId` field, no gating check on lookup (any string reaches `getRealtimeStage`). A clear flag is written (`trial_cleared_${stageId}` into `player.progress.flags`, `src/components/LobbyBattleSession/LobbyBattleSession.tsx:85`) but never read back to gate anything.

### Dependencies

Feeds Combat/Enemy AI systems (`createRealtimeBattle.ts` consumes the stage record), feeds Progression System #14 (`applyBattleExp`). Depends on Hero/Roster (lead-hero resolution from `player.teamSlots`) and Backend/Server-Authority System #25 for any persisted unlock/gating state (`progress.flags` currently saved through `onPlayerChange` → account repository, which per §8/AGENT_BLUEPRINT #25 is "early seam, not full game authority"). Note: Reward System #18 (`RewardSystem.ts`) does **not** consume this system's stage records directly — it imports only `getEnemyTemplate` from `stageConfig.ts` and derives rewards from `RealtimeBattleState` fields (`state.defeatedEnemyIds`, `state.enemies`, `state.currentWaveIndex`), never `stage.id` or `stage.waves` — so it's a sibling consumer of the same config file, not a downstream dependent of the stage-catalog data this system owns.

### Done-criteria

- `REALTIME_STAGES` entries carry a chapter grouping (e.g. `chapterId`) with at least one full chapter (N stages + a boss-tagged stage) — today it's 2 ungrouped stages, no boss tag exists.
- A stage-select surface lists only unlocked stages; today the lobby hardcodes `LOBBY_BATTLE_STAGE_ID = 'trial-01'` (`LobbyBattleSession.tsx:20`) and `trial-02` is reachable only through the disabled exploration/dialogue path (dead per `AGENT_BLUEPRINT.md:102`).
- Whatever gating HetCreep locks (clear-gate only, or +stamina per §5.1 line 419's open call) rejects a locked `stageId` before `BattleScene` mounts, and is unit-testable as a pure predicate over `Player.progress.flags`.
- Existing pins stay green: `RealtimeBattleRuntime.test.ts`, `MovementSystem.test.ts`, `EnemyHealthBar.test.tsx`, `battleAssets.test.ts` (its asset-presence check at `battleAssets.test.ts:64` already iterates `Object.values(REALTIME_STAGES)`, so new stages get auto-covered).
- New stages/chapters added only as data-table entries — zero new per-stage code branches, consistent with the ban already documented in-file (`stageConfig.ts:6-9`).

### World-class bar

**Honkai Impact 3rd** (miHoYo) — its chapter overworld map: sequential story-node unlock with a visual type badge (Story/Elite/Boss) per node. ⚠️ unverified: whether that badge is rendered directly off node metadata versus hand-authored per node is an implementation detail of closed-source client code with no public source to check — treat that specific mechanism as a plausible guess, not a confirmed fact. What's directly checkable in this repo: the stage table already carries everything a badge/preview needs (wave composition, enemy templates) — a stage-select screen should render that badge/preview straight from `RealtimeBattleStage`/`BattleWaveDefinition` data, not hand-author a preview per stage. That data-driven-render goal is the actual bar to hit regardless of how Honkai itself implements it.

### Stay-current note

The stage-N+1 gating mechanism is explicitly OPEN per §5.1 (line 419) pending a HetCreep product-philosophy call — and if it lands as a stamina/energy system, it can't be a client-only counter once built, since Backend/Server-Authority (#25) is still "early seam, not full game authority" (§8) and a client-side timer is trivially cheatable; that call should wait for #25 to mature or ship gating as clear-gate-only until then.

### Low-maintenance-cost design

Keep the single-source-of-truth data table (`REALTIME_STAGES` in `stageConfig.ts`) as the only place stage/chapter facts live — matches the config-driven pattern already locked (as a doc decision, not yet as existing code — no gacha/ascension/skill-scaling implementation exists in the repo yet) for gacha rates, star ascension, and skill-level scaling (`docs/MASTER_BLUEPRINT_v3.0.md:421`). When gating is built, implement it as a pure predicate over the `progress.flags` map that's already being written (`LobbyBattleSession.tsx:85`) rather than standing up a new unlock-graph table/abstraction — YAGNI for a 2-stage catalog; add structure only when the chapter count actually demands it.

### Known scars (real historical precedent)

- **Scar**: A story-chapter bug left Story Stage 12-14 permanently uncompletable — the game's official account announced the fix and compensated every Captain Lv.30+ with 60 Crystals for the inconvenience. — Source: Honkai Impact 3rd official account, bugfix/compensation announcement, Nov 2019 (mirrored on X: https://x.com/HonkaiImpact3rd/status/1193847110757564416 and Facebook: https://m.facebook.com/HonkaiImpact3rd/photos/bugfix-for-story-chapter-xiidear-captains-the-bug-that-prevented-story-stage-12-/509849082959044/ — verified via two independent search-result snippets quoting the same official post text; direct fetch of both pages was blocked by an anti-bot/paywall response, so treat the exact wording as ⚠️ search-snippet-sourced, not page-verified, though the incident itself is corroborated by both accounts and its own compensation event).
  **Test-for-us**: Try to reach a state where a stage's completion never gets recorded — e.g. disconnect or force-navigate away mid-final-wave, kill the tab right as the last enemy dies, or clear a stage through an unusual path — then check whether `trial_cleared_${stageId}` in `player.progress.flags` (`LobbyBattleSession.tsx:85`) actually gets written. If it silently doesn't, and gating later reads that flag (per the Done-criteria's planned predicate), the next stage/chapter becomes permanently unreachable with no error surfaced.

- **Scar**: Version 5.2 patch notes list a fix for the [Daily Side] stage in Chapter 18 sometimes returning a "stage does not exist" error when selected. — Source: Honkai Impact 3 Wiki (Fandom), "Version 5.2" patch-notes page, https://honkaiimpact3.fandom.com/wiki/Version_5.2 (surfaced via search-result summary; direct page fetch returned HTTP 402, so treat as ⚠️ search-snippet-sourced pending a manual re-check of the live page).
  **Test-for-us**: Once `REALTIME_STAGES` grows past 2 entries and gets a `chapterId` grouping, try looking up every stageId the stage-select surface can produce (including ones from a stale/cached chapter list, or ones assembled from chapter+index rather than copy-pasted) against `getRealtimeStage(stageId)` and confirm none of them resolve to `null` for a stage the UI just showed as unlocked/selectable.

- **Scar**: Version 8.0 patch notes list a fix for the "Data Storm" stage (Main Story Chapters XXIX-XXXI) sometimes failing to start when the player had no ELFs deployed — a stage that silently didn't launch under a specific pre-battle team-state condition. — Source: Honkai Impact 3 Wiki (Fandom), "Version 8.0" patch-notes page, https://honkaiimpact3.fandom.com/wiki/Version_8.0 (surfaced via search-result summary; direct fetch returned HTTP 402, so treat as ⚠️ search-snippet-sourced pending a manual re-check of the live page).
  **Test-for-us**: Try entering a stage with edge-case team/spawn state — an incomplete `player.teamSlots`, a lead-hero that fails to resolve, or a wave/enemy-spawn combination from `BattleWaveDefinition` that the data table has never actually exercised — and confirm `createRealtimeBattle.ts`/`RealtimeBattleState` either starts correctly or fails loudly, rather than the stage quietly never launching.

This project's own spec (`docs/MASTER_BLUEPRINT_v3.0.md`, `docs/agent-blueprint/16-stage-adventure-system.md`) decides what "correct" looks like here — these scars only name the shape of failure to go try to reproduce, not how Honkai Impact 3rd's team happened to fix theirs.
