# 21. Netcode / Networking System

> Category: PvP · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns wiring an already-simulated combat match (§6.3: "same 2.5D movement + L/R attack + 3 skills + ultimate as PvE") between two clients — input transport, state reconciliation/desync detection, match session lifecycle (connect → combat → result), and disconnect/forfeit handling for the 1v1 flow in §6.1 ("Select Hero → Queue → Match by Rank/MMR → 1v1 → Win/Lose → Rank update"). It also owns resolving §3.8.7's open question (opposing-player-hero hit-reaction tier: knockdown-immune like a normal mob, or knockdown-eligible like elite) since that's explicitly deferred to "alongside the PvP netcode model." It does **not** own: the combat simulation rules themselves (owned by `src/game/realtimeBattle/*` — `MovementSystem.ts`, `HitboxSystem.ts`, `DamageSystem.ts`, `ComboSystem.ts`, `SkillSystem.ts`, already built/tested for PvE and reused as-is per §6.3); matchmaking/queue/MMR-band logic (§6.2, itself deferred to P13); rank/Elo persistence semantics or currency (§8/economy); or PvE enemy AI.

### Inputs/Outputs

Nothing here exists in code yet, so this is the contract to design, built on existing adjacent types:

- **In (per-frame, local→remote):** the player's `MovementInput` / `SkillSlot` action (`src/game/realtimeBattle/playerInput.ts`, `skills.ts`) — reuse rather than invent a new input shape.
- **In (session):** match metadata from the Matchmaking system — `matchId`, both `playerId`s, both hero IDs (identifiers only). The Hero system separately supplies each hero's **stats normalized to the ranked baseline level/skill-level per §3.8.5** (see Dependencies) — normalization applies to the computed stat snapshot, not to the hero ID itself.
- **Out (local→UI, throttled):** `RealtimeBattleSnapshot` (`src/game/realtimeBattle/types.ts`) for each client's own `RealtimeBattleRuntime` — HUD-facing only. Per its own doc comment it is rebuilt "only at publish, not every simulated frame" (deliberately coarser than sim rate; HUD doesn't need 60Hz). **This is not a reconciliation payload.** Desync detection needs a separate, higher-frequency output this contract must design (e.g. a fixed-tick-rate state hash or authoritative position/HP diff) — `RealtimeBattleSnapshot` should not be repurposed for it as-is.
- **Out (session end):** a PvP match result — **not `RealtimeBattleResult` unmodified**. That type (`types.ts:116-128`) is entirely PvE-shaped — `stageId`, `stageName`, `defeatedEnemyIds`, `earnedExp`, `earnedGold`, `droppedItems`, sourced via `BattleResultAdapter.ts` from `RewardSystem`'s per-enemy/per-wave reward calc — with no field for `matchId`, opponent identity, or a two-sided win/loss. This contract must define a PvP-specific result (a new `RealtimePvPResult` type, or a wrapper carrying `matchId` + both `playerId`s + per-player outcome), sent server-side as the sole write path for §6.1's "Rank update," never trusted client-side.

### Dependencies

- **Combat/realtime-battle system** — hard dependency; reuses its simulation wholesale, does not reimplement it (§6.3). Note: the shared `RealtimeBattleEntity` type will need extending for PvP — `entityType` is currently `'player' | 'enemy' | 'boss'` with `characterId`/`enemyId` documented as mutually exclusive (player-only vs. enemy-only), with no representation for "an opposing player's hero." §3.8.7's resolution needs exactly that representation to hang a hit-reaction tier off of, so this extension likely requires coordination with the combat-core owner.
- **PvP/Matchmaking system** (§6.2, deferred P13) — hands off `matchId` + opponent + rank band.
- **Hero system** — supplies the §3.8.5-normalized hero stat snapshot at match start.
- **Backend system** (§8) — server-authority for rank/MMR write-back; §8 already states valuable data (rank, MMR) must be server-authoritative and flags Supabase in-repo today as "early seam... not full game authority yet."
- Feeds: Backend (rank table), and indirectly PvP's own rank/leaderboard surface.

