# Legend of Soul TH — Agent Blueprint

> **Purpose**: `docs/MASTER_BLUEPRINT_v3.0.md` is the **product** source of truth — written for human design review, organized by product section (§1 identity, §2 core loop, …). This file is the **same locked decisions**, re-organized by **implementable system**, for an agent about to pick up implementation work. It does not introduce new decisions — every entry cross-references the section that actually locks it.
> **Status**: 28/28 systems have a full gold-standard work contract (scope / inputs-outputs / dependencies / done-criteria / world-class exemplar / stay-current note / low-maintenance-cost design) under `docs/agent-blueprint/`, generated 2026-08-07 via a 28-system ultracode workflow (gold-standard FILL + 2-seat adversarial verify + revise-on-flag; all 28 were revised at least once before passing).
> **Source of truth for content**: `docs/MASTER_BLUEPRINT_v3.0.md` always wins on any conflict — this file is a derived view, not a second locked-decision-record.

---

## Priority queue

Not build-order fantasy — grounded in `docs/MASTER_BLUEPRINT_v3.0.md` §10's LOCKED roadmap (P0–P15) + what's actually already in `src/` (verified via source-scan, 2026-08-07). 4 tiers: shipped → urgent/core → sequenced-later → decorative/optional.

### Tier 0 — Already shipped, maintain only

No queue slot needed — touch only on bug/extension.

- #1 Movement, #2 Combat Facing, #3 Basic Attack, #4 Skill/Cast, #6 Hit Reaction, #9 Enemy AI — real files: `MovementSystem.ts`, `combatFacing.ts`, `ComboSystem.ts`/`HitboxSystem.ts`, `SkillSystem.ts`, `DamageSystem.ts`, `EnemyAISystem.ts`.
- #18 Reward (`RewardSystem.ts`), #26 Control/Input (PR #24), #27 Error/Observability (SETTLED).
- #22 Currency (DB RPCs) — **badge caveat (found via ask-CB dogfood-methodology sweep, 2026-08-07):** its own work contract (`docs/agent-blueprint/22-currency-system.md:38`) admits zero test coverage on `earnGold`/`redeemCoupon`/`topUpGold`/`topUpGems` — the "maintain only" stamp was earned by a source-scan grep (file exists), never by a dogfood/red-team pass or by tests. Real gap, tracked under `.agents/rules/gold-standard-baseline.md`'s open component-test-coverage MUST-HAVE (AGENTS.md rule 10) — not fixed here, flagged so nobody trusts this badge more than it's earned.
- #25 Backend/Server-Authority — baseline shipped (auth/RLS/RPC); GROWS as Tier-1/2 systems land, not a one-time ship.
- #28 Social/Communication — World Chat server-authority migration implemented (Postgres/RLS/RPC/Realtime); production remains pending migration apply. Player-local block preference stays separate from message authority.

### Tier 1 — Urgent / core (roadmap P3–P8) — **stale as a whole, corrected 2026-08-09**: this tier read "verified NOT yet in `src/`" as of its 2026-08-07 source-scan; every bullet below has since shipped per `TASKS.md`. Kept as its own tier only pending a deliberate reclassification pass, not because the work remains undone.

- #5 Per-Move Property Schema — shipped, graduated 100% (`TASKS.md` row 13); #3/#4/#6/#7/#8 now consume the real shared `AttackDefinition`/`combatMoveSchema.ts` contract.
- #7 Effects System (heal/buff/cc/summon) — shipped, graduated 100% (`TASKS.md` row 14); `EffectsSystem.ts` implements heal/buff/cc/summon, `SkillSystem.ts` is no longer damage-only.
- #8 Skill-Targeting System — shipped, graduated 100% (`TASKS.md` row 15); `softTarget.ts` implements `targetLock:'nearest'`.
- #11 Boss System, #10 Elite/Mini-boss Tier — shipped, graduated 100% (`TASKS.md` rows 16-17); `EliteTierSystem.ts` and boss-phase attacks in `stageConfig.ts` exist with real coverage.
- #16 Stage/Adventure System, #17 Stage Variation System — shipped, graduated 100% (`TASKS.md` rows 18-19); `StageVariationSystem.ts` implements the 7 stage types wired into `stageConfig.ts`.
- #12 Hero Kit/Archetype System — 90% CI-green (`TASKS.md` row 20); 5+ heroes now ship (Production Batch 01, `src/game/heroes/`) so it is no longer single-hero-implicit — held at 90% pending Ring 0's real per-move numbers and a playtest graduation pass, not pending a second hero.
- #14 Progression System (Hero Level/Skill Level) — **shipped, 🟢 graduated 2026-08-08** (`TASKS.md` row 21 / DF21, 100%); this row previously said "zero implementation found," which is now wrong (stale claim corrected 2026-08-09, same pattern as the #13 fix immediately below).

### Tier 2 — Not urgent yet (sequenced later, real work, roadmap P9–P13)

- #23 Gacha System, #15 Star Ascension — **stale, corrected 2026-08-09**: this previously said 'zero implementation found,' which PR #97 and its Codex follow-up made wrong. Both are now 90% CI-green with live, atomic/idempotent server RPCs (`perform_gacha_pull`, `ascend_character_star`) — real production rate numbers shipped (a 5%/25%/70% pool on a 5-hero Standard Banner), not a deferred skeleton. See `TASKS.md` rows 22-23; both remain below 100% pending final production-migration verification, not pending a build.
- #13 Hero Collection (expansion) — **stale claim corrected 2026-08-09**: this row previously said "zero implementation," which is now wrong — `TASKS.md` row 24 shows it 100% graduated. **Roadmap-order divergence, item #12 of the blueprint-vs-code audit**: §10's LOCKED sequence puts P9 (Gacha/Star, this tier) before P10 (Hero Collection expansion) — it shipped in the reverse order. HetCreep's resolution: pause further Hero Collection expansion work, prioritize #23 Gacha and #15 Star Ascension next to restore the intended order before resuming #13.
- #20 PvP Power Normalization is implemented on its stacked PR; #21 now has a private room-code
  prototype with JWT Edge authority, private receive-only Realtime snapshots, prediction/reconcile,
  and reconnect/forfeit coverage. Production Supabase deployment/live two-client verification is
  still required before P12 graduation. #19 Matchmaking/Rank/MMR remains deferred to P13.

### Tier 3 — Decorative / optional, add on later

- #24 Monetization/Shop — category boundary locked (§7, 2026-08-08 — cosmetic/convenience only, never direct power), exact SKUs/pricing still TBD (P14); don't design the catalog ahead of that decision.
- Formal blueprint-lock for #28 Social (moderation policy, data-ownership doc) — nice-to-have paperwork, not gameplay-blocking since the feature already runs.

---

## System list (28)

### Combat core

1. **Movement System** — 2.5D plane, depth axis, joystick vector. Source: §3.1.
   → full work contract: [`docs/agent-blueprint/01-movement-system.md`](docs/agent-blueprint/01-movement-system.md)
2. **Combat Facing System** — L/R axis, derived from movement vector, keeps previous facing on vertical-only move. Source: §3.2, §3.6.1.
   → full work contract: [`docs/agent-blueprint/02-combat-facing-system.md`](docs/agent-blueprint/02-combat-facing-system.md)
3. **Basic Attack System** — multi-target hitbox, lunge (not magnet), 3-hit combo (window/reset/finisher/cancel). Source: §3.6.2, §3.6.11.
   → full work contract: [`docs/agent-blueprint/03-basic-attack-system.md`](docs/agent-blueprint/03-basic-attack-system.md)
4. **Skill/Cast System** — cast delay/wind-up, per-phase interrupt (`phaseOverrides`), `movementDuringCast`. Source: §3.6.4, §3.6.6, §3.6.7.
   → full work contract: [`docs/agent-blueprint/04-skill-cast-system.md`](docs/agent-blueprint/04-skill-cast-system.md)
5. **Per-Move Property Schema** — the shared data contract every attack/skill/enemy-move definition extends. Source: §3.6.7.
   → full work contract: [`docs/agent-blueprint/05-per-move-property-schema.md`](docs/agent-blueprint/05-per-move-property-schema.md)
6. **Hit Reaction System** — knockback + hitstun (normal), knockdown (elite/boss-only, per-move flag). Source: §3.6.5, §3.6.6.
   → full work contract: [`docs/agent-blueprint/06-hit-reaction-system.md`](docs/agent-blueprint/06-hit-reaction-system.md)