### Done-criteria

1. Two independent client sessions complete a full 1v1 match (connect → combat → result) and agree on an identical PvP match result — proven by an automated two-client integration test, not manual play.
2. Under an injected ~150ms one-way latency + packet-loss test harness, both clients' final HP/state snapshots match within a stated tolerance — no silent desync.
3. Mid-match disconnect resolves per a written rule (e.g., forfeit-to-opponent after N seconds), covered by a test — never hangs or crashes either client.
4. §3.8.7 is explicitly resolved in code with a passing test asserting the chosen hit-reaction tier for an opposing player-hero.
5. Rank/MMR update after a match goes through the server-authority path only (§8) — verify no client write path exists to the rank table (RLS/API boundary check), so a modified client cannot self-report a win.

### World-class bar

**GGPO-style rollback netcode** (the library that originated this approach for fighting games, adopted industry-wide including Skullgirls) — the pattern worth borrowing is **client-side input prediction with authoritative-state reconciliation**, so the local player's inputs render instantly instead of waiting on round-trip confirmation. Caveat, stated plainly: literal frame-buffer rollback assumes a deterministic fixed-step sim and typically a low-latency P2P/UDP transport; this project's backend (§8) is Supabase, a WebSocket relay built for account/economy CRUD, not a dedicated low-latency game transport — so the transport-level GGPO technique likely won't port 1:1. Borrow the predict-then-reconcile principle, not the exact wire protocol.

### Stay-current note

The transport/backend choice (Supabase Realtime WebSocket relay vs. a dedicated low-latency channel such as WebRTC data channels) is the part most likely to need revisiting once real PvP latency numbers exist — §8 itself already flags Supabase as an "early seam," not proven for frame-tight combat sync.

### Low-maintenance-cost design

Reuse the existing, already-tested `realtimeBattle` combat core (`MovementSystem`/`HitboxSystem`/`DamageSystem`/`ComboSystem`/`SkillSystem`, each with its own `*.test.ts`) verbatim as the deterministic simulation both clients run locally; keep this system to input-transport + reconciliation only. Mirrors this repo's own resolution style for archetype gaps (§3.8.2/§3.8.3: "no new architecture... this is a data/tuning difference," "summons do not get a bespoke AI system") — no forked combat logic for PvP, and no premature "network combat interface" abstraction until a second real consumer exists beyond PvP (YAGNI).

### Known scars (real historical precedent)