7. **Effects System** (non-damage) — `heal`/`buff`/`cc`/`summon` kinds, per-effect targeting. Source: §3.6.7, §3.8.
   → full work contract: [`docs/agent-blueprint/07-effects-system-non-damage.md`](docs/agent-blueprint/07-effects-system-non-damage.md)
8. **Skill-Targeting System** — `targetLock: 'nearest'` exception mechanism (Ultimate and future flagged skills only). Source: §3.6.1, §3.7.
   → full work contract: [`docs/agent-blueprint/08-skill-targeting-system.md`](docs/agent-blueprint/08-skill-targeting-system.md)

### Enemy / Boss

9. **Enemy AI System** — `Idle → Chase → Telegraph → AttackActive → Recovery`, `stageConfig`-driven per-enemy-type data. Source: §3.6.8.
   → full work contract: [`docs/agent-blueprint/09-enemy-ai-system.md`](docs/agent-blueprint/09-enemy-ai-system.md)
10. **Elite / Mini-boss Tier System** — tier between mob and boss, shares mob AI core, no phase system. Source: §3.8.3, §3.8.4.
    → full work contract: [`docs/agent-blueprint/10-elite-mini-boss-tier-system.md`](docs/agent-blueprint/10-elite-mini-boss-tier-system.md)
11. **Boss System** — phase transition (HP threshold, invulnerable window), telegraph feedback layers (ground marker / cast bar / tint / SFX). Source: §3.6.9, §3.6.8.
    → full work contract: [`docs/agent-blueprint/11-boss-system.md`](docs/agent-blueprint/11-boss-system.md)

### Hero / Progression

12. **Hero Kit / Archetype System** — per-hero kit file pattern; Support/Ranged/Summoner/Control archetype resolution. Source: §3.7, §3.8.
    → full work contract: [`docs/agent-blueprint/12-hero-kit-archetype-system.md`](docs/agent-blueprint/12-hero-kit-archetype-system.md)
13. **Hero Collection System** — gacha unlock, archetype-differentiation rule. Source: §4.1.
    → full work contract: [`docs/agent-blueprint/13-hero-collection-system.md`](docs/agent-blueprint/13-hero-collection-system.md)
14. **Progression System** — Hero Level → Star → Skill Level; EXP curve and skill-level scaling numbers deferred to P8. Source: §4.2.
    → full work contract: [`docs/agent-blueprint/14-progression-system.md`](docs/agent-blueprint/14-progression-system.md)
15. **Star Ascension System** — duplicate → star, power-gap bound (★6 ≤ 130% ★1); cost table deferred to P9. Source: §4.3.
    → full work contract: [`docs/agent-blueprint/15-star-ascension-system.md`](docs/agent-blueprint/15-star-ascension-system.md)

### Adventure

16. **Stage / Adventure System** — Chapter → Stage → Boss structure; stage-N+1 gating LOCKED skeleton (energy/stamina pool, 2026-08-08 — refill via gem, per-stage cost) — pool size/regen/cost numbers deferred to P7/P11. Source: §5.1.
    → full work contract: [`docs/agent-blueprint/16-stage-adventure-system.md`](docs/agent-blueprint/16-stage-adventure-system.md)
17. **Stage Variation System** — 7 stage types, each with a win/lose contract. Source: §5.2.
    → full work contract: [`docs/agent-blueprint/17-stage-variation-system.md`](docs/agent-blueprint/17-stage-variation-system.md)
18. **Reward System** — EXP/material/currency on clear. Already implemented (`RewardSystem.ts`). Source: §5.3.
    → full work contract: [`docs/agent-blueprint/18-reward-system.md`](docs/agent-blueprint/18-reward-system.md)

### PvP

19. **PvP / Ranked System** — Select → Queue → Match → 1v1 → Rank update; rank/MMR algorithm (Elo, 7 tiers, K=32) architecture-locked, queue-expansion thresholds deferred to P13. Source: §6.1, §6.2.
    → full work contract: [`docs/agent-blueprint/19-pvp-ranked-system.md`](docs/agent-blueprint/19-pvp-ranked-system.md)
20. **PvP Power Normalization** — Hero Level/Skill Level normalize to ranked baseline; only star tier creates the (bounded) gap. Source: §3.8.5.
    → full work contract: [`docs/agent-blueprint/20-pvp-power-normalization.md`](docs/agent-blueprint/20-pvp-power-normalization.md)