- **Scar**: Street Fighter V let the two clients' local clocks drift apart during a match; the lagging client fed the other machine inputs from farther "in the past" — the SFVNetcodeFix README states this can reach "up to 15 frames" — forcing that machine into heavy one-sided rollback (visible as characters teleporting) while the lagging player experienced almost no rollback at all — an asymmetric desync that shipped undetected for years and was first fixed by a fan-made patch (AltimorTASDK's "SFVNetcodeFix," Jan 2020) before an official fix followed. — Source: [SFVNetcodeFix (GitHub)](https://github.com/AltimorTASDK/SFVNetcodeFix), [EGM: "Street Fighter V Has Finally Fixed Its Netcode—But a Modder Did It First"](https://egmnow.com/street-fighter-v-has-finally-fixed-its-netcode-but-a-modder-did-it-first/), [Siliconera coverage of the fan patch](https://www.siliconera.com/fan-made-street-fighter-5-netcode-fix-might-help-with-artificial-lag-and-rollback/)
- **Test-for-us**: In the ~150ms-latency test harness (Done-criteria #2), inject _asymmetric_ one-way latency instead of symmetric (e.g. client A effectively 50ms "ahead," client B 200ms "behind") and check whether this project's desync-detection output (the state-hash/diff this contract still has to design, per the Inputs/Outputs section) actually surfaces the asymmetry — or whether one client silently eats disproportionately more correction than the other with no signal reaching either client or a server-side monitor.

- **Scar**: Skullgirls' original GGPO integration dropped/lost input frames after a rollback occurred, an issue that persisted for years until a community-authored netcode improvement was adopted officially in a 2020 patch. — Source: [EventHubs: "Skullgirls receives an improved netcode update initially created by a fan of the game" (Apr 29, 2020)](https://www.eventhubs.com/news/2020/apr/29/skullgirls-receives-improved-netcode-update-initially-created-fan-game/), [EventHubs follow-up on full PC rollout (May 14, 2020)](https://www.eventhubs.com/news/2020/may/14/skullgirls-improved-netcode-update-and-wi-fi-indicator-are-now-available-all-players-pc/)
- **Test-for-us**: Force repeated back-to-back rollback/reconciliation events (bursty, out-of-order, or delayed remote inputs arriving every few frames) and verify no `MovementInput`/`SkillSlot` action is silently dropped or double-applied on either client during the correction — e.g. a skill press issued right as a rollback window opens should register exactly once, never zero or twice, in the final agreed state.

- **Scar**: GGPO's own developer documentation states that the local simulation — not the network layer — is what has to be deterministic for rollback to hold: "The game simulation must be fully deterministic. That is, for any given game state and inputs, advancing the game state by exactly 1 frame must result in identical game states for all players." It ships a dedicated `synctest` mode ("a special, single player session which is designed to find errors in your simulation's determinism," executing a 1-frame rollback every frame and diffing the two resulting states) purely to hunt for hidden simulation nondeterminism before it reaches real matches. — Source: [pond3r/ggpo README & DeveloperGuide (GitHub)](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md)
- **Test-for-us**: Run the identical recorded input sequence through two separate local instances of the reused `MovementSystem`/`HitboxSystem`/`DamageSystem`/`ComboSystem`/`SkillSystem` pipeline and diff the resulting state frame-by-frame — check whether it is actually bit-for-bit deterministic (RNG seeding, float ops, no reliance on wall-clock or frame-timing) end to end, since client-side prediction/reconciliation for PvP depends on that determinism and this project's own Done-criteria #2 only states an HP/state "tolerance," never a hard determinism guarantee.

This project's own spec — `docs/agent-blueprint/21-netcode-networking-system.md` and `docs/MASTER_BLUEPRINT_v3.0.md` — decides what "correct" looks like here; the exemplar above is used only to name failure-mode shapes worth testing for, not as a template for how to fix them.

---

**Revision note (verification pass, 2026-08-07):** Re-fetched the raw source files directly (not just article summaries) to check the two flagged items.

1. **Fabricated quote (GGPO scar) — fixed.** The draft attributed `"even the smallest divergence in simulation can lead to a completely different game outcome"` to GGPO's own docs, in quotation marks. `curl`'d both `pond3r/ggpo/master/doc/DeveloperGuide.md` and `README.md` directly and grepped for "divergence," "smallest," and "completely different" — zero matches in either file. That sentence does not exist in the source and has been removed. Replaced with the actual verbatim determinism sentence from `DeveloperGuide.md` ("The game simulation must be fully deterministic...") and the actual verbatim synctest description, both confirmed present by direct fetch of the raw file.
2. **"~15 frames" number (SFV scar) — re-verified, not dropped.** Fetched `raw.githubusercontent.com/AltimorTASDK/SFVNetcodeFix/master/README.md` directly (bypassing article summaries). It contains, verbatim: _"the other player will receive inputs from farther 'in the past' (up to 15 frames!) than they should."_ The figure is genuinely sourced — but it's a stated maximum ("up to 15"), not an approximation, so the wording changed from "~15 frames" to "up to 15 frames" to match the source precisely, and the in-line citation now points the number at the README (where it actually appears) rather than leaving it ambiguous against all three links, one of which (EGM) does not contain any frame count.

Everything else — SFVNetcodeFix/AltimorTASDK Jan 2020 fan patch preceding Capcom's official fix, and the Skullgirls dropped-input-during-rollback issue fixed via a community patch officially adopted in Apr/May 2020 — was already independently confirmed and is unchanged.