21. **Netcode / Networking System** — client-predicted + server-reconcile; direction locked, deferred to P12; PvP hit-reaction tier also deferred to P12. Source: §8, §3.8.7.
    → full work contract: [`docs/agent-blueprint/21-netcode-networking-system.md`](docs/agent-blueprint/21-netcode-networking-system.md)

### Economy

22. **Currency System** — gold (soft) / gems (premium) taxonomy. Already implemented at the DB layer (`earn_gold`/`redeem_coupon` RPCs). Source: §7.
    → full work contract: [`docs/agent-blueprint/22-currency-system.md`](docs/agent-blueprint/22-currency-system.md)
23. **Gacha System** — config-driven single system; rate/pity/cost numbers deferred to P9 (business-model call). Source: §7, §4.1.
    → full work contract: [`docs/agent-blueprint/23-gacha-system.md`](docs/agent-blueprint/23-gacha-system.md)
24. **Monetization / Shop System** — secondary monetization (skins, season pass, etc.) is TBD, no locked architecture yet. Source: §7.
    → full work contract: [`docs/agent-blueprint/24-monetization-shop-system.md`](docs/agent-blueprint/24-monetization-shop-system.md)

### Backend / Infra

25. **Backend / Server-Authority System** — Client → Game API → modules → database; valuable state is server-authoritative. Partially implemented (Supabase auth/RLS/RPC). **Contract note**: `src/data/accountRepository.ts` (local) and `accountRepository.supabase.ts` (production) hand-mirror each other with no shared `interface`/`satisfies` — nothing catches the two drifting when a new export is added to only one. Worth a typed contract when either file next changes. Source: §8.
    → full work contract: [`docs/agent-blueprint/25-backend-server-authority-system.md`](docs/agent-blueprint/25-backend-server-authority-system.md)
26. **Control / Input System** — mobile touch layout (joystick + action cluster), PC keybinds. Implemented (PR #24). Source: §3.3.
    → full work contract: [`docs/agent-blueprint/26-control-input-system.md`](docs/agent-blueprint/26-control-input-system.md)
27. **Error / Observability System** — global error boundary + relay (`src/lib/errors/{codes,reportError,globalErrorHandlers}.ts`, `GlobalErrorBanner`, `ErrorBoundary`), `silent`/`visible` tier contract, lint-enforced single choke point (`oxlint no-console` exempted only here). 19 call sites spanning combat/auth/audio/storage/lobby/bootstrap. Already governed as **SETTLED** in `.agents/rules/ecc/web/observability.md` (a reversed architectural decision, added 2026-08-07) but never cross-referenced from the product blueprint. **Gap**: zero coverage in `docs/MASTER_BLUEPRINT_v3.0.md`. Source: **NONE in master blueprint — governed instead by `.agents/rules/ecc/web/observability.md`**; flagged for HetCreep re: whether to cross-reference or leave as engineering-only.
    → full work contract: [`docs/agent-blueprint/27-error-observability-system.md`](docs/agent-blueprint/27-error-observability-system.md)

### Social

28. **Social / Communication System** — World Chat (`src/components/WorldChat/`, server-backed via `world_chat_messages` + RLS/RPC/Realtime) + Friends (`src/components/AddFriendModal/`). Data ownership locked in §7.5; player-local block preferences are not message authority. Source: §7.5, §8.
    → full work contract: [`docs/agent-blueprint/28-social-communication-system.md`](docs/agent-blueprint/28-social-communication-system.md)

---

## Known gaps (found via CoalBoard opinion-lane sweep, 2 rounds, 2026-08-07)

**Confirmed, acted on:**

- System #28 (Social/Communication) — round 1, 3 independently-converging citation-backed findings (live wired code, zero blueprint mention, no fold-in candidate).
- System #27 (Error/Observability) — round 2, upgraded from round 1's "infra-only, not urgent" bucket after deeper evidence: 19 call sites + an existing SETTLED governance doc (`.agents/rules/ecc/web/observability.md`) the blueprint never cross-references.
- Doc-order fix — round 2, 2 seats independently tripped on the same thing: Social's section sat physically before Backend/Infra despite numbering after it. Reordered + renumbered so document order matches system-number order.
- Contract note added under #25 (round 2) — `accountRepository.ts`/`.supabase.ts` hand-mirror with no shared typed interface. Not a missing system; a missing contract inside an existing one.
- **Exploration / Dialogue / NPC layer** (`src/game/exploration/`, `src/game/dialogue/`, `src/game/npc/`, `ExplorationScene`, `DialogueBox`) — **NOT a system entry.** Confirmed dead: `src/components/GameExplorationSession/GameExplorationSession.tsx` carries an explicit same-date disable notice ("ปิดไว้ชั่วคราว — โหมดสำรวจ (HetCreep สั่ง 2026-08-07)"), no entry point since PR #11. Recorded here so no agent mistakes it for unclaimed work — per `.agents/rules/master-blueprint-law.md`'s own rule ("conflicting code → CURRENT/LEGACY/SUPERSEDED/DEFERRED, document, never silently rewrite"), this is **DEFERRED**, not a system to implement.

**Lower-confidence / single-seat / not-yet-needed — not added, flag for HetCreep if worth a follow-up pass:**

- Lobby/menu shell + `GameFlowController` (screen-to-screen state machine) has no owning system — round 2 re-check found it weaker than round 1 assumed (near-single-caller once the dead exploration mode is excluded).
- Localization — hero names in §3.7's locked design table are Thai-first; zero i18n/locale system exists or is planned anywhere in either blueprint.
- `ItemsModal`/`src/game/items.ts` vs. §2.1's explicit CUT of "Loot RPG" — live code, ambiguous legacy-vs-intentional status (contested across seats).
- Toast/Notification System (`src/components/Toast/`) — round 2, live wired at app root, 9 consumers, zero blueprint mention; medium-confidence, no governance doc backing it (weaker than #27's evidence) — plausibly just a presentation detail of its callers rather than its own system.
- Shared seeded-RNG/determinism utility — round 2, two independently-converging seats (one grounded: `formulas.ts` and `RealtimeBattleRuntime.ts` use two different unseeded `Math.random()` patterns; one blind-generic corroborating on fairness/audit grounds). Matters once Gacha System (#23) actually starts — no seeded/auditable roll exists yet. Not added as a system now (nothing to seed yet); revisit when #23 work begins.
- Smaller/infra-only: audio (`AudioEngine.ts`), settings/a11y/performance, save/session persistence (`saveFile.ts`), asset loading, onboarding/tutorial flow — each real in code, each currently un-owned, none individually high-stakes.
- A long generic list from the blind seat (currency ledger, anti-cheat, validation/schema, config/feature-flag, event bus, test-fixture layer, moderation/rate-limiting, telemetry, scheduler, realtime-transport) — architecture patterns any online game eventually needs, but none grounded in this repo's actual code today (PvP/gacha/anti-cheat aren't built yet). Deliberately NOT scaffolded ahead of need — would be speculative infra for systems that don't exist. Revisit per-system when each is actually picked up.

**Round 2 read as near-dry** — new findings this round were smaller/more contract-level than round 1, and most of the blind seat's list is speculative-for-unbuilt-systems. Stopping here; re-run "ask CB" again later if HetCreep wants a round 3.

---

## Dogfood + fix loop, and graduation criterion

(Settled via CoalBoard opinion-lane, 4 seats, 2026-08-07 — full reasoning: seats converged independently on the same shape, including the blind seat.)

**What CI already covers — don't re-do it here:** `npm run ci` (typecheck + lint + vitest + build) already catches type errors, lint violations, pure-logic unit-test regressions (35 existing test files), and a property-fuzz harness (`fast-check`) for the pure-math layer. Dogfooding is for what CI structurally cannot reach: DOM composition/focus/event wiring across mounted components, and — for gameplay-feel systems only — whether it _feels_ right. Both are real: the project already shipped one composition bug this shape produces (`WukongAdventure.tsx:247-253` — an unguarded `window` keydown listener ate `w/a/s/d` typed into a coupon/friend-UID input field) and `MEMORY.md` #66 lists four more of the same class, none catchable by testing a component in isolation.

### Lab-entry order (cumulative composition scope — adopted 2026-08-07, HetCreep's explicit choice)

Composition scope per system is **cumulative, not Dependencies-only**: system at position _N_ is dogfooded composed with **every system already admitted at position 1..N-1**, in this fixed order (head = enters the lab first, tail = least urgent — directly follows the Priority-queue tiers above, Tier 0 → 1 → 2 → 3, roadmap-track order as the tie-break within each tier):

| Pos | System                                 | Tier |
| --- | -------------------------------------- | ---- |
| 1   | #26 Control/Input                      | 0    |
| 2   | #1 Movement                            | 0    |
| 3   | #2 Combat Facing                       | 0    |
| 4   | #3 Basic Attack                        | 0    |
| 5   | #4 Skill/Cast                          | 0    |
| 6   | #6 Hit Reaction                        | 0    |
| 7   | #9 Enemy AI                            | 0    |
| 8   | #18 Reward                             | 0    |
| 9   | #25 Backend/Server-Authority           | 0    |
| 10  | #22 Currency                           | 0    |
| 11  | #27 Error/Observability                | 0    |
| 12  | #28 Social/Communication               | 0    |
| 13  | #5 Per-Move Property Schema            | 1    |
| 14  | #7 Effects System                      | 1    |
| 15  | #8 Skill-Targeting System              | 1    |
| 16  | #11 Boss System                        | 1    |
| 17  | #10 Elite/Mini-boss Tier               | 1    |
| 18  | #16 Stage/Adventure System             | 1    |
| 19  | #17 Stage Variation System             | 1    |
| 20  | #12 Hero Kit/Archetype System          | 1    |
| 21  | #14 Progression System                 | 1    |
| 22  | #23 Gacha System                       | 2    |
| 23  | #15 Star Ascension System              | 2    |
| 24  | #13 Hero Collection System (expansion) | 2    |
| 25  | #19 PvP/Ranked System                  | 2    |
| 26  | #20 PvP Power Normalization            | 2    |
| 27  | #21 Netcode/Networking System          | 2    |
| 28  | #24 Monetization/Shop System           | 3    |

**Cost, named honestly:** this is **O(n²)** total dogfood-effort (≈1+2+...+28 = 406 system-equivalents of composed play by the time #28 graduates), not the cheaper O(n) Dependencies-scoped alternative (≈28-56 passes) that was the default before this instruction. Chosen deliberately — catches cross-system interactions a Dependencies section might forget to declare, at real cost late in the queue (position #28 replays composed with all 27 before it). If the cost bites in practice, the fallback is dropping back to Dependencies-scoped for Tier 2/3 positions only — not a silent revert, a named decision if/when it's made.

**The loop, per system, after its Done-criteria pass `npm run ci`:**

1. Before opening the browser, write the system's play-scenario checklist — not invented fresh, derived from the system's own already-written **Done-criteria** + **Dependencies** sections (`docs/agent-blueprint/NN-*.md`). Finite by construction: nothing to loop over once the fixed list is walked clean once.
2. `npm run dev`, actually play each scenario in the real running game **composed with every system already admitted at an earlier lab-entry position** (per the table above — not just this system's own Dependencies, not the system alone). Play it as a real session would (fast, sloppy, spam-input), not a scripted walkthrough.
3. Log every mismatch immediately, don't fix in place (fixing mid-test loses track of what's already validated). Triage after the pass into 3 bins: **correctness bug** → fix + add a regression test at the exact composition boundary the bug was found at (per the project's own already-adopted rule: "a test that pins a bug this project actually hit" is do-it-now, no need to ask) · **feel bug** (gameplay-feel systems only — timing/camera/feedback/input-buffer) → fix by hand, no test expected · **integration bug** → fix at the seam; if it reveals a contract another system should guarantee, the test belongs on that boundary, not this one.
4. `npm run ci` green again → repeat from step 2, re-playing only the scenarios touched by the fix, not the whole list.
5. **Outdim break-pass (mandatory before graduation, once — not every round).** Step 1's checklist is authored by whoever plays it, so it only proves "no bugs in the scenarios someone thought of." To cover what the author's own blind spot misses: hand the system's **bare mechanic description only** (no implementation, no "intended" play pattern, no house context — same BARE FRAME discipline as CB's `outdim` seat) to an independent tester — a fresh agent, or HetCreep deliberately playing "wrong" — with ONE instruction: **find any way to break it.** Sequence-break (do the steps out of intended order), soft-lock (reach a state with no valid action out), duplicate/negative-value exploit (gacha pull, currency, reward grant), spam/mash past a rate limit, combine with any earlier-admitted system in a way nothing anticipated. Log every break the same as step 3; every one found is a correctness bug, not a feel bug — fix + regression test, no exceptions.

**Graduation/dry signal:** ONE full clean pass through the whole scenario checklist (zero new log entries) + the outdim break-pass finds nothing new + Done-criteria satisfied + CI green. **Not** "loop until literally zero forever" — this project already has standing precedent for calling diminishing returns early (`MEMORY.md` #92, the design-gap CoalBoard loop's round 5: HetCreep called it "overkill, stop before dry" rather than force a 6th round) — the same right applies here. Bump to **two consecutive clean passes** only for boss/PvP/netcode-shaped systems (higher feel-risk, matches `gold-standard-baseline.md`'s existing pattern of extra scrutiny where a bug class already bit the project). Every found-and-fixed bug converts to a permanent regression test, so the dogfood-reachable bug pool is monotonically non-growing round over round — a bug found once cannot reappear as a "new" dogfood finding later, only as a CI-red commit, which is strictly cheaper to catch.

**The loop does NOT apply uniformly — differs by system type (converged independently across 3 of 4 seats):**

- **Gameplay-feel systems** (Movement, Facing, Basic Attack, Skill/Cast, Hit Reaction, Enemy AI, Elite/Mini-boss, Boss, eventual PvP) — full loop above, feel judged against the system's own contract-cited exemplar.
- **Backend/data/ledger systems** (Currency, Backend/Server-Authority, eventual Progression/Star Ascension numeric side) — the loop isn't "play and feel," it's **adversarial self-red-team**: try to cheat it (direct-insert bypassing RLS, out-of-taxonomy RPC call, grep for any mutation outside the one choke point) — `#25`'s own done-criteria already read like this checklist. A feel-pass here is theater; a skipped red-team pass here is the real risk (this is exactly where #22's currently-unearned badge above came from).
- **Not-yet-real / numbers-deferred systems** (Gacha rates, Star Ascension cost table, stage-difficulty numbers — P9/P11) — **explicit skip-state, not a forced early pass.** Dogfooding placeholder numbers bakes in false confidence that gets thrown away when the real numbers land later.
- **Already-governed-elsewhere systems** (#26 Control/Input, #27 Error/Observability — already SETTLED per their own governance doc) — no fresh solo loop for themselves; they still occupy their lab-entry position (1 and 11) as part of the cumulative composition scope for everything admitted after them.

**Known weak points of this design (named, not swept under the rug — from the blind seat's own self-critique, corroborated by the grounded seats):**

- The scenario checklist is authored by whoever plays it — a scenario nobody thought of never gets tested. **Partially mitigated by step 5's mandatory outdim break-pass** (added on HetCreep's direct instruction, 2026-08-07) — but only partially: an independent tester still starts from the same bare mechanic description, so a failure mode neither the checklist author nor the breaker can imagine is still unreachable by either.
- "Zero new findings" is gameable by fatigue/motivation, not just quality — no external check on testing rigor.
- A **graduated system can still break later** when a _future_ system's integration reveals a hidden interaction (e.g. Boss System graduated before Hero Kit #12's second hero existed; a knockback-immune buff later interacts with the boss's invulnerable window in a way nothing tested). The contract's Dependencies section scopes what graduation actually claimed — re-check it, don't assume "graduated" means "permanently bug-free"; when it happens, it's a normal new dogfood pass on the _older_ system, not evidence the loop failed.
- The correctness/feel/integration triage is a judgment call made by the same person under schedule pressure — a real bug can get waved off as "just feel" specifically to trigger the stop rule. No mechanical protection against this exists; it relies on the same honesty this project's own governance docs already assume of its agents.

**Empirically unverified, flag before relying on it:** whether the Browser-preview tool renders the R3F/WebGL battle canvas usably for a scripted dogfood pass, vs. a blank/broken headless capture — nobody's proven this end-to-end yet (matches the project's own admitted "no E2E/visual-regression tooling" gap, `gold-standard-baseline.md:115`). If it doesn't render meaningfully: the loop still holds as-is for every DOM/2D system (modals, lobby, chat, forms — most of the composition-bug evidence above is exactly this layer), and combat-visual systems degrade to "agent checks reachable state/DOM, HetCreep eyeballs the 3D canvas himself."

---

## Next

Work contracts are done for all 28 systems (see links above). Next is actual implementation — start from Tier 1 of the priority queue above, in whichever order HetCreep picks; not auto-sequenced.
