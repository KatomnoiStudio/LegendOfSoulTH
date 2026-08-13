# Fork design locks — archived copy (round 0, 2026-08-07 onward)

> **Why this file exists.** These decisions were authoritative only as GitHub issue
> comments on `nustanakritwithai/GameTurnBase`, a personal account belonging to a
> contributor who left the project on 2026-08-13. That repository is outside Katomnoi
> Studio's control and can be deleted, archived or transferred at any time, and
> `docs/MASTER_BLUEPRINT_v3.0.md` cites issue #47 by URL as its source of authority.
> Archived here so the locks survive the account.
>
> **This is a copy, not the record of a decision made here.** Nothing in it was decided
> by this repository; it is reproduced verbatim. Where a lock has since been superseded,
> the superseding document wins — notably `docs/GACHA-RATE-DESIGN-LOCK.md` for anything
> about rates, and §3.8.3 of the blueprint for summon AI (design-lock 4.a, 2026-08-13,
> which found that #47 said only "reuse spawn/entity pool" and that the blueprint had
> escalated it into "same state machine").

> Fetched 32 issues from `nustanakritwithai/GameTurnBase`.

---

## #19 — CONFLICT: CurrencyShopModal demo topup/gacha-style UI vs Master Blueprint premium one-time model

_closed · opened by `HetCreep` 2026-08-07T05:55:51Z · closed 2026-08-07T09:16:58Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` (PART 2.2, Business Model) + `docs/BLUEPRINT_GAP_ANALYSIS.md` section 6 -- both merged into `LegendofSoulTH/LegendOfSoulTH` master via PR #16.

**Locked product decision (HetCreep, 2026-08-07)**: the blueprint is now the enforced product spec -- premium one-time purchase, no real-money gacha. This is confirmed final, not a proposal.

**What ships today conflicts with that**: `src/components/CurrencyShopModal/CurrencyShopModal.tsx` + `src/data/accountRepository.ts`'s `GEM_PACKAGES`/`GOLD_PACKAGES` implement a top-up/IAP-style currency shop -- tiered gold/gem packages sold for real Thai Baht (e.g. `gem-small` = 60 gems for 30 THB, `gem-large` = 980 gems for 450 THB), always-succeeds demo checkout (no payment gateway wired), plus a coupon-redemption path (`redeemCoupon`). This is the shape of a gacha/live-service monetization UI, not a single premium purchase.

**Not fixed in this issue** -- per `master-blueprint-law.md`, a docs/governance PR classifies conflicts, it does not implement the fix. This issue exists so the conflict is tracked and does not get silently resolved by rewriting the blueprint to match the shipped code.

**Scope for whoever picks this up**: decide + implement how the actual monetization surface should look under a premium-one-time model (a single unlock purchase? cosmetic-only IAP? remove the tiered top-up UI entirely?) -- that product shape isn't specified by the blueprint beyond "premium one-time, no RM gacha," so it needs its own design pass, not just a mechanical strip-out.

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep, track 2/8 (business model).

### comment — `nustanakritwithai` · 2026-08-07T09:16:57Z

ปิดตาม HetCreep — issue นี้ใช้ถาม/คุยเท่านั้น ไม่ใช่ implementation backlog

**สรุปคำตอบที่มีแล้ว:**

- Blueprint v3 §7: monetization = Hero Gacha + star ascension (premium one-time ของ v1 **superseded**)
- `CurrencyShopModal` demo topup UI = LEGACY รอ redesign ตอน P14
- ยังไม่ตัดสินรูปร่าง shop สุดท้าย — บันทึกใน `docs/MASTER_BLUEPRINT_v3.0.md` + MEMORY.md

ไม่ต้อง track เป็น open issue ต่อ

### comment — `HetCreep` · 2026-08-07T10:37:32Z

**Resolved by Blueprint v3.0** (merged upstream `KatomnoiStudio/LegendOfSoulTH#19`, 2026-08-07). §7 Monetization locks **Hero Gacha + star ascension** as core, explicitly supersedes the old premium-one-time framing (`v1.0`), and says power must not be sold primarily via direct purchase. The existing `CurrencyShopModal` demo gacha-style UI is therefore the CORRECT direction going forward, not a conflict to resolve away — closing as resolved.

---

## #20 — PARTIAL/ABSENT: single-skill-per-hero cap and no soft-target assist vs blueprint PART 5/11

_closed · opened by `HetCreep` 2026-08-07T05:56:50Z · closed 2026-08-07T09:16:59Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` PART 5 (combat) + PART 11 (heroes) via PR #16. Track 3/8 of the blueprint gap-closure sweep.

**Verified against current code** (not just re-stating the original gap analysis):

1. **One skill slot per hero, no Ultimate.** `src/game/realtimeBattle/skills.ts`'s `REALTIME_CHARACTER_SKILLS` is a `Record<characterId, RealtimeSkillDefinition>` -- one entry, singular, not an array. Only `monkey-king` has an entry (`spinning-golden-staff`). Blueprint target is Skills 1-4 + Ultimate per hero. `src/components/BattleScene/BattleControls.tsx` exposes exactly Attack + Dash + Skill, no room for a 4-skill bar without a control/UI redesign too.

2. **No soft-target / target-assist system anywhere.** Grepped `src/game/realtimeBattle/**` and `src/components/BattleScene/**` for target-lock-shaped code (soft target, lock-on, target assist, nearest-enemy helpers) -- nothing. Player aims free-form via joystick/movement direction only; there's no assist that biases toward a nearby enemy.

**Not fixed here** -- per `master-blueprint-law.md`, classify only. Two separable pieces of work for whoever picks this up:

- Skill system: needs a data-shape change (`RealtimeSkillDefinition` -> array/map of up to 4 + one Ultimate-flagged entry per hero), new cooldown/UI slots in `BattleControls.tsx`, and content (skills for the other 2 existing heroes, which currently have zero skill entries at all -- not even a stub).
- Soft-target: a new aim-assist layer sitting between raw input and `MovementSystem`/`ComboSystem`'s attack direction -- needs its own design pass (assist strength, switching rules, controller vs touch parity) not just a mechanical addition.

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep.

### comment — `nustanakritwithai` · 2026-08-07T09:16:59Z

ปิดตาม HetCreep — issue ถาม/classify เท่านั้น

**คำตอบ:** ถูกต้อง — โค้ดปัจจุบัน skill เดียว + ไม่มี soft-target
**แผน:** Blueprint v3 P3 (Basic + 3 Skills + Ultimate) — track ใน roadmap P0–P15 ไม่ใช่ fork issue

---

## #21 — ABSENT: entity state machine missing Knockdown/GetUp/Ultimate states, no boss telegraph/phase system

_closed · opened by `HetCreep` 2026-08-07T05:57:25Z · closed 2026-08-07T09:17:00Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` PART 7 (state machine) + PART 16 (boss content) via PR #16. Track 4/8 of the blueprint gap-closure sweep.

**Verified against current code**:

1. **`EntityState` is 7 states**: `src/game/realtimeBattle/types.ts` line 33 -- `'idle' | 'walk' | 'attack' | 'skill' | 'dash' | 'hit' | 'dead'`. Dash doubles as the dodge/i-frame mechanic (see `DashSystem.ts`); there's no separate Dodge state, no Knockdown, no GetUp, no Ultimate-cast state distinct from regular Skill.

2. **No boss telegraph or phase system anywhere.** Grepped `src/game/**` and `src/components/BattleScene/**` for telegraph/boss-phase-shaped code -- zero matches. `src/game/realtimeBattle/EnemyAISystem.ts` drives all enemies (including anything meant to read as a boss) through the same generic AI brain; there's no phase-transition, no wind-up/telegraph-before-big-attack, no boss-specific state layer at all. `stageConfig.ts`'s waves are plain enemy-template lists, no boss entry marked as such.

**Not fixed here** -- classify only, per `master-blueprint-law.md`. Two separable pieces:

- State machine: add Knockdown/GetUp (needs a stagger/knockdown-threshold concept that doesn't exist yet in `DamageSystem.ts`) and a distinct Ultimate cast state (currently Ultimate doesn't exist at all -- see the sibling skills/soft-target issue) -- touches `RealtimeBattleRuntime.ts`'s state-transition logic throughout.
- Boss telegraph/phase: a new system, not an extension of `EnemyAISystem.ts`'s generic brain -- needs its own design (telegraph timing/readability, phase-trigger conditions e.g. HP thresholds, distinct visual/audio cues) before implementation, plus at least one actual boss-tagged enemy template to attach it to (none exist in `stageConfig.ts` today).

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep.

### comment — `nustanakritwithai` · 2026-08-07T09:17:00Z

ปิดตาม HetCreep — issue ถาม/classify เท่านั้น

**คำตอบ:** ถูกต้อง — ไม่มี Knockdown/GetUp/Ultimate state, ไม่มี boss telegraph/phase
**แผน:** P4–P6 ใน Blueprint v3 roadmap (Enemy AI → Stage 1-1 → Boss prototype)

---

## #22 — ABSENT: no equipment system at all -- items are display-only, no stats, no equip slots

_closed · opened by `HetCreep` 2026-08-07T05:57:59Z · closed 2026-08-07T09:17:02Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` PART 18-20 (loot/equipment) via PR #16. Track 5/8 of the blueprint gap-closure sweep.

**Verified against current code**:

- `src/game/items.ts`'s own header comment states the scope directly: items are "a starter set... has no effect on combat or upgrades of any kind because those systems don't exist yet -- currently only holdable-and-displayable-in-bag." `ItemCategory` is `'consumable' | 'material' | 'treasure'` -- no `'equipment'` category exists.
- `ItemDefinition` has no stat fields at all (id/name/description/category/rarity only) -- no damage/defense/affix/stat-roll shape to hang a random-affix loot system off of.
- `src/types/player.ts` has no equip-slot fields (grepped for equipment/equippedItems/weaponSlot/armorSlot -- nothing). `grantItem`'s inventory (`accountRepository.ts`) is a flat stack-by-id list, not equip-slot-aware.

This is the largest single gap in the register after the camera conflict -- it's not a missing feature bolted onto an existing system, it's an entire absent subsystem (random affix rolls, rarity-driven stat ranges, equip slots per hero, salvage/dismantle lifecycle, stat aggregation feeding into `DamageSystem.ts`'s atk/def).

**Not fixed here** -- classify only, per `master-blueprint-law.md`. Whoever picks this up needs a real design pass before touching code: affix pool + roll ranges per rarity tier, how equip stats compose with a hero's base stats in `DamageSystem.ts`, slot count/types, and whether salvage returns currency or crafting materials (no currency-sink mechanism exists yet either -- see the sibling currency-sinks/gacha issue).

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep.

### comment — `nustanakritwithai` · 2026-08-07T09:17:01Z

ปิดตาม HetCreep — issue ถาม/classify เท่านั้น

**คำตอบ:** ถูกต้อง — ไม่มี equipment system
**แผน:** Blueprint v3 **DEFERRED** (§2.1 CUT) — Loot RPG/equipment/affix ไม่ทำช่วงแรก ไม่ต้อง track open issue

### comment — `HetCreep` · 2026-08-07T10:37:33Z

**Status changed by Blueprint v3.0** (merged upstream `KatomnoiStudio/LegendOfSoulTH#19`, 2026-08-07). This issue's original finding (no equipment system) is still factually accurate, but v3 §2.1 now gives it an explicit position: **Equipment / random affix / set bonus are CUT — deferred until HetCreep reopens them.** Earlier framing ("confirmed correct, waiting for implementation") no longer applies — do NOT build equipment/loot without a new explicit approval. Re-opening only if/when that approval happens.

---

## #23 — ABSENT: every currency function is income-only, no spend path, no in-game gacha

_closed · opened by `HetCreep` 2026-08-07T05:58:26Z · closed 2026-08-07T09:17:03Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` PART 21-22 (currency sinks, in-game gacha) via PR #16. Track 6/8 of the blueprint gap-closure sweep. Related but distinct from issue #19 (the demo real-money topup UI conflict) -- this issue is about the missing SPEND side, not the existing income-side conflict.

**Verified against current code**: every exported function in `src/data/accountRepository.ts` that touches gold/gem/items/characters is an income function -- `earnGold`, `topUpGems`, `topUpGold`, `redeemCoupon`, `grantItem`, `grantCharacter`. Grepped the full export list; there is no `spendGold`, no `purchaseItem`, no `rollGacha`, no debit path of any kind. `CurrencyTransaction.amount` in practice is always positive (nothing in the codebase constructs a negative one). Currency, once earned, has nowhere to go.

The blueprint's model is **in-game gacha only** (spend earned currency/gacha-tickets to pull heroes/items, no real-money gacha -- that's the real-money half already flagged in #19). None of that pull mechanism exists: no gacha rate table, no pity system, no ticket/currency-sink resource type distinct from gold/gem.

**Not fixed here** -- classify only, per `master-blueprint-law.md`. Depends on decisions from two sibling issues before implementation makes sense: the equipment system (#22, for "spend on equipment" as one sink) and confirming what actually replaces the real-money topup UI (#19) -- both feed into what currency sinks should even exist. Also needs: a debit-path guard in `accountRepository.ts` mirroring the existing source-tagging discipline for income (comment at the top of that file already establishes the pattern -- a sink function should follow the same shape, not bypass the ledger).

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep.

### comment — `nustanakritwithai` · 2026-08-07T09:17:03Z

ปิดตาม HetCreep — issue ถาม/classify เท่านั้น

**คำตอบ:** ถูกต้อง — currency income-only ยังไม่มี spend/gacha path
**แผน:** Blueprint v3 P9 (Gacha/Stars) + P14 (Monetization/Shop) — track ใน roadmap หลัก

---

## #24 — ABSENT: no dungeon run structure -- single arena + wave spawns, not Town->Dungeon->Boss->Loot->Town

_closed · opened by `HetCreep` 2026-08-07T05:59:02Z · closed 2026-08-07T09:17:04Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` PART 4 + PART 12-13 (core loop, dungeon) via PR #16. Track 7/8 of the blueprint gap-closure sweep.

**Verified against current code**:

- `src/game/realtimeBattle/stageConfig.ts`'s `REALTIME_STAGES` has exactly 2 entries (`trial-01`, `trial-02`), each a single flat arena with a `waves` array of enemy spawns -- no room graph, no room-to-room transitions, no pacing structure beyond "wave N clears, wave N+1 spawns."
- `LOBBY_BATTLE_STAGE_ID = 'trial-01'` in `LobbyBattleSession.tsx` -- only `trial-01` has a live entry point from the lobby. `trial-02` is fully defined but unreachable by any UI path (confirmed by reading `LobbyPage.tsx`/`LobbyBattleSession.tsx`; nothing passes `'trial-02'` anywhere).
- The actual player loop today is: Lobby -> (button) -> single arena battle -> `BattleResultPanel` -> Lobby. There's no Town hub distinct from the Lobby, no "Prepare" step (loadout/equipment check -- doesn't exist per #22 either), no distinct Boss room (no enemy template is tagged as a boss, see the sibling state-machine/boss-telegraph issue #21), no Loot step beyond the flat reward roll in `RewardSystem.ts`.

**Not fixed here** -- classify only, per `master-blueprint-law.md`. This is a core-loop-level restructure, not a small addition -- it likely needs: a room/node data model (replacing the flat `waves` array), a Town hub UI (may or may not reuse the existing `LobbyPage`), a Prepare step, and stitching Boss (#21) + Loot (#22) into the run's terminal room. Reasonable to sequence AFTER equipment/loot and boss-telegraph land, since a dungeon run without either of those to end on doesn't yet have anything meaningfully different to offer over the current single-arena loop.

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep.

### comment — `nustanakritwithai` · 2026-08-07T09:17:04Z

ปิดตาม HetCreep — issue ถาม/classify เท่านั้น

**คำตอบ:** ถูกต้อง — single arena + waves, ไม่มี Town→Dungeon→Boss→Loot loop
**แผน:** Blueprint v3 P5–P7 (Stage 1-1 vertical slice → Chapter/Stage system)

### comment — `HetCreep` · 2026-08-07T10:37:50Z

**Refined by Blueprint v3.0** (merged upstream `KatomnoiStudio/LegendOfSoulTH#19`, 2026-08-07). v3 §5 now gives a concrete structure: Chapter→Stage→...→Boss (no separate Town hub layer), with required stage-type variation (Survival/Defend/Chase/Hazard/Mini-boss/Time Attack) instead of wave-only arenas. Roadmap P5 (stage 1-1 vertical slice) / P7 (chapter/stage system) are the tracked implementation slots — still MISSING in code, just no longer an open design question. Leaving open until P5/P7 land.

---

## #25 — CRITICAL CONFLICT: combat camera is top-down oblique, blueprint target is 2.5D side-view-with-depth

_closed · opened by `HetCreep` 2026-08-07T05:59:50Z · closed 2026-08-07T09:13:15Z_

**Source**: `docs/MASTER_BLUEPRINT_v1.0.md` PART 3 (camera/movement) via PR #16. Track 8/8 (last, and the largest) of the blueprint gap-closure sweep.

**Verified against current code, precisely** (this is the most consequential conflict in the whole register, worth the detail):

`src/components/BattleScene/BattleCamera.tsx` is a genuine top-down oblique camera, not a partial match to the target:

- `PITCH_DEG = 58` -- steep downward pitch, the defining trait of top-down/isometric-style cameras, not side-view.
- The camera's look-target tracks the player across **both** world axes (`targetX`/`targetZ`, clamped by a frustum-shadow calculation against the arena's full width AND depth) -- i.e. the player can walk freely in a 2D plane and the camera follows on both axes equally. A 2.5D side-view-with-depth camera is architecturally different: primary follow is along one horizontal axis, with depth (the second axis) constrained to a shallow lane, not a full 2D plane.
- This isn't a camera-only conflict. `src/game/realtimeBattle/MovementSystem.ts` and `InputSystem.ts` currently drive movement as free 2D (any direction, arena-bounded) to match this camera. A side-view migration changes the _movement contract_ itself, not just what's rendering it -- character facing/sprite-flip logic, hitbox origin/depth-sorting in `HitboxSystem.ts`, and `EnemyAISystem.ts`'s positioning/approach logic all assume the current free-2D world today and would need to change together with the camera, not after it.

**Not fixed here** -- classify only, per `master-blueprint-law.md`. This is a dedicated implementation track, not a single PR-sized change. Recommend sequencing this **last** among the 8 gap-closure tracks (matches `docs/BLUEPRINT_GAP_ANALYSIS.md`'s own note): every other system (skills #20, state machine/boss #21, equipment #22, currency sinks #23, dungeon structure #24) can be built and iterated against the _current_ camera/movement contract without waiting on this migration, and redoing the migration once instead of mid-flight avoids re-touching all of them twice.

Suggested shape for whoever picks this up: a design pass first (exact camera framing, how depth-axis input maps for both keyboard and the mobile joystick, whether enemies also constrain to a shallow depth lane or keep full 2D AI positioning under a reprojected camera), _then_ implementation naming this PART explicitly per `master-blueprint-law.md` rule 4.

Filed from `LegendofSoulTH/LegendOfSoulTH` blueprint gap-closure sweep -- this closes out the 8-track sweep opened by PR #16 (issues #19-#24 plus this one cover the full priority gap register).

### comment — `nustanakritwithai` · 2026-08-07T06:27:35Z

**HetCreep ตัดสินแล้ว (2026-08-07)** — ปิดคำถามทิศทางกล้อง:

**เป้าหมาย #25 = คล้ายเกมต่อสู้ (fighting / brawler) มุมมอง side-down (2.5D มองจากด้านข้างเฉียงลงเล็กน้อย ไม่ใช่ top-down) แต่ตัวละครเดินได้ 360° บนสนามในฉาก**

สอดคล้องกับ Master Blueprint PART 3:

- ยกเลิก top-down / isometric top-down (สถานะปัจจุบันใน `BattleCamera.tsx` = CONFLICT ที่ต้อง migrate ออก)
- ไม่ใช่ side-scroller แกนเดียว — ยังมี depth axis + diagonal/analog
- อ้างอิงปรัชญา: Action Naruto mobile / arena brawler (เดินรอบสนามได้ กล้องยัง presentation แบบ 2.5D)

**สถานะ sweep อื่น:**

- #19 — ยังประชุม/คุยอยู่ (business model vs demo topup UI)
- #20–#24 — ถูกต้องแล้ว รอสร้าง/ทำ implement ตามลำดับ

Implementation track นี้ยังไม่เริ่มในโค้ด — รอ design pass (framing, depth lane, input map) แล้วค่อยเปิด PR แยกตาม `master-blueprint-law.md`.

### comment — `nustanakritwithai` · 2026-08-07T09:13:15Z

**P1 เสร็จแล้ว** — Blueprint v3 Movement/Depth / 2.5D side-down arena migration

**Commit:** `25f17a9` on branch `cursor/p1-arena-2.5d-e117`

**สิ่งที่ทำ:**

- `battleCoordinates.ts` — สัญญาพิกัด: runtime `x`=ซ้าย–ขวา, `y`=depth → world XZ
- `BattleCamera.tsx` — กล้อง side-down จาก +Z, pitch 22° (เดิม 58° top-down)
- `BattleArena.tsx` — พื้นลาน + แถบ depth + ฉากหลัง + ขอบสนาม
- `EntitySprite.tsx` / `ScreenProjector.tsx` — แมปพิกัดใหม่ + depth renderOrder
- unit tests + `npm run ci` green (212 tests)

**ตาม HetCreep lock:** fighting/brawler 2.5D side-down, เดิน 360° บนสนาม — ยังคงไว้

**ยังไม่รวมใน P1 (เปิด issue ใหม่หรือทำใน P2/P3):**

- โจมตีซ้าย/ขวา + depth hit model (P2)
- 3 Skills + Ultimate, ตัดปุ่ม Dash (P3)
- `HitboxSystem` ยัง cone/360° ชั่วคราว

### comment — `HetCreep` · 2026-08-07T10:37:49Z

**Clarified by Blueprint v3.0** (merged upstream `KatomnoiStudio/LegendOfSoulTH#19`, 2026-08-07) — no conflict with the earlier lock, just a precision note for anyone reading both: the 2026-08-07 decision locked **360° MOVEMENT** (brawler-style free walking on the arena). v3 §3 separately locks **ATTACKS as LEFT/RIGHT-only, not 360°** — a different axis entirely. P1/P2 (`battleCoordinates.ts`, `combatFacing.ts`) already implement exactly that combination: walk anywhere, attack faces L/R. Nothing to change here, just avoiding future confusion between "360° movement" (locked, true) and "360° attack" (v3: explicitly false).

---

## #33 — GAP: Blueprint v3.0 does not specify boss telegraph/state-machine or soft-target assist

_closed · opened by `HetCreep` 2026-08-07T10:38:07Z · closed 2026-08-07T11:06:40Z_

**Source**: reconciliation pass while merging `KatomnoiStudio/LegendOfSoulTH#19` (Blueprint v3 + Combat P1/P2), 2026-08-07.

Two topics from the earlier gap-closure sweep are still open after v3 — not contradicted, just never addressed at the design level:

1. **Boss telegraph / entity state machine** (originally #21) — v3 only mentions boss as a roadmap slot ("P6: Boss prototype", stage §5.1 "boss: 5–8 min"). No design detail on Knockdown/GetUp states, telegraph timing, or phase transitions. Code still lacks these states entirely.
2. **Soft-target assist** (part of #20) — v3 §3.4 locks skill _count_ (3 + ultimate) but says nothing about targeting assist for the L/R attack model. With attacks now locked to a horizontal axis (v3 §3.2), whether/how soft-target works matters more than it did under the old free-aim model.

Flagging as a gap rather than building either blind. Needs a HetCreep design call before P4 (Enemy AI) / P6 (Boss prototype) land.

### comment — `HetCreep` · 2026-08-07T10:52:16Z

**Design review (Claude Code, 2026-08-07)** — วิเคราะห์ agenda ที่เสนอมา อิง Blueprint v3 เป็นฐาน:

| #   | หัวข้อ                                                                | ผล                                                                                             |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Brawler Cluster (โจมตีใหญ่ล่างขวา + S1-3/Ultimate รอบ)                | **เสนอรับ** — ตรงกับ v3 §3.3 อยู่แล้ว (ปุ่มฝั่งขวาทั้งหมด) แค่จัดวางเป็น cluster ไม่ขัดของเดิม |
| 2   | Attack Snap (soft-target เฉพาะตอนกดโจมตี ไม่แตะ stick เดิน)           | **เสนอรับ** — v3 §3.1 ล็อกไว้แล้วว่า movement กับ attack-direction แยกระบบกัน สอดคล้อง 100%    |
| 3   | Target Priority เมื่อศัตรูอยู่ด้านหลัง                                | **ยังไม่ล็อก — ต้อง HetCreep ตัดสิน** ดูด้านล่าง                                               |
| 4   | Boss Flow: Telegraph→Attack→Recovery, Hit→Knockdown→GetUp             | **เสนอรับ** — pattern มาตรฐาน ARPG ตรงกับ gap #21                                              |
| 5   | Boss Feedback: Ground Marker + Cast Bar + Active Feedback พอสำหรับ v1 | **เสนอรับ** — ครบมาตรฐาน v1/vertical-slice ของเพิ่มทีหลังได้                                   |
| 6   | PC: WASD + J + 1-4                                                    | **เสนอรับ** — v3 §3.3 ไม่ได้ล็อกคีย์เฉพาะ ("same action layer") นี่เป็น convention มาตรฐาน     |
| 7   | ขอบเขต: ไม่เพิ่ม Dash, Boss ไม่ขยายเกิน P4/P6                         | **เสนอรับ** — ตรงกับ CUT list เดิมของ v3 เป๊ะ (Dash = CUT แล้ว) แค่ยืนยันซ้ำ                   |

### ต้องตัดสิน: Target Priority เมื่อศัตรูอยู่ด้านหลัง

ฉากที่ตัวละครหันหน้าไปทาง A แต่ศัตรูอยู่ฝั่ง B (ตรงข้าม) แล้วผู้เล่นกดโจมตี — เกิดอะไร?

- **ตัวเลือก A (เสนอ)**: attack auto-face + snap ไปหาเป้าที่ดีที่สุดในระยะ depth-tolerance ไม่ว่าจะอยู่ฝั่งไหน — ไม่บังคับให้เดินไปหันหน้าเองก่อน เหตุผล: mobile touch ไม่มีปุ่มหันตัวแยก (v3 ไม่มี dash/turn button) บังคับเดินหันจะขัด flow ต่อสู้
- **ตัวเลือก B**: ตีเฉพาะฝั่งที่หันอยู่ — ต้องเดินสติกเพื่อหันก่อนโจมตีได้ เหตุผล: เคร่งครัดกับ "L/R attack only" มากกว่า เสี่ยงรู้สึกด้าน mobile

ต้องการคำตอบก่อนเริ่ม P4/P6 implementation ครับ.

### comment — `HetCreep` · 2026-08-07T10:55:06Z

**แก้ไข comment ก่อนหน้า**: "ต้องการคำตอบจาก HetCreep" เข้าใจผิด — HetCreep คุยกับ Claude Code โดยตรงอยู่แล้ว ไม่ต้องผ่าน issue นี้ ตัดสินแล้วในแชท จะ comment ผลตัดสินตามมาที่นี่หลังยืนยัน — comment นี้แค่บันทึกไว้ว่าใครเป็นคนตัดสิน (HetCreep ตรง ๆ) ไม่ใช่รอ dev อีกคนตอบ

### comment — `HetCreep` · 2026-08-07T10:56:10Z

@nustanakritwithai HetCreep เห็นชอบข้อ 1,2,4,5,6,7 ในตารางด้านบนแล้ว (Brawler Cluster / Attack Snap / Boss Flow / Boss Feedback / PC keys / ขอบเขตไม่เพิ่ม Dash) — ล็อกได้เลย

เหลือแค่ **ข้อ 3 (target priority เมื่อศัตรูอยู่ด้านหลัง)** ที่ HetCreep อยากรอความเห็นคุณก่อนตัดสิน — ระหว่าง **ตัวเลือก A** (attack auto-face ไปเป้าที่ดีที่สุดไม่ว่าอยู่ฝั่งไหน ไม่ต้องเดินหันเอง) กับ **ตัวเลือก B** (ตีเฉพาะฝั่งที่หันอยู่ ต้องเดินสติกหันก่อน) — มุมมองจากฝั่ง implementation คุณคิดว่าอันไหนเหมาะกว่า?

### comment — `nustanakritwithai` · 2026-08-07T11:06:39Z

**Resolved — Design Lock recorded in Blueprint §3.6**

HetCreep Ring 0 decisions (2026-08-07) now in upstream `docs/MASTER_BLUEPRINT_v3.0.md` §3.6:

1. **Soft-target** → **CUT** (no auto-snap, no lock-on). Player controls depth + L/R facing manually.
2. **Boss telegraph / state machine** → **LOCKED** (Telegraph → AttackActive → Recovery; ground marker required; Knockdown/GetUp for elite/boss).
3. **Phase transition** → finish current action → PhaseTransition (invuln) → Phase 2.

Upstream PR: KatomnoiStudio/LegendOfSoulTH (branch `cursor/combat-foundation-design-lock-e117`).

**Next open design gate:** Basic Attack Combo System (§3.6.11) — not part of this issue.

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T11:06:40Z

Closed — gap resolved by Blueprint §3.6 Combat Foundation Design Lock.

### comment — `nustanakritwithai` · 2026-08-07T11:26:03Z

## ส่งการบ้าน — Issue #33 (Combat Foundation + Combo + หนุมาน kit)

**Operator:** HetCreep · **Agent:** Cursor Agent (cloud) · **2026-08-07**

---

### สรุปผลส่งงาน

Gap ของ issue นี้ (boss telegraph/state machine + soft-target) **ปิดครบแล้ว** โดยบันทึกเป็น Design Lock ใน Blueprint v3 และ `MEMORY.md` บน upstream

| หัวข้อ                                  | ผลตัดสิน (Ring 0)                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Soft-target / Attack Snap / lock-on** | **CUT** — ไม่มี global auto-snap, auto-target, หรือ lock-on UI. ผู้เล่นควบคุม depth + L/R facing เอง (**ตัวเลือก B** จาก comment ก่อนหน้า) |
| **ข้อยกเว้นเดียว**                      | **Ultimate เท่านั้น** อาจ lock เป้าใกล้สุด (หนุมาน §3.7) — ไม่ใช่ soft-target ทั่วระบบ                                                     |
| **Boss flow**                           | **LOCKED** — `Idle→Chase→Telegraph→AttackActive→Recovery`; ground marker บังคับ; Knockdown/GetUp สำหรับ elite/boss                         |
| **Phase transition**                    | จบ action ปัจจุบันก่อน → PhaseTransition (invuln) → Phase 2                                                                                |
| **Combo §3.6.11**                       | 3-hit, window ~700ms, finisher ต่อตัวละคร, **no cancel** combo↔skill, เก็บ input buffer                                                    |
| **UI §3.3**                             | Joystick ซ้าย; S1/S2/S3/U แถวเหนือ Attack ใหญ่ล่างขวา (icon only); PC: J/Space + 1/E, 2/R, 3/F, 4/Q                                        |
| **หนุมาน §3.7**                         | S1 กระบวนทองคำ (มีแล้ว) · S2 กระบองระยะไกล · S3 กระโดดทุบ · Ult 4 ร่าง + nearest-target lock                                               |
| **Dash**                                | ตัดแล้ว (P3) — mobility ย้ายเข้าสกิลได้ทีหลัง                                                                                              |

---

### Upstream PRs (KatomnoiStudio/LegendOfSoulTH)

| PR                                                              | เนื้อหา                                               | สถานะ                          |
| --------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------ |
| [#22](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/22) | Blueprint **§3.6** Combat Foundation Design Lock      | **Merged**                     |
| [#21](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/21) | P3 — 3 skills + Ultimate framework, ตัด dash (v0.7.0) | **Merged**                     |
| [#23](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/23) | Blueprint **§3.6.11–§3.7** combo/UI/tuning/หนุมาน kit | **Open** (docs-only follow-up) |

---

### เอกสารอ้างอิง (รวมในการบ้านทุกครั้ง)

- [`MEMORY.md`](https://github.com/KatomnoiStudio/LegendOfSoulTH/blob/master/MEMORY.md) — สถานะโปรเจกต์ปัจจุบัน (P0–P3 DONE, §3.6+§3.6.11+§3.7 LOCKED, **NEXT: P4** Enemy AI)
- [`docs/MASTER_BLUEPRINT_v3.0.md`](https://github.com/KatomnoiStudio/LegendOfSoulTH/blob/master/docs/MASTER_BLUEPRINT_v3.0.md) — §3.3, §3.6–§3.7
- [`CHANGELOG.md`](https://github.com/KatomnoiStudio/LegendOfSoulTH/blob/master/CHANGELOG.md) — v0.7.0

---

### ยังเปิดอยู่ (ไม่บล็อก P4)

- ตาราง finisher ตัวเลขรายฮีโร่
- ไอคอนปุ่มสกิล (art ทีหลัง)
- Implementation track ถัดไป: UI layout ตาม §3.3 → S2/S3/Ult หนุมาน → **P4 Enemy AI**

---

**หมายเหตุ:** comment ก่อนหน้าที่ HetCreep อนุมัติ "Attack Snap" ถูก **supersede** โดยการตัดสิน Ring 0 ในแชท — เอกสารล่าสุด (§3.6 + §3.6.10) เป็น source of truth: **no global soft-target**.

Issue #33 design scope **ส่งครบแล้ว** — รอ merge PR #23 แล้วไป implementation P4 ต่อ

### comment — `nustanakritwithai` · 2026-08-07T11:28:37Z

บันทึก workflow (HetCreep): งานถาม-ตอบ/ส่งการบ้าน design บน issue นี้ — **comment บน issue เป็นช่องทางหลัก** ไม่ต้องเปิด PR แยกส่ง docs. สรุปใน comment ก่อนหน้าถือว่าส่งครบแล้ว. upstream PR #23 (docs follow-up) ไม่จำเป็นตามแนวทางนี้ — ปิดได้ถ้าต้องการ.

### comment — `nustanakritwithai` · 2026-08-07T11:46:53Z

## Ring 0 Decision — Combat Foundation LOCKED

ยืนยันตาม `KatomnoiStudio/LegendOfSoulTH` → `MASTER_BLUEPRINT_v3.0.md` §3.6 ซึ่งเป็น Product Baseline ปัจจุบัน

- Controls: Joystick + Basic Attack + S1/S2/S3/Ultimate; **ไม่มี Dash button**
- **ไม่มี global soft-target / auto-snap / hard lock-on**; facing มาจาก movement/joystick และ vertical-only movement ให้คง facing เดิม
- Walk + Attack/Skill พร้อมกันได้
- Basic Attack = **multi-target**, ไม่มี target magnet, ใช้ forward lunge
- Flow: `Movement → Attack Wind-up/Lunge → AttackActive → Recovery`; ระหว่าง AttackActive ไม่ให้ free movement 100%
- Skill flow: `Input → Cast/Wind-up → AttackActive → Recovery`; การ interrupt เป็น **per-move property** ห้ามใช้กฎว่าโดนตีแล้ว cancel ทุก skill
- Normal hit: `Hit → Small Knockback → Short Hitstun → Resume`; normal attack ไม่ Knockdown เป็น default
- Knockdown สงวนสำหรับ heavy/specific skill/combo finisher/elite/boss ตาม per-move flag

### Enemy/Boss state machine

ล็อกเป็น state แยกจริง:

`Idle → Chase → Telegraph → AttackActive → Recovery → Chase`

และเมื่อ move/rule รองรับ:

`Hit → Knockdown → GetUp → Chase`

ดังนั้น **Telegraph ต้องเป็น state แยก ไม่รวมเข้ากับ attack startup ชั่วคราว**

Telegraph baseline: ground marker required; boss/elite เพิ่ม cast bar; sprite tint ใช้ได้; SFX/screen feedback ไว้ภายหลัง

### Boss phase

`Current Action → Finish Current Action → PhaseTransition → Invulnerable → Phase 2`

ห้ามตัด action ปัจจุบันกลางคันเพื่อเปลี่ยน phase

### Per-move contract

ให้ attack/skill data รองรับอย่างน้อย `startupMs`, `activeMs`, `recoveryMs`, `castDelayMs`, `interruptible`, `movementDuringCast`, `lungeDistance`, `hitstunMs`, `knockback`, `knockdown`, `multiTarget`, `hitShape`, `range`, `depthTolerance`; enemy/boss เพิ่ม `telegraphMs`, `attackShape`, `phaseEligibility` — **ห้าม hard-code เป็น global behavior**

### Initial tuning baseline

- Basic lunge Hit 1/2/3 = **32 / 36 / 44**
- Normal basic `hitstunMs` = **200ms**
- S1/S2/S3/Ult `castDelayMs` = **0 / 250 / 320 / 480ms**
- Default skill cast `interruptible: true`
- Monkey King Ultimate setup `interruptible: false`
- Default `movementDuringCast = none`
- Mob `telegraphMs = 280ms`
- Boss `telegraphMs = 800–1200ms` per attack
- P4 normal mob = **no Knockdown**
- Boss phase threshold = **50% HP**, baseline **2 phases**
- GetUp i-frame = **200ms**

ค่ากลุ่ม tuning เป็น baseline สำหรับ implementation/playtest ไม่ใช่ final balance

Issue #33 ถือว่า **Design Lock resolved** แล้ว การ implement ให้แยกไปตาม P4/P6 และ one-topic-per-PR ตาม governance. ห้ามเพิ่ม Dash, global soft-target/auto-target/lock-on, QTE dodge หรือ heavy 3D telegraph VFX ใน foundation นี้

Combat identity คงเป็น **2.5D positioning-based brawler: movement + depth + facing + attack timing**.

### comment — `nustanakritwithai` · 2026-08-07T11:49:33Z

## Supersede note — Attack Snap (HetCreep, 2026-08-07)

Comment เก่าในตารางด้านบนที่อนุมัติ **Attack Snap / soft-target ตอนกดโจมตี (ข้อ 2)** — **ถูกยกเลิกแล้ว**

**Source of truth ปัจจุบัน (Blueprint v3 §3.6 + §3.6.10):**

- **ไม่มี** global soft-target / auto-snap / hard lock-on UI
- ผู้เล่นควบคุม depth + L/R facing เอง (ตัวเลือก B)
- **ข้อยกเว้นเดียว:** skill-specific targeting ที่ประกาศใน kit — เช่น Ultimate หนุมาน `targetLock: nearest` (§3.7)

Comment เก่าข้อ 2 เก็บไว้เป็นประวัติเท่านั้น ไม่ใช้เป็น design contract

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:09:44Z

## Master summary — P4 design locks complete (HetCreep, 2026-08-07)

รวมคำตอบ Ring 0 ทั้งหมดที่เกี่ยวกับ combat/P4 (อ้างอิง issue ย่อย):

### #33 ตัวนี้ (Combat Foundation)

- ไม่มี Dash · ไม่มี global soft-target/auto-snap/lock-on (**Attack Snap ข้อ 2 ถูก supersede**)
- ข้อยกเว้น: skill-specific lock เท่านั้น (Ult หนุมาน §3.7)
- Telegraph = state แยก · Boss phase จบ action ก่อนเปลี่ยน phase
- Combo §3.6.11: 3-hit, ~700ms, no cancel combo↔skill
- UI §3.3: joystick ซ้าย, S1/S2/S3/U + Attack ใหญ่ล่างขวา

### Issue ย่อยที่ปิดแล้ว

| Issue                                                              | คำตอบสรุป                                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [#34](https://github.com/nustanakritwithai/GameTurnBase/issues/34) | depthTolerance 95/100/105, S2 **92**, S3 **110**, enemy **88**                               |
| [#36](https://github.com/nustanakritwithai/GameTurnBase/issues/36) | Telegraph แยก · range/CD จาก **`stageConfig` data-driven** (ไม่ใช่ 420/115 global)           |
| [#41](https://github.com/nustanakritwithai/GameTurnBase/issues/41) | hitstun **200ms** · i-frame 120/280/420 · damage formula lock · Knockdown/GetUp framework P4 |
| [#42](https://github.com/nustanakritwithai/GameTurnBase/issues/42) | gauge-only · CD 8/6/10s · ult gain +8/+10/+25                                                |
| [#43](https://github.com/nustanakritwithai/GameTurnBase/issues/43) | gold=soft, gems=premium                                                                      |

### ยังไม่ lock (ไม่บล็อก P4)

- [#38](https://github.com/nustanakritwithai/GameTurnBase/issues/38) gacha rate/pity → **P9**
- [#35](https://github.com/nustanakritwithai/GameTurnBase/issues/35) ★6 ≤130% ★1 → **P8**
- [#40](https://github.com/nustanakritwithai/GameTurnBase/issues/40) level cap 60 → **P8**
- [#39](https://github.com/nustanakritwithai/GameTurnBase/issues/39) Elo/7-tier/K32 → **P13**
- [#44](https://github.com/nustanakritwithai/GameTurnBase/issues/44) client-predict+reconcile → **P12**
- Per-hero finisher ตัวเลข (§3.6.11)

**P4 เริ่ม implement ได้** — docs: Blueprint §3.6–§3.7 + issue comments ข้างบน

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:20:34Z

## FINAL — Issue #33 Homework Delivery (HetCreep Ring 0, 2026-08-07)

**Supersedes** comment เก่าทั้งหมดที่ขัดกัน (รวมตาราง Design review ข้อ 2 Attack Snap, ส่งการบ้านที่อ้าง PR #23 Open, Master summary รุ่นก่อน)

**Source of truth:** `docs/MASTER_BLUEPRINT_v3.0.md` §3.3–§3.7 + issue comments นี้ + `MEMORY.md`

**Workflow:** สรุปผลตัดสิน → comment บน issue · PR เฉพาะโค้ดจริง

---

### 1. Agenda เดิม — ผลตัดสินสุดท้าย

| #   | หัวข้อ                        | ผลสุดท้าย                                                                |
| --- | ----------------------------- | ------------------------------------------------------------------------ |
| 1   | Brawler Cluster               | **LOCKED** — §3.3                                                        |
| 2   | Attack Snap / soft-target     | **SUPERSEDED → CUT** — ไม่มี global auto-snap (ดู §3.6.10)               |
| 3   | Target priority ศัตรูด้านหลัง | **ตัวเลือก B** — ตีเฉพาะฝั่งที่หันอยู่; ผู้เล่นควบคุม depth + facing เอง |
| 4   | Boss Flow                     | **LOCKED** — §3.6.8                                                      |
| 5   | Boss Feedback                 | **LOCKED** — ground marker บังคับ; cast bar boss/elite                   |
| 6   | PC keys                       | **LOCKED** — J/Space + 1/E, 2/R, 3/F, 4/Q                                |
| 7   | ไม่เพิ่ม Dash                 | **CUT** — P3 ตัดแล้ว                                                     |

**ข้อยกเว้น targeting เดียว:** skill-specific lock ใน kit เท่านั้น — Ultimate หนุมาน `nearest` (§3.7)

---

### 2. Combat Foundation §3.6 (LOCKED)

- Joystick + Basic Attack + S1/S2/S3/Ultimate · **ไม่มี Dash**
- Basic = multi-target + lunge (ไม่ magnet) · Walk + Attack/Skill พร้อมกันได้
- Flow: `Movement → Wind-up/Lunge → AttackActive → Recovery`
- Skill: `Input → Cast → AttackActive → Recovery` · interrupt = **per-move property**
- Hit: `Hit → Knockback → Hitstun → Resume` · Knockdown ไม่ใช่ default mob
- Enemy SM: `Idle → Chase → Telegraph → AttackActive → Recovery → Chase`
- `Hit → Knockdown → GetUp → Chase` (elite/boss + heavy moves)
- **Telegraph = state แยก** (ไม่รวม startup)
- Boss phase: จบ action ปัจจุบัน → PhaseTransition (invuln) → Phase 2
- ห้าม: Dash, global soft-target/lock-on, QTE dodge, heavy 3D telegraph VFX

---

### 3. Combo §3.6.11 (LOCKED)

| กฎ             | ค่า                                       |
| -------------- | ----------------------------------------- |
| Hit count      | 3                                         |
| Combo window   | ~700ms (playtest tune)                    |
| Reset          | หยุดแล้วเริ่ม hit 1 ใหม่เมื่อ input valid |
| Finisher hit 3 | **per-character** (ตัวเลขยัง OPEN)        |
| Cancel         | **no cancel** combo ↔ skill               |
| Input buffer   | keep current                              |

---

### 4. UI §3.3 (LOCKED)

- Joystick ซ้ายล่าง · S1/S2/S3/U แถวเหนือ Attack · Attack ใหญ่ล่างขวา **icon only**
- Ult gauge ว่าง: กดได้แต่ไม่มีผล
- PC: J/Space · 1/E · 2/R · 3/F · 4/Q
- Skill icons: art TBD (placeholder OK)

---

### 5. Tuning §3.6.12 + issue ย่อย (LOCKED baseline)

| พารามิเตอร์                | ค่า                           |
| -------------------------- | ----------------------------- |
| Lunge hit 1/2/3            | 32 / 36 / 44                  |
| `hitstunMs`                | **200ms** (sync code จาก 180) |
| Post-hit i-frame           | 120ms                         |
| Skill i-frame              | 280 / 420ms                   |
| `getUp` i-frame            | 200ms                         |
| `castDelayMs` S1/S2/S3/Ult | 0* / 250 / 320 / 480ms        |
| Mob telegraph              | 280ms                         |
| Boss telegraph             | 800–1200ms per attack         |
| Boss phase                 | 50% HP · 2 phases             |
| P4 mob knockdown           | no                            |

**depthTolerance** ([#34](https://github.com/nustanakritwithai/GameTurnBase/issues/34)): Basic **95/100/105** · S2 **92** · S3 **110** · Enemy **88** (world units)

**Damage formula** ([#41](https://github.com/nustanakritwithai/GameTurnBase/issues/41)):
`max(1, floor((atk × mult × variance) − def × 0.42))` · crit 12% ×1.6

**Entity states P4** ([#41](https://github.com/nustanakritwithai/GameTurnBase/issues/41)):
idle · walk · attack · hit/hitstun · knockdown · getup · dead · skill cast

**Skill resource** ([#42](https://github.com/nustanakritwithai/GameTurnBase/issues/42)):
gauge-only · **no mana** · CD 8/6/10s · Ult gain +8/+10/+25 · max 100

---

### 6. Enemy AI P4 ([#36](https://github.com/nustanakritwithai/GameTurnBase/issues/36))

- Telegraph state แยก · L/R + depth tolerance
- Range/CD = **`stageConfig` data-driven** (ไม่ใช่ global 420/115)
- Baseline ปัจจุบัน: detect 1600–1700 · attack 74–86 · CD 1300–1700ms
- Difficulty scaling: **ยังไม่ทำใน P4**

---

### 7. หนุมาน §3.7 (LOCKED design · implementation ถัดไป)

| Slot  | Design                                              |
| ----- | --------------------------------------------------- |
| Basic | 3-hit combo + lunge                                 |
| S1    | กระบวนทองคำ (ship แล้ว)                             |
| S2    | กระบองระยะไกล · no lock                             |
| S3    | กระโดดทุบ                                           |
| Ult   | 4 ร่าง · nearest-target lock (skill-only exception) |

---

### 8. Issue อื่นที่เกี่ยวข้อง

| Issue                                                                             | สถานะ                                                                                                    |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [#37](https://github.com/nustanakritwithai/GameTurnBase/issues/37) Boss framework | CLOSED — baseline เพียงพอ; per-boss pattern = P6 content                                                 |
| [#43](https://github.com/nustanakritwithai/GameTurnBase/issues/43) Currency       | CLOSED — gold=soft, gems=premium                                                                         |
| [#38](https://github.com/nustanakritwithai/GameTurnBase/issues/38) Gacha          | OPEN / **P9** — direction locked (gems pull, config-driven, server-authoritative); **ห้ามเดา rate/pity** |
| [#35](https://github.com/nustanakritwithai/GameTurnBase/issues/35)                | ★6 ≤130% ★1 stat · P8                                                                                    |
| [#40](https://github.com/nustanakritwithai/GameTurnBase/issues/40)                | level cap 60 · P8                                                                                        |
| [#39](https://github.com/nustanakritwithai/GameTurnBase/issues/39)                | Elo/7-tier/K32 · P13                                                                                     |
| [#44](https://github.com/nustanakritwithai/GameTurnBase/issues/44)                | client-predict+reconcile · P12                                                                           |

---

### 9. Upstream (merged)

| PR                                                              | เนื้อหา                |
| --------------------------------------------------------------- | ---------------------- |
| [#22](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/22) | §3.6 Combat Foundation |
| [#21](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/21) | P3 skills+Ult v0.7.0   |
| [#23](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/23) | §3.6.11–§3.7 docs      |

---

### 10. ยัง OPEN (ไม่บล็อก P4)

- Per-hero finisher ตัวเลข
- Skill button art
- Gacha rate/pity/cost (#38 → P9 design gate)

---

### 11. Implementation track

```
P4 Enemy AI (Telegraph state + stageConfig) → sync hitstun 200ms + Knockdown/GetUp framework
→ UI §3.3 → หนุมาน S2/S3/Ult §3.7 → P5 vertical slice
```

**Issue #33 design scope: RESOLVED — P4 เริ่มได้**

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:27:15Z

## Supplement to FINAL — ส่วนที่ขาด (HetCreep, 2026-08-07)

เติมใน [FINAL comment](https://github.com/nustanakritwithai/GameTurnBase/issues/33#issuecomment-5216983345):

### เอกสารอ้างอิง (รวมในการบ้านทุกครั้ง)

- [`MEMORY.md`](https://github.com/KatomnoiStudio/LegendOfSoulTH/blob/master/MEMORY.md)
- [`docs/MASTER_BLUEPRINT_v3.0.md`](https://github.com/KatomnoiStudio/LegendOfSoulTH/blob/master/docs/MASTER_BLUEPRINT_v3.0.md) §3.3–§3.7
- [`CHANGELOG.md`](https://github.com/KatomnoiStudio/LegendOfSoulTH/blob/master/CHANGELOG.md) — v0.7.0

### Issue ย่อย — สถานะ CLOSED

[#34](https://github.com/nustanakritwithai/GameTurnBase/issues/34) depthTolerance · [#36](https://github.com/nustanakritwithai/GameTurnBase/issues/36) Enemy AI · [#41](https://github.com/nustanakritwithai/GameTurnBase/issues/41) hit model · [#42](https://github.com/nustanakritwithai/GameTurnBase/issues/42) skill resource — **ปิดแล้ว**

### #38 Gacha direction (OPEN / P9 — ไม่บล็อก P4)

LOCK แล้ว: ระบบ gacha เดียว config-driven · Gems ดึง gacha · Gold=soft · Duplicate→Star Ascension · valuable state server-authoritative · `CurrencyShopModal`=demo/legacy **ห้ามถือเป็น gacha contract**

ยังไม่ LOCK (P9 design gate): rate/pity/cost/rarity/disclosure/config storage — **ห้าม agent เดาตัวเลข**

### Withdrawn

- Comment HetCreep อนุมัติ **ข้อ 2 Attack Snap** — **ถอน** (supersede → CUT)
- Comment ถาม `@nustanakritwithai` ข้อ 3 A vs B — **ถอน** (ตอบแล้ว: **ตัวเลือก B**)

**อ่าน FINAL + Supplement นี้ = canonical สำหรับ #33**

Operator: HetCreep | Cursor Agent | 2026-08-07

---

## #34 — GAP: depth tolerance ไม่มีค่าตัวเลข (blocks P1/P2)

_closed · opened by `HetCreep` 2026-08-07T11:02:02Z · closed 2026-08-07T11:39:00Z_

**Source**: ask-CB (CoalBoard) 3-lens gap scan บน `docs/MASTER_BLUEPRINT_v3.0.md`, 2026-08-07 — เจอตรงกันทั้ง 3 lens (data/truth/feeling), confidence สูง.

§3.2 (LOCKED): "Depth alignment required: horizontal range + **depth tolerance** (not pixel-perfect Y)" — ไม่มีหน่วย ไม่มีตัวเลข ไม่มีสูตรใด ๆ นี่คือกลไกที่ทำให้ 2.5D positioning มีความหมายจริง (§5.2 อ้างถึงซ้ำว่า "positioning matters") เป็นเลขที่ load-bearing ที่สุดในระบบ combat ทั้งหมด — implementer ต้องเดาเองว่าโซนเท่าไหร่ถึงนับว่า "align" กับศัตรู

ต้องการ: ค่า tolerance (world unit หรือ % ของ lane height) ก่อนเริ่ม P2 hit model จริง

### comment — `nustanakritwithai` · 2026-08-07T11:34:55Z

**Re-audit 2026-08-07** — ยัง **ไม่ปิด** แต่มี baseline ในโค้ดแล้ว (ยังไม่ lock ใน Blueprint)

| บทบาท             | depthTolerance (world units) | แหล่ง                           |
| ----------------- | ---------------------------- | ------------------------------- |
| Basic hit 1/2/3   | 95 / 100 / 105               | `attacks.ts` MONKEY_COMBO_CHAIN |
| Enemy melee       | 88                           | `attacks.ts` ENEMY_ATTACK       |
| S2/S3 placeholder | 92 / 110                     | `attacks.ts`                    |

- หน่วย = **world unit เดียวกับ `battleCoordinates`** (ไม่ใช่ % lane)
- Blueprint §3.2 ยังไม่มีตัวเลข lock · §3.6.12 ก็ยังไม่รวม depthTolerance

**ต้องการจาก Ring 0:** ยืนยันชุดตัวเลขนี้เป็น baseline lock หรือกำหนดค่าใหม่ก่อนปิด issue

### comment — `nustanakritwithai` · 2026-08-07T11:38:13Z

## Ring 0 decision — LOCK for P4

ยืนยัน baseline ตามค่าปัจจุบัน:

- Combo hit 1 depthTolerance = **95** world units
- Combo hit 2 depthTolerance = **100** world units
- Combo hit 3 depthTolerance = **105** world units
- Enemy melee depthTolerance = **88** world units
- หน่วยอ้างอิง = `battleCoordinates`

ให้ใช้ชุดนี้เป็น **P4 baseline** ก่อน ยังไม่ต้อง rebalance ระหว่าง implement Enemy AI เว้นแต่ playtest พบ hit/miss ผิดธรรมชาติอย่างชัดเจน

**Status: LOCKED — P4 implement ได้โดยไม่ต้องเดาเพิ่ม**

### comment — `HetCreep` · 2026-08-07T11:38:59Z

**HetCreep confirms**: lock the code values as-is — Basic 95/100/105, Enemy melee 88, S2/S3 92/110 (world units, `battleCoordinates` scale). No redesign needed, just formalize into Blueprint §3.2/§3.6.12 whenever convenient.

### comment — `nustanakritwithai` · 2026-08-07T11:39:47Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**LOCKED** `depthTolerance` (world units, `battleCoordinates`):

| บทบาท                     | ค่า                |
| ------------------------- | ------------------ |
| Basic combo hit 1 / 2 / 3 | **95 / 100 / 105** |
| Enemy melee               | **88**             |

ใช้ค่านี้เป็น baseline สำหรับ P2 hit model และ P4 — tune ใน playtest ได้ทีหลัง

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T11:49:32Z

## Supplement — S2/S3 values (HetCreep, 2026-08-07)

เติมค่าที่ตกหล่นจาก confirmation เดิม:

| บทบาท              | depthTolerance |
| ------------------ | -------------- |
| S2 (กระบองระยะไกล) | **92**         |
| S3 (กระโดดทุบ)     | **110**        |

ชุดเต็ม LOCKED: Basic **95/100/105** · Enemy **88** · S2 **92** · S3 **110** (world units, `battleCoordinates`)

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:09:45Z

## Final consolidated — depthTolerance LOCKED (HetCreep, 2026-08-07)

**Supersedes** comment "Resolved" ที่ขาด S2/S3 — ชุดเต็ม:

| บทบาท                     | depthTolerance (world units) |
| ------------------------- | ---------------------------- |
| Basic combo hit 1 / 2 / 3 | **95 / 100 / 105**           |
| S2 กระบองระยะไกล          | **92**                       |
| S3 กระโดดทุบ              | **110**                      |
| Enemy melee               | **88**                       |

หน่วย = `battleCoordinates` · tune playtest ทีหลังได้

Operator: HetCreep | Cursor Agent | 2026-08-07

---

## #35 — GAP: star power-gap bound ไม่ถูกวัดผล (blocks P8/P9, PvP fairness)

_closed · opened by `HetCreep` 2026-08-07T11:02:03Z · closed 2026-08-07T12:01:32Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง.

§4.3 และ §6.2 (LOCKED) พูดถึงกฎเดียวกันซ้ำ 2 ที่: "Power gap between star tiers must be bounded" / "limit star power gap so ★6 does not auto-win vs ★1" — เป็นกติกา balance ที่สำคัญที่สุดใน blueprint (ผูกกับทั้ง PvE progression และ PvP fairness) แต่ไม่มีสูตร ไม่มี % cap ไม่มีอะไรให้ทดสอบได้ในโค้ดจริง

ต้องการ: ตัวเลข/สูตรผูก star tier → stat cap ก่อนเริ่ม P8 (progression) หรือ P9 (gacha/star)

### comment — `nustanakritwithai` · 2026-08-07T11:35:21Z

**Re-audit 2026-08-07** — **ยังเปิด** (หลักการ lock แล้ว ไม่มีตัวเลข)

Blueprint §4.3 + §6.2: power gap ระหว่าง star ต้อง **bounded** (★6 ไม่ auto-win ★1 ในแรงก์เดียวกัน)

**ยังไม่มี:** % cap, stat multiplier ต่อดาว, สูตรทดสอบได้

**ต้องการจาก Ring 0 (ก่อน P8/P9):** เช่น max stat delta ต่อดาว, หรือ hard cap % ระหว่าง ★1 vs ★6

### comment — `HetCreep` · 2026-08-07T11:41:56Z

@nustanakritwithai เสนอ ★6 stat ≤ 130% ของ ★1 (มาตรฐาน gacha ทั่วไป) เป็น power-gap bound ก่อน P8/P9 — สมเหตุผลจากมุม implementation/balance ไหม หรือมีเลขที่เหมาะกว่า?

### comment — `nustanakritwithai` · 2026-08-07T11:49:31Z

## Ring 0 baseline (HetCreep, 2026-08-07)

**★6 raw/stat power ≤ 130% ของ ★1** — initial balancing ceiling ก่อน P8/P9

หมายเหตุ: เป็น **stat ceiling** ไม่ใช่รับประกัน total combat power 130% — Blueprint ต้องการ ★1 fully playable + star gap bounded สำหรับ PvP fairness (§4.3, §6.2)

Implement ตอน P8 — ไม่บล็อก P4

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:01:31Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ★6 stat ≤ 130% ของ ★1 lock เป็น initial ceiling ก่อน P8/P9

---

## #36 — GAP: Enemy AI ไม่มี spec เลย (blocks P4)

_closed · opened by `HetCreep` 2026-08-07T11:02:04Z · closed 2026-08-07T11:39:48Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง. ตรงกับหัวข้อประชุมวันนี้ (P4 Enemy AI).

§10 มี "P4 Enemy AI" ใน roadmap และ §11 ต้องการ "2-3 enemy types" แต่ไม่มี behavior state machine (idle/aggro/attack/retreat?), ไม่มี aggro-range, ไม่มีกติกาว่าศัตรูใช้ attack-axis L/R เหมือนผู้เล่นไหม, ไม่มี difficulty-scaling ผูกกับ stage number

ต้องการ: design ระดับ state-machine + scaling rule ก่อนเริ่ม P4 จริง

### comment — `nustanakritwithai` · 2026-08-07T11:34:56Z

**Re-audit 2026-08-07** — **ยังไม่ปิด** (P4 กำลังจะเริ่ม)

**มีแล้วใน Blueprint §3.6.8:**
`Idle → Chase → Telegraph → AttackActive → Recovery` + Hit/Knockdown/GetUp สำหรับ elite/boss

**มีแล้วในโค้ด (`EnemyAISystem.ts`) — ยังไม่ตรงสเปก:**
`idle → chase → attack → recover` (ไม่มี **Telegraph** แยก, startup รวมใน attack)

**ยังไม่มีทั้ง Blueprint และโค้ด:**

- aggro/detect/attack range เป็น design lock (มีแค่ per-template ใน `stageConfig`)
- ศัตรูใช้ L/R + depth tolerance เหมือนผู้เล่น — implied แต่ไม่ lock
- difficulty scaling ตาม stage/chapter
- retreat/kite behavior, group tactics

**ต้องการจาก Ring 0 ก่อน implement P4:** numeric ranges default + ยืนยันว่า mob ปกติต้องมี Telegraph state แยกจริง (ตาม §3.6.8) หรือรวมใน startup ชั่วคราว

### comment — `nustanakritwithai` · 2026-08-07T11:38:25Z

## Ring 0 decision — LOCK for P4 Enemy AI

ยืนยันให้ Mob ปกติมี state **`Telegraph` แยกจริง** ตาม Blueprint §3.6.8 ไม่รวมไว้ใน attack startup เพราะต้องการให้ telegraph เป็น state ที่อ่านได้/interrupt ได้/ขยายเป็น boss behavior ได้ภายหลัง

P4 default baseline:

- Detect range = **420** world units
- Attack range = **115** world units
- Attack cooldown = **900ms**
- Mob melee telegraph = **280ms**
- การเช็กระยะโจมตีใช้แกน **L/R + depth tolerance** แบบเดียวกับผู้เล่น
- Enemy melee depth tolerance อ้างอิง #34 = **88** world units

Difficulty scaling ตาม stage/chapter: **ยังไม่ทำใน P4** ให้ P4 ทำ deterministic baseline เดียวก่อน แล้วค่อยเพิ่ม scaling หลัง combat feel และ AI state loop ผ่าน playtest

State flow ขั้นต่ำที่ต้องการ:
`Idle/Patrol -> Chase -> Telegraph -> Attack -> Recovery/Cooldown -> Chase/Idle`

**Status: LOCKED — P4 implement ได้**

### comment — `nustanakritwithai` · 2026-08-07T11:39:47Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**P4 Enemy AI — LOCKED**

| พารามิเตอร์        | ค่า                                       |
| ------------------ | ----------------------------------------- |
| State machine      | `Telegraph` = **state แยก** (ตาม §3.6.8)  |
| Detect range       | **420**                                   |
| Attack range       | **115**                                   |
| Attack cooldown    | **900 ms**                                |
| Telegraph duration | **280 ms**                                |
| Attack axis        | **L/R + depth tolerance** (เหมือนผู้เล่น) |
| Difficulty scaling | **ยังไม่ทำใน P4**                         |

P4 เริ่ม implement ได้โดยไม่เดาค่า Ring 0

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T11:39:48Z

ปิด — Ring 0 ล็อก P4 Enemy AI spec แล้ว

### comment — `HetCreep` · 2026-08-07T11:41:55Z

@nustanakritwithai เสนอ default ก่อนเริ่ม P4 — Telegraph เป็น state แยกจริงตาม §3.6.8 (ไม่รวมใน attack เหมือนตอนนี้), aggro range ~200 / detect ~250 world unit (สเกลเดียวกับ depthTolerance ที่ #34 ล็อกไปแล้ว 88-110) — ปรับ playtest ทีหลังได้ ถูกทางไหม หรือมีเลข/ดีไซน์ที่เหมาะกว่าจากมุม implementation?

### comment — `nustanakritwithai` · 2026-08-07T11:49:31Z

## Final — Ring 0 superseding (HetCreep, 2026-08-07)

**Supersedes** earlier comments ที่ lock detect **420** / attack **115** / CD **900ms** — ตัวเลขนั้น **ไม่ใช่ Product Contract**

### LOCKED (Blueprint)

- State machine: `Idle → Chase → Telegraph → AttackActive → Recovery → Chase`
- Mob `Telegraph` = **state แยก** (ไม่รวมใน attack startup)
- Mob telegraph duration baseline: **280ms**
- Attack axis: **L/R + depth tolerance** (เหมือนผู้เล่น)
- Difficulty scaling ตาม stage/chapter: **ยังไม่ทำใน P4**

### Implementation baseline (data-driven — ไม่ใช่ global default)

Blueprint **ไม่ได้ล็อก** detect/attack/cooldown เป็นตัวเลข Product Contract — ใช้ **`stageConfig` ปัจจุบัน** เป็น baseline ของ enemy ที่มีอยู่:

| Enemy           | detect | attack | cooldown |
| --------------- | ------ | ------ | -------- |
| shadow-soldier  | 1600   | 74     | 1500ms   |
| demon-captain   | 1700   | 86     | 1700ms   |
| spirit-guardian | 1600   | 78     | 1300ms   |

เหตุผล: spawn distance ~784 unit — ลด detect เหลือ 250/420 จะเปลี่ยน encounter behavior โดยไม่มี playtest รองรับ

**ไม่ lock 1600–1700 เป็นค่าทุกศัตรู** — เก็บเป็น **per-enemy / per-stage tuning** ตาม data (แนวเดียวกับ per-move properties)

**Status: LOCKED for P4** — implement Telegraph state + ใช้ stageConfig data-driven

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:01:34Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — supersede เลข global เดิม ใช้ stageConfig จริงเป็น baseline + Telegraph state แยกตาม §3.6.8 — ไม่บล็อก P4

### comment — `nustanakritwithai` · 2026-08-07T12:09:45Z

## Withdrawn — คำถาม detect 200/250 (HetCreep, 2026-08-07)

Comment ที่ถาม `@nustanakritwithai` เรื่อง aggro **200** / detect **250** — **ถอนแล้ว**

คำตอบสุดท้าย: ใช้ **`stageConfig` ปัจจุบัน** (detect 1600–1700) เป็น data-driven baseline ตาม comment "Final — Ring 0 superseding" ด้านบน

Operator: HetCreep | Cursor Agent | 2026-08-07

---

## #37 — GAP: Boss design มีแค่กรอบเวลา ไม่มี phase/telegraph (blocks P6)

_closed · opened by `HetCreep` 2026-08-07T11:02:05Z · closed 2026-08-07T11:39:02Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง. ตรงกับหัวข้อประชุมวันนี้ (P6 Boss).

§5.1 ให้แค่กรอบเวลา boss (5-8 min) §10 มี "P6 Boss prototype" แต่ไม่มี phase-transition rule, ไม่มี enrage/timeout, ไม่มี telegraph/attack-pattern spec ใด ๆ — ตรงกับที่ agenda วันนี้เสนอ Telegraph→Attack→Recovery + Hit→Knockdown→GetUp ซึ่งควรถูกล็อกเข้า blueprint จริงจัง ไม่ใช่แค่คุยในแชท

ต้องการ: เอา flow ที่คุยในที่ประชุมวันนี้ (issue #33) มาเขียนลง §5 หรือ section ใหม่ ก่อนเริ่ม P6

### comment — `HetCreep` · 2026-08-07T11:31:50Z

**Partially addressed by Blueprint §3.6.12** (merged upstream via `KatomnoiStudio/LegendOfSoulTH#23`, 2026-08-07): mob telegraph=280ms, boss telegraph=800-1200ms per attack row, boss phase threshold=50% HP (2 phases baseline), getUp i-frames=200ms. These are explicitly marked as playtest starting points, not final balance. Leaving open — no per-boss attack-pattern design yet, just the shared numeric defaults.

### comment — `HetCreep` · 2026-08-07T11:39:01Z

**HetCreep confirms**: shared telegraph numbers (mob 280ms, boss 800-1200ms, phase@50%HP, getUp i-frame 200ms) are sufficient for the v1 framework — closing this gap. Per-boss attack-pattern design is stage-content work for P6, not a blueprint-level gap; track it there when P6 starts.

---

## #38 — GAP: Gacha ไม่มี rate/pity/cost (blocks P9)

_closed · opened by `HetCreep` 2026-08-07T11:02:06Z · closed 2026-08-07T12:18:48Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง.

§2 core loop วาง Gacha เป็น hub กลาง ("Gacha → Hero / Star") §4.1 บอกแค่ "Gacha unlocks heroes" แต่ไม่มี rarity tier enum, ไม่มี pull rate/probability, ไม่มี pity counter, ไม่มี currency cost ต่อ pull — ระบบที่มักมีข้อบังคับทางกฎหมายเรื่อง rate disclosure ด้วย

ต้องการ: rate table + pity rule ก่อนเริ่ม P9

### comment — `nustanakritwithai` · 2026-08-07T11:35:21Z

**Re-audit 2026-08-07** — **ยังเปิด** (ก่อน P9)

Blueprint §4.1/§7: gacha = core monetization แต่ไม่มี rate/pity/cost

**ในโค้ดมี UI demo** (`CurrencyShopModal`) แต่ยังไม่มีตาราง rate disclosure ที่ lock

**ต้องการจาก Ring 0:** rarity tiers, % ต่อ pull, pity threshold, สกุลเงินที่ใช้ดึง (ผูก #43)

### comment — `HetCreep` · 2026-08-07T11:42:01Z

@nustanakritwithai ข้อนี้ผูกกับ business model ตรง ๆ HetCreep ให้ปล่อยไว้ก่อนจนกว่าจะใกล้ P9 จริง (ไกลจาก P4 ที่กำลังจะเริ่มมาก) — ไม่ต้องรีบตอบตอนนี้ เก็บ context ไว้ (currency taxonomy จาก #43 ปิดไปแล้ว: gold=soft, gems=premium — ผูก gacha cost ต่อจากนี้ได้)

### comment — `HetCreep` · 2026-08-07T12:06:03Z

@nustanakritwithai ต่อจาก comment บน — HetCreep ล็อกหลักการ config-driven ไว้แล้ว (ไม่ทำ 2 ระบบแยก) แต่ยังไม่ถามคุณว่า **เหมาะกับ implementation จริงไหม**: เก็บ rate table เป็น Supabase table (เหมือน pattern RPC ที่มีอยู่แล้ว earn_gold/redeem_coupon) หรือเก็บเป็น static JSON ใน repo แล้วอ่านตอน build พอ — คุณเห็นทางไหนเหมาะกับ stack ปัจจุบันมากกว่า?

### comment — `nustanakritwithai` · 2026-08-07T12:09:47Z

## Ring 0 — deferred to P9 (HetCreep, 2026-08-07)

**ยังไม่ lock** rate / pity / cost — **เลื่อนไป P9** (ไม่บล็อก P4)

หลักการที่ lock แล้ว:

- Config-driven (ไม่ทำ 2 ระบบแยก)
- Currency: gems = premium pull currency (#43)
- gold = soft (#43)

คำถาม implementation (Supabase table vs static JSON) — **รอตอน P9** ไม่ต้องตอบตอนนี้

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:17:20Z

## Ring 0 Decision — Gacha Direction (HetCreep, 2026-08-07)

ยืนยันดังนี้

- **#38 ยัง OPEN**
- เลื่อน implementation และ numerical balance ไป **P9 — Gacha / Stars**
- **ไม่บล็อก P4–P8**

### LOCK ตอนนี้

1. Gacha เป็นระบบหลักของ Hero Collection ตาม Blueprint v3
2. ใช้ **ระบบ Gacha เดียว** แบบ **config-driven** — ไม่สร้างหลายระบบแยกกัน
3. **Currency:**
   - **Gold** = soft currency
   - **Gems** = premium currency
   - **Gacha ใช้ Gems**
4. Duplicate hero → **Star Ascension** ตาม Blueprint §4.1
5. Valuable state เช่น Gems, pull result, duplicate/star progression และ pity state ต้องออกแบบให้ **server-authoritative**
6. `CurrencyShopModal` ปัจจุบันเป็น **demo/legacy surface เท่านั้น** — ห้ามถือค่าปัจจุบันใน UI เป็น Gacha contract

### ยังไม่ LOCK — ตัดสินใน P9

- Rarity tiers
- Rate % ต่อ rarity
- Pity threshold / pity rules
- Cost ต่อ 1 pull / multi-pull
- Guaranteed rules
- Rate-up/banner rules
- Rate disclosure
- Config storage: Supabase table/RPC vs static config

ตอน P9 ให้เปิด **design gate** ก่อน implementation และตัดสิน economy + probability + pity + disclosure + server authority **พร้อมกัน**

**ห้าม Agent เดาตัวเลข rate / pity / cost ล่วงหน้า**

---

**สถานะ #38:** OPEN / DEFERRED TO P9 — system direction and currency are locked; numerical Gacha economy remains intentionally unresolved.

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:18:47Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกตามที่เสนอ: gacha ระบบเดียว config-driven, gems=premium pull currency, gold=soft, duplicate→Star Ascension (§4.1), server-authoritative สำหรับ gems/pull-result/pity, CurrencyShopModal ปัจจุบัน=demo/legacy ไม่ใช่ contract จริง. rate/pity/cost/implementation-choice เลื่อนไป P9 ตามที่เสนอ ไม่บล็อก P4-P8

---

## #39 — GAP: Rank/MMR ไม่มีอัลกอริทึมหรือ tier list (blocks P13)

_closed · opened by `HetCreep` 2026-08-07T11:02:07Z · closed 2026-08-07T12:01:37Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง.

§6.1 (LOCKED) บอก flow "Match by Rank/MMR → 1v1 → Win/Lose → Rank update" §6.2 บอก "match within rank band first; expand search if queue waits" แต่ไม่มี rank tier list, ไม่มีสูตร MMR (Elo/Glicko/custom), ไม่มี K-factor, ไม่มี threshold ตัวเลขสำหรับ queue expansion, ไม่มี decay rule

ต้องการ: อัลกอริทึม + tier list ก่อนเริ่ม P13

### comment — `nustanakritwithai` · 2026-08-07T11:35:22Z

**Re-audit 2026-08-07** — **ยังเปิด** (ก่อน P13)

Blueprint §6.1–6.2: Rank/MMR flow + match within band แล้ว expand — **ไม่มี tier list หรือสูตร**

**ต้องการจาก Ring 0:** Elo/Glicko/custom, จำนวน tier, K-factor, queue expansion threshold, decay (ถ้ามี)

### comment — `HetCreep` · 2026-08-07T11:41:58Z

@nustanakritwithai เสนอ default: Elo-based MMR, 7 tier (Bronze-Grandmaster), K-factor 32 — เหมาะกับ implementation ปัจจุบันไหม หรือมีข้อจำกัดจาก Supabase backend ที่ควรพิจารณา (เช่น cost ของการคำนวณ/query)?

### comment — `nustanakritwithai` · 2026-08-07T11:49:31Z

## Ring 0 baseline (HetCreep, 2026-08-07)

**P13 design baseline** (ไม่ implement ตอนนี้):

- **Elo-based MMR**
- **7 tiers** (Bronze → Grandmaster)
- **K-factor = 32**

ไม่ขัด Supabase — Blueprint กำหนด single ranked + server-authoritative valuable state ไม่ได้บังคับ algorithm เฉพาะ

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:01:36Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — Elo, 7 tier (Bronze-Grandmaster), K-factor 32 lock เป็น P13 design baseline

---

## #40 — GAP: Hero/Skill progression ไม่มีสูตร EXP/level cap/cost (blocks P8)

_closed · opened by `HetCreep` 2026-08-07T11:02:08Z · closed 2026-08-07T12:01:39Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง.

§4.2 (LOCKED) ล็อกแค่ชื่อ layer "Hero Level → Star → Skill Level" ไม่มี level cap, ไม่มี EXP curve, ไม่มี per-level stat growth, ไม่มี skill-level cap หรือ upgrade cost

ต้องการ: สูตร/ตัวเลขจริงก่อนเริ่ม P8

### comment — `nustanakritwithai` · 2026-08-07T11:35:23Z

**Re-audit 2026-08-07** — **ยังเปิด** (ก่อน P8)

Blueprint §4.2 lock แค่ชื่อ layer: Hero Level → Star → Skill Level

**ในโค้ดมีสูตรบางส่วน** (`calcMaxHp(level, def)`) แต่ไม่ใช่ progression system เต็ม

**ต้องการจาก Ring 0:** level cap, EXP curve, stat growth ต่อเลเวล, skill-level cap + upgrade cost

### comment — `HetCreep` · 2026-08-07T11:41:59Z

@nustanakritwithai เสนอ default: level cap 60, EXP curve exponential เบา ๆ ปรับ playtest ทีหลัง — ใช้ได้ไหม หรือคุณมีตัวเลขที่ทดสอบมาแล้วจาก `calcMaxHp` หรือระบบอื่นที่ควรอิงตาม?

### comment — `nustanakritwithai` · 2026-08-07T11:49:32Z

## Ring 0 baseline (HetCreep, 2026-08-07)

**Level cap = 60** — initial progression ceiling ก่อน P8

**ไม่ผูก** EXP/stat curve เข้ากับ `calcMaxHp` เพียงอย่างเดียว — P8 ทำ **progression table / data model แยก** แล้วให้ `calcMaxHp` consume hero progression state ทีหลัง (Phase 1 = Hero Level → Star → Skill Level ตาม §4.2)

Implement ตอน P8 — ไม่บล็อก P4

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:01:38Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — level cap 60, progression table แยกจาก calcMaxHp ตามที่เสนอ lock เป็น P8 baseline

---

## #41 — GAP: Combat hit model ไม่มี damage formula/state list/i-frame (blocks P2)

_closed · opened by `HetCreep` 2026-08-07T11:02:09Z · closed 2026-08-07T11:39:48Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอ 2/3 lens (data, feeling), confidence สูง.

§3.2/§5 บอกว่า combat เป็น "realtime, positioning-based" แต่ไม่มี damage formula (ATK vs DEF ฯลฯ), ไม่มี state list (idle/windup/active/recovery/hitstun/stagger), ไม่มี hurtbox/hitbox spec, ไม่มี i-frame rule

ต้องการ: hit-model spec ก่อนเริ่ม P2 จริงจัง (P1/P2 ทำไปบ้างแล้วใน PR #19 — เช็คว่าตรงกับที่ implement จริงไหม)

### comment — `HetCreep` · 2026-08-07T11:31:51Z

**Partially addressed by Blueprint §3.6.11-3.6.12** (merged upstream via `KatomnoiStudio/LegendOfSoulTH#23`, 2026-08-07): combo now has concrete numbers (3-hit chain, ~700ms window, no skill-cancel, per-character finisher), hitstunMs=200 for normal basic-attack, lungeDistance per hit (32/36/44), knockback deferred to existing `attacks.ts` values. Still open: no damage formula (ATK vs DEF), no i-frame policy outside getUp (200ms), no hurtbox/hitbox shape spec beyond what P1/P2 code already implements.

### comment — `nustanakritwithai` · 2026-08-07T11:35:20Z

**Re-audit 2026-08-07** — **ยังไม่ปิด** (มีทั้งโค้ดและ §3.6 แต่ยังไม่ sync)

**สูตรดาเมจ (ship แล้ว):** `atk × damageMultiplier × variance − def × 0.42` (min 1), crit 12% ×1.6 — `DamageSystem.ts` + `formulas.ts`

**ชนกันระหว่าง Blueprint vs โค้ด:**

| พารามิเตอร์      | Blueprint §3.6.12 | โค้ดจริง                       |
| ---------------- | ----------------- | ------------------------------ |
| hitstunMs        | 200               | 180 (`HIT_STUN_MS`)            |
| post-hit i-frame | ไม่ lock          | 120 ms (`HIT_INVULNERABLE_MS`) |
| skill i-frame    | ไม่ lock          | 280 / 420 ms (`SKILL_CONFIG`)  |
| getUp i-frame    | 200               | ยังไม่มี Knockdown/GetUp state |

**ยังไม่ lock:** entity state list เต็ม (Knockdown/GetUp/Ultimate casting), hurtbox spec นอก hitbox ที่มี

**ต้องการจาก Ring 0:** เลือก source of truth ตัวเลข (blueprint vs code) แล้ว sync ก่อนปิด

### comment — `nustanakritwithai` · 2026-08-07T11:38:35Z

## Ring 0 decision — LOCK combat timing

ใช้ค่า Blueprint เป็น source of truth:

- `hitstunMs` = **200ms** (ปรับจากโค้ดปัจจุบัน 180ms)
- i-frame หลังโดนตี = **120ms**
- skill i-frame = **280ms / 420ms** ตาม skill property

Knockdown/GetUp: ให้เริ่มวาง **baseline ตั้งแต่ P4 mob** ไม่รอ P6 boss แต่ทำเฉพาะ framework ขั้นต่ำก่อน เพื่อให้ attack/skill สามารถกำหนดผลเป็น property ได้ และไม่ต้องรื้อ combat state machine ตอนทำ boss

P4 ต้องรองรับอย่างน้อย:

- Hitstun
- Knockback
- Knockdown
- GetUp
- invulnerability window ที่กำหนดจาก action/property

ยังไม่ต้องใส่ boss-specific knockdown rules ใน P4

**Status: LOCKED — ใช้ 200ms และเตรียม Knockdown/GetUp baseline ใน P4**

### comment — `nustanakritwithai` · 2026-08-07T11:39:47Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**LOCKED combat hit numbers** (Blueprint §3.6.12 = source of truth):

| พารามิเตอร์               | ค่า                                                                 |
| ------------------------- | ------------------------------------------------------------------- |
| `hitstunMs` (normal hit)  | **200 ms**                                                          |
| Post-hit i-frame          | **120 ms**                                                          |
| Skill i-frame S1–S3 / Ult | **280 / 420 ms**                                                    |
| Knockdown / GetUp         | เริ่ม **framework ขั้นต่ำตั้งแต่ P4** (elite/boss rules ตาม §3.6.8) |

โค้ดปัจจุบัน (`HIT_STUN_MS=180`) ต้อง sync → 200 ใน implementation PR

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T11:39:48Z

ปิด — Ring 0 ล็อก hit model numbers แล้ว

### comment — `HetCreep` · 2026-08-07T11:41:54Z

@nustanakritwithai ชนกันจริงระหว่าง Blueprint §3.6.12 (200ms) กับโค้ด (180ms `HIT_STUN_MS`) — คุณเขียนโค้ดเอง ช่วยยืนยันว่าเลขไหนตั้งใจจริง (playtest-tuned) แล้วผมจะแก้อีกฝั่งให้ตรง หรือถ้าไม่มีเหตุผลผูกเฉพาะ แนะนำให้โค้ดชนะเพราะ ship+playtest มาแล้ว

### comment — `nustanakritwithai` · 2026-08-07T11:49:32Z

## Final — Ring 0 superseding (HetCreep, 2026-08-07)

**Supersedes** คำถาม 180 vs 200 — **Blueprint = source of truth**

| พารามิเตอร์                    | ค่า LOCKED                    |
| ------------------------------ | ----------------------------- |
| `hitstunMs` (normal basic hit) | **200ms**                     |
| Post-hit i-frame               | **120ms**                     |
| Skill i-frame S1–S3 / Ult      | **280 / 420ms**               |
| `getUp` i-frame                | **200ms** (Blueprint §3.6.12) |

`DamageSystem.ts` ค่า **180** = implementation ยังไม่ sync — **แก้ → 200** ใน implementation PR ที่เหมาะสม

Knockdown/GetUp framework ขั้นต่ำตั้งแต่ P4 (ไม่รอ P6)

**Status: LOCKED — P4 ไม่มี blocker**

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:01:40Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — Blueprint (200ms) เป็น source of truth, DamageSystem.ts HIT_STUN_MS 180 ต้องแก้เป็น 200 ในรอบ implementation ถัดไป (ไม่ใช่ตอนนี้ — เก็บไว้ให้ PR ที่แก้ P4/combat มา sync พร้อมกัน) + เพิ่ม Knockdown/GetUp ขั้นต่ำตั้งแต่ P4 ตามที่เสนอ

### comment — `nustanakritwithai` · 2026-08-07T12:09:44Z

## Supplement — damage formula + entity states (HetCreep, 2026-08-07)

เติมส่วนที่ยังไม่ lock ใน comment ก่อนหน้า (issue ขอ formula/state list ด้วย):

### Damage formula (LOCKED — ใช้โค้ดที่ ship แล้ว)

`amount = max(1, floor((atk × damageMultiplier × variance) − (def × 0.42)))`

- `variance` = ±12% (`DAMAGE_VARIANCE`)
- `ARMOR_MITIGATION` = **0.42**
- Crit: **12%** chance, **×1.6** multiplier
- แหล่ง: `DamageSystem.ts` + `formulas.ts`

### i-frame / timing (LOCKED — supersede comment เก่าทั้งหมด)

| พารามิเตอร์               | ค่า             |
| ------------------------- | --------------- |
| `hitstunMs`               | **200ms**       |
| Post-hit i-frame          | **120ms**       |
| Skill i-frame S1–S3 / Ult | **280 / 420ms** |
| `getUp` i-frame           | **200ms**       |

### Entity states — P4 framework ขั้นต่ำ (LOCKED)

`idle` · `walk` · `attack` · `hit`/`hitstun` · `knockdown` · `getup` · `dead` · skill cast states (per skill slot)

### Hit geometry (LOCKED — ใช้โมเดล P2 ที่มี)

- Basic: horizontal hitbox + `depthTolerance` (ดู #34)
- Radial: skill ที่กำหนด `hitShape: radial` (เช่น S1)
- Hurtbox: `hurtboxRadius` per entity template

**Withdrawn:** คำถาม 180 vs 200 ต่อ implementer — **Blueprint 200ms ชนะ** (ยืนยัน HetCreep แล้ว)

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:09:56Z

## Withdrawn — คำถาม 180 vs 200 ต่อ implementer (HetCreep, 2026-08-07)

Comment ที่ถาม `@nustanakritwithai` ว่าโค้ด 180 ควรชนะ Blueprint หรือไม่ — **ถอนแล้ว**

คำตอบสุดท้าย: **Blueprint 200ms ชนะ** — sync `DamageSystem.ts` ใน implementation PR (ดู Supplement + Final ด้านบน)

Operator: HetCreep | Cursor Agent | 2026-08-07

---

## #42 — GAP: Skill resource/cooldown/ultimate-charge ไม่ระบุ (blocks P3)

_closed · opened by `HetCreep` 2026-08-07T11:02:10Z · closed 2026-08-07T11:39:04Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอ 2/3 lens (data, feeling), confidence สูง.

§3.4 บอกแค่ "3 skills + 1 ultimate ต่อฮีโร่" ไม่มีระบบ mana/energy/cooldown ไม่มีกติกาว่า Ultimate ชาร์จยังไง (เวลา? ดาเมจที่ทำ? โดนตี? per-kill?)

ต้องการ: resource-system design ก่อนเริ่ม P3

### comment — `HetCreep` · 2026-08-07T11:31:52Z

**Partially addressed by Blueprint §3.6.12** (merged upstream via `KatomnoiStudio/LegendOfSoulTH#23`, 2026-08-07): castDelayMs given per skill slot (S1=0/folded into startup, S2=250, S3=320, Ult=480), interruptible defaults to true during cast (false for Monkey King ult wind-up specifically). Still open: no resource pool (mana/energy) confirmed absent — gauge-only model implied but not explicitly locked as the ONLY resource system, no numeric ultimate-charge rate (just "fills from combat").

### comment — `nustanakritwithai` · 2026-08-07T11:34:57Z

**Re-audit 2026-08-07** — **ยังไม่ปิด** (โมเดลชัดในโค้ด แต่ยังไม่ lock ใน Blueprint)

**โมเดลที่ ship แล้ว (P3):**

- S1–S3: **cooldown เท่านั้น** — ไม่มี mana/energy pool
- Ultimate: **gauge 0–100** เติมจากการต่อสู้ ใช้ครั้งเดียวเมื่อเต็ม ไม่มี CD แยก

| พารามิเตอร์               | ค่าในโค้ด                         | แหล่ง                   |
| ------------------------- | --------------------------------- | ----------------------- |
| S1/S2/S3 CD               | 8000 / 6000 / 10000 ms            | `SKILL_CONFIG`          |
| Ult gain basic/skill/kill | 8 / 10 / 25                       | `ULTIMATE_GAUGE_CONFIG` |
| castDelay (blueprint)     | S1=0*, S2=250, S3=320, Ult=480 ms | §3.6.12                 |

**ต้องการจาก Ring 0:** lock ว่า **gauge-only, no mana** เป็นข้อตัดสินอย่างเป็นทางการ + ยืนยันตัวเลข CD/gain หรือปรับก่อนปิด

### comment — `nustanakritwithai` · 2026-08-07T11:38:45Z

## Ring 0 decision — LOCK skill resource

ยืนยันอย่างเป็นทางการว่า combat ใช้ **gauge-only** สำหรับ Ultimate และ **ไม่มี mana/energy pool** เพิ่ม

Baseline ที่ให้ใช้:

- S1 cooldown = **8s**
- S2 cooldown = **6s**
- S3 cooldown = **10s**
- Ultimate gauge gain: basic hit **+8**
- Ultimate gauge gain: skill hit **+10**
- Ultimate gauge gain: kill **+25**
- Ultimate gauge max = **100**

Skill ปกติใช้ cooldown เป็นตัวควบคุมการใช้ ส่วน Ultimate ใช้ gauge 0–100 แยกจาก cooldown ของ S1/S2/S3

ยังไม่เพิ่ม resource layer อื่นใน P4 เพื่อไม่ขยาย scope และไม่ทำให้ combat tuning ซับซ้อนเกินจำเป็น

**Status: LOCKED — P4/P6 ใช้ชุดนี้เป็น baseline**

### comment — `HetCreep` · 2026-08-07T11:39:03Z

**HetCreep confirms officially**: gauge-only resource model, no mana/energy pool — S1-S3 use cooldown only, Ultimate uses a 0-100 gauge filled from combat, no separate CD. Lock the shipped numbers as-is (CD 8000/6000/10000ms, ult gain 8/10/25) unless playtest says otherwise.

### comment — `nustanakritwithai` · 2026-08-07T11:39:47Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**LOCKED skill resource model — gauge-only, no mana/energy pool**

| พารามิเตอร์           | ค่า                        |
| --------------------- | -------------------------- |
| S1 / S2 / S3 cooldown | **8s / 6s / 10s**          |
| Ultimate gauge max    | **100**                    |
| Gain on basic hit     | **+8**                     |
| Gain on skill hit     | **+10**                    |
| Gain on kill          | **+25**                    |
| Mana / energy         | **ไม่มี** — gauge เท่านั้น |

ตรงกับ `SKILL_CONFIG` + `ULTIMATE_GAUGE_CONFIG` ที่ ship แล้ว — lock เป็นข้อตัดสินอย่างเป็นทางการ

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:09:46Z

## Final consolidated — skill resource LOCKED (HetCreep, 2026-08-07)

| พารามิเตอร์                | ค่า                                         |
| -------------------------- | ------------------------------------------- |
| Resource model             | **gauge-only** — **ไม่มี** mana/energy pool |
| S1 / S2 / S3 cooldown      | **8s / 6s / 10s**                           |
| `castDelayMs` S1/S2/S3/Ult | _*0* / 250 / 320 / 480ms_* (*S1 ใน startup) |
| Ult gauge max              | **100**                                     |
| Gain basic / skill / kill  | **+8 / +10 / +25**                          |
| Ult                        | ใช้เมื่อ gauge เต็ม — **ไม่มี CD แยก**      |

แหล่งโค้ด: `SKILL_CONFIG` · `ULTIMATE_GAUGE_CONFIG` · Blueprint §3.6.12

Operator: HetCreep | Cursor Agent | 2026-08-07

---

## #43 — GAP: Currency taxonomy ไม่ระบุจำนวนสกุลเงิน (blocks P8/P9/shop)

_closed · opened by `HetCreep` 2026-08-07T11:02:11Z · closed 2026-08-07T11:39:06Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอ 2/3 lens (truth, feeling), confidence กลาง.

"Currency" ถูกอ้างถึงใน §2/§5.3/§7/§8 เหมือนเป็นสกุลเดียว แต่ไม่มีจุดไหนระบุว่ามีกี่สกุล (soft/hard/premium/stage-material) หรือ exchange rate ระหว่างกัน

ต้องการ: taxonomy ก่อน implement reward-drop/shop table ใด ๆ

### comment — `nustanakritwithai` · 2026-08-07T11:35:24Z

**Re-audit 2026-08-07** — **ยังเปิด**

Blueprint อ้าง "currency" กว้าง ๆ · **โค้ดมีอย่างน้อย 2 สกุล:** ทอง (`gold`) + หยก (`gems`) ใน account/shop

**ยังไม่ lock:** มีกี่สกุลทั้งหมด, soft/hard/premium, material แยก stage, exchange rate

**ต้องการจาก Ring 0:** taxonomy สุดท้ายก่อน reward table / shop / gacha (#38)

### comment — `HetCreep` · 2026-08-07T11:39:05Z

**HetCreep confirms**: 2-currency taxonomy is already the real design, not just an accident — gold = soft currency (sources: quest/drop/topup), gems = hard/premium currency (sources: topup/coupon). This was already enforced at the DB layer (`earn_gold`/`redeem_coupon` RPC CHECK constraints) before this issue was filed. No stage-material sub-currency planned yet — add a new issue if/when that becomes real design work, not now.

### comment — `nustanakritwithai` · 2026-08-07T12:09:46Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Currency taxonomy LOCKED (2 สกุล):**

| สกุล           | ประเภท        | แหล่ง                |
| -------------- | ------------- | -------------------- |
| **gold** (ทอง) | soft currency | quest / drop / topup |
| **gems** (หยก) | hard/premium  | topup / coupon       |

- บังคับที่ DB layer แล้ว (`earn_gold` / `redeem_coupon` RPC constraints)
- **ไม่มี** stage-material sub-currency ตอนนี้ — เปิด issue ใหม่เมื่อมี design จริง
- ผูก gacha cost (#38) จาก gems เมื่อถึง P9

Operator: HetCreep | Cursor Agent | 2026-08-07

---

## #44 — GAP: PvP netcode/authority model ไม่ระบุ (blocks P12) — architecture-level

_closed · opened by `HetCreep` 2026-08-07T11:02:12Z · closed 2026-08-07T12:01:43Z_

**Source**: ask-CB 3-lens gap scan, 2026-08-07 — เจอ 1 lens (feeling) แต่ confidence สูง เพราะเป็นการตัดสินใจระดับ architecture ที่แก้ทีหลังยาก.

§8 บอกแค่ว่าข้อมูลสำคัญเป็น "server authority" ไม่มี networking model สำหรับ realtime 1v1 action combat เลย (client-predicted+server-reconciled? lockstep? server-authoritative full-sim?) — เป็นการตัดสินใจที่กระทบโครงสร้างโค้ดทั้งระบบ ยิ่งตัดสินใจช้ายิ่งย้อนกลับแพง

ต้องการ: ตัดสินใจ networking model ก่อนเริ่ม P12 (ยังไกลจากตอนนี้ แต่ P1/P2 ที่ implement ไปแล้วควรออกแบบให้รองรับโมเดลที่เลือกไว้แต่ต้น ไม่ใช่ทำ P1-P11 แบบ client-only แล้วมาแก้ทีหลัง)

### comment — `nustanakritwithai` · 2026-08-07T11:35:24Z

**Re-audit 2026-08-07** — **ยังเปิด** (architecture, ก่อน P12)

Blueprint §8: server authority สำหรับข้อมูลสำคัญ แต่ **ไม่มี realtime 1v1 netcode model**

**ต้องการจาก Ring 0 (ควรตัดสินก่อน P12 แต่ควรรู้ทิศทางก่อน P4+):** client-predicted + server reconcile vs lockstep vs full server sim — กระทบว่า combat state ต้อง deterministic แค่ไหน

### comment — `HetCreep` · 2026-08-07T11:41:57Z

@nustanakritwithai เสนอ client-predicted + server-reconcile สำหรับ PvP netcode (มาตรฐาน realtime 1v1 action game) — ยังไกลจาก P12 แต่ P1-P3 ที่ ship แล้วควรออกแบบให้รองรับโมเดลนี้ตั้งแต่ต้นไหม หรือคุณเห็นทางอื่นที่เหมาะกับ stack ปัจจุบันมากกว่า (Supabase realtime, ฯลฯ)?

### comment — `nustanakritwithai` · 2026-08-07T11:49:33Z

## Ring 0 direction (HetCreep, 2026-08-07)

**P12 netcode model:** client prediction + authoritative server + reconciliation

**P1–P3 / P4–P11:** ออกแบบ combat state/action ให้ **deterministic + serializable** เท่าที่สมเหตุผล, อย่าให้ client-owned valuable state ฝังลึก — **ไม่ retrofit netcode ตอนนี้**, ไม่เพิ่ม networking scope เข้า P4–P11

Blueprint: valuable state → server authority (§8); PvP prototype = P12

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T12:01:42Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — client-predicted + server-reconcile เป็นทิศทาง P12 netcode, ออกแบบ P4-P11 ให้ deterministic/serializable เท่าที่สมเหตุผลไว้ล่วงหน้า ไม่ retrofit ตอนนี้

---

## #46 — GAP: §3.9 อ้างถึงแต่ไม่มีอยู่จริงในเอกสาร (Ultimate wind-up interrupt rules)

_closed · opened by `HetCreep` 2026-08-07T12:26:01Z · closed 2026-08-07T12:33:53Z_

**Source**: ask-CB (CoalBoard) 3-lens rescan รอบ 2 บน `docs/MASTER_BLUEPRINT_v3.0.md` (508 บรรทัด), 2026-08-07 — ยืนยันด้วย grep เองแล้ว ไม่ใช่แค่ lens เดา

§3.6.1 (บรรทัด 158) และ §3.6.12 (บรรทัด 298) อ้างถึง "§3.9" สองครั้งสำหรับกติกา Ultimate wind-up interrupt ("Monkey King ult — see §3.9") แต่เอกสารกระโดดจาก §3.7 (บรรทัด 307) ไป §4 (บรรทัด 325) ตรง ๆ — **§3.9 ไม่มีอยู่จริง**

ต้องการ: เขียน §3.9 จริง หรือแก้ reference ให้ชี้ไปที่ section ที่มีจริง ก่อน implement P3/P6

### comment — `nustanakritwithai` · 2026-08-07T12:31:49Z

placeholder

### comment — `nustanakritwithai` · 2026-08-07T12:33:52Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Doc reference bug — ไม่สร้าง §3.9 ใหม่**

| หัวข้อ                | คำตอบ LOCKED                                              |
| --------------------- | --------------------------------------------------------- |
| อ้างอิงที่ถูกต้อง     | **§3.7** (Monkey King Ultimate) — ไม่มี §3.9              |
| `targetLock`          | `'nearest'` (skill-specific exception เท่านั้น)           |
| Clone/setup wind-up   | **`interruptible: false`** (uninterruptible)              |
| Strike phases (4 รอบ) | แต่ละ phase ใช้ **per-phase rules** ผ่าน `phaseOverrides` |

**Action:** แก้ cross-reference §3.9 → §3.7 ใน Blueprint; ขยาย §3.7 ด้วย interrupt model ข้างต้น

**OUT of scope:** ไม่สร้าง section ใหม่

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:33:53Z

ปิด — Ring 0 ล็อก doc reference + Ultimate interrupt model แล้ว

### comment — `HetCreep` · 2026-08-07T12:47:08Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกตามที่เสนอ

---

## #47 — GAP: Hero kit schema (§3.6.7/§3.7) ใช้ได้แค่ตัวตี ไม่รองรับ Control/Summoner/Support

_closed · opened by `HetCreep` 2026-08-07T12:26:01Z · closed 2026-08-07T13:00:24Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง

§3.6.7 per-move schema มีแต่ field เกี่ยวกับดาเมจ (hitstunMs, knockback, knockdown, multiTarget) — ไม่มี field สำหรับ healAmount, buffType, ccType/ccDurationMs, targetsAllies, หรือ summon-entity แต่ §4.1 สัญญาไว้ว่าต้องมี archetype Control/Summoner/Support จริง §3.7 บอกว่า "other heroes follow the same per-hero kit file pattern" แต่ pattern ปัจจุบันรองรับแค่ Fighter/Ranged-style

ต้องการ: ขยาย schema รองรับ non-damage skill ก่อนออกแบบฮีโร่ตัวที่ 2 ที่ไม่ใช่ melee

### comment — `nustanakritwithai` · 2026-08-07T13:00:23Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Hero kit schema — extend §3.6.7 for non-damage archetypes (P10 gate)**

| หัวข้อ             | คำตอบ LOCKED                                                                          |
| ------------------ | ------------------------------------------------------------------------------------- |
| Pattern            | Optional `effects[]` on move — **ไม่บังคับทุกท่า** (เหมือน `phaseOverrides`)          |
| Damage moves       | ใช้ hitbox fields เดิม — ไม่ต้องมี `effects[]`                                        |
| `effects[]` kinds  | `damage` / `heal` / `buff` / `debuff` / `cc` / `summon`                               |
| Targets            | `self`, `singleEnemy`, `nearestEnemy`, `allEnemies`, `singleAlly`, `allAllies`, `aoe` |
| Archetype metadata | `archetype` ใน hero kit file (Fighter/Ranged/Control/Summoner/Support/…)              |
| Summoner           | `summon` effect → reuse spawn/entity pool — **ไม่สร้าง AI core ใหม่**                 |
| Support/Control    | heal/buff/cc ใช้ §3.1 battle coordinates + hit reaction framework เดิม                |

**OUT of scope:** combat engine แยกต่อ archetype, mandatory effects ทุก move

Blueprint §3.6.7 updated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T13:00:24Z

ปิด — Ring 0 ล็อก effects[] schema สำหรับ non-damage archetypes แล้ว

### comment — `nustanakritwithai` · 2026-08-07T13:10:43Z

## CONFIRMED — Ring 0 architecture (HetCreep, 2026-08-07)

**Supersedes** prior delivery — architecture **CONFIRMED**:

- `effects[]` = **optional** data-driven extension of hero skill/move schema
- Kinds: **heal, buff, cc, summon** (minimum set)
- Fighter/Ranged skills **do not require** `effects[]`
- **No separate skill system per archetype** — one shared schema

Blueprint §3.6.7 updated (CONFIRMED tag)

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T13:14:20Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อก effects[] schema (heal/buff/cc/summon) สำหรับ non-damage archetype ตามที่เสนอ

---

## #48 — GAP: Stage variation types (§5.2) มีแค่ชื่อ ไม่มีกติกา

_closed · opened by `HetCreep` 2026-08-07T12:26:02Z · closed 2026-08-07T12:52:27Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — เจอตรงกันทั้ง 3 lens, confidence สูง

§5.2 ต้องการ "variation" 7 แบบ (Survival, Defend, Chase, Hazard, Mini-boss, Time Attack, Custom objectives) แต่ไม่มีสักแบบที่มี win/lose condition, timer, หรือ spawn parameter — บล็อก P5 (stage 1-1 อาจรอดเพราะแค่ Start→Fight→Clear) และ P7 (Chapter/Stage system) แน่นอน

ต้องการ: schema ของแต่ละ stage-type อย่างน้อย win/lose condition ก่อน P7

### comment — `nustanakritwithai` · 2026-08-07T12:52:26Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Stage variation types — P5 baseline LOCKED**

§5.2 ขยายจากชื่อ 7 แบบ → **contract ขั้นต่ำ** ต่อ type (win/lose + baseline params) + **shared `StageVariation` schema**

| Type           | Win (สรุป)                                             | Lose (สรุป)                                      |
| -------------- | ------------------------------------------------------ | ------------------------------------------------ |
| **survival**   | clear wave สุดท้ายครบ (`totalWaves`)                   | player/party HP = 0                              |
| **defend**     | objective HP > 0 เมื่อหมดเวลา หรือ clear reinforcement | `objectiveHP <= 0` หรือ wipe                     |
| **chase**      | `targetHP <= 0` ก่อนถึง escape                         | target ถึง `escapeThreshold` / wipe / time       |
| **hazard**     | primary objective สำเร็จ                               | wipe (enemy/hazard) หรือ fail objective          |
| **miniBoss**   | mini-boss ทั้งหมดตาย                                   | wipe หรือ time (ถ้ามี)                           |
| **timeAttack** | `targetGoal` สำเร็จ                                    | wipe หรือ hard time limit                        |
| **custom**     | กำหนดเองชัดเจน                                         | กำหนดเองชัดเจน — **ห้าม**ใช้ bypass type มาตรฐาน |

**Architecture rules:**

- Stage type = **data/config contract** — ไม่สร้าง combat/AI engine แยกต่อ type
- Reuse P4: Enemy AI, movement, targeting, damage, interrupt, knockdown
- Hazard zones → §3.1 battle coordinates (#51) — ห้าม raw render Z/Y
- Mini-boss → §3.6.8 Elite contract (#52) — ไม่สร้าง AI core ใหม่

**Stage layer:** `Config → Objective → Spawn → Condition Tracking → Win/Lose → Result`

**P5 scope:** contract + runtime framework เท่านั้น — ยังไม่ต้อง cinematic/formation/scripted pathing/custom AI/final balance/full content

ตัวเลข (HP, waves, spawn rate, timer) = per-stage tuning ภายหลัง

Blueprint §5.2 updated · cross-ref §3.1, §3.6.8, §10 P5, §11

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:52:27Z

ปิด — Ring 0 ล็อก Stage Variation contract สำหรับ P5 แล้ว

### comment — `HetCreep` · 2026-08-07T13:14:22Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อก StageVariation contract (win/lose ต่อ type) สำหรับ P5 ตามที่เสนอ

---

## #49 — GAP: Per-move schema (§3.6.7) ตามเนื้อหาที่ล็อกไปแล้วไม่ทัน

_closed · opened by `HetCreep` 2026-08-07T12:26:03Z · closed 2026-08-07T12:33:53Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — เจอ 2/3 lens ตรงกันในหลายจุดย่อยที่รากเดียวกัน

§3.6.7 ล็อก schema ไว้แล้ว แต่เนื้อหาที่ล็อกทีหลัง (§3.6.9, §3.6.12, §3.7) ต้องการ field ที่ schema ไม่มี:

1. `interruptible` เป็น flag เดียวต่อท่า แต่ §3.6.12 ต้องการ interrupt ต่างกันคนละ phase (Ultimate wind-up: false เฉพาะ clone/setup phase)
2. ไม่มี field displacement ระหว่าง AttackActive — S3 "skill-driven leap displacement... slam on landing" (§3.7) ต้องการ แต่ `lungeDistance`/`movementDuringCast` ไม่ครอบคลุม
3. ไม่มี field สำหรับ skill หลายจังหวะ — Ultimate "4 strike phases" (§3.7) ต้องการ sequence ของ AttackDefinition แต่ schema รองรับแค่ 1 startup/active/recovery ต่อท่า
4. Boss "Invulnerable" ระหว่าง PhaseTransition (§3.6.9) ไม่มี field ใน schema เลย

ต้องการ: revise §3.6.7 schema ให้ครอบคลุมของที่ล็อกไปแล้วจริง ก่อน implement P3 (Ultimate) และ P6 (Boss phase)

### comment — `nustanakritwithai` · 2026-08-07T12:31:50Z

placeholder

### comment — `nustanakritwithai` · 2026-08-07T12:33:52Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Per-move schema — phase-aware แต่ไม่บังคับทุกท่า**

| หัวข้อ         | คำตอบ LOCKED                                                                           |
| -------------- | -------------------------------------------------------------------------------------- |
| Base field     | `interruptible: boolean` — **move-level default**                                      |
| Phase override | `phaseOverrides` (optional) — `cast` / `startup` / `active` / `recovery`               |
| กฎ             | **ไม่บังคับ** phase-interruptible data ทุกท่า — ใส่ override เฉพาะท่าที่ phase ต่างกัน |
| P4 enemy moves | **schema เดียวกัน** กับ player attacks/skills                                          |

**ตัวอย่าง:** Monkey King Ult — default `interruptible: false` สำหรับ clone/setup; strike phases override ทีละ phase

**OUT of scope:** state framework ใหญ่, mandatory per-phase fields ทุก move

Blueprint §3.6.7 updated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:33:53Z

ปิด — Ring 0 ล็อก interruptible default + phaseOverrides schema แล้ว

### comment — `HetCreep` · 2026-08-07T12:47:09Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกตามที่เสนอ

---

## #50 — GAP: PC movement keys ไม่เคยระบุ (มีแค่ attack/skill keybind)

_closed · opened by `HetCreep` 2026-08-07T12:26:04Z · closed 2026-08-07T12:33:53Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07

§3.3 "PC keybinds (LOCKED)" ระบุแค่ Attack/S1/S2/S3/Ultimate — ไม่มีคีย์สำหรับเดิน (up/down/left/right/diagonal) ที่ §3.1 ล็อกไว้เป็นแกนหลัก มือถือมี joystick แต่ PC ไม่มี equivalent ที่ระบุชัด (WASD? Arrow keys?)

ต้องการ: ล็อกคีย์เดิน PC ก่อน P1 implementation (หรือถ้า implement ไปแล้วจริง ให้ backfill เข้า blueprint)

### comment — `nustanakritwithai` · 2026-08-07T12:31:51Z

placeholder

### comment — `nustanakritwithai` · 2026-08-07T12:33:52Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**PC movement keys — LOCKED**

| Action             | Keys                                                                |
| ------------------ | ------------------------------------------------------------------- |
| **Movement**       | `W` `A` `S` `D` **และ** Arrow Keys — **เทียบเท่า virtual joystick** |
| Diagonal           | จาก simultaneous key press (เช่น W+D)                               |
| Attack             | `J` / `Space` (ไม่เปลี่ยน)                                          |
| S1 / S2 / S3 / Ult | `1`/`E` · `2`/`R` · `3`/`F` · `4`/`Q` (ไม่เปลี่ยน)                  |

Blueprint §3.3 updated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:33:53Z

ปิด — Ring 0 ล็อก PC movement keys แล้ว

### comment — `HetCreep` · 2026-08-07T12:47:10Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกตามที่เสนอ

---

## #51 — GAP: ระบบพิกัด 2.5D จริง ๆ ไม่เคยนิยาม (บล็อก P1 เอง)

_closed · opened by `HetCreep` 2026-08-07T12:26:05Z · closed 2026-08-07T12:33:53Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — 1 lens เจอ แต่สำคัญมากเพราะเป็นรากฐานของทุกอย่าง

§3.1 บอกแค่ "up/down = depth positioning" และ "movement/attack direction แยกระบบ" แต่ไม่เคยบอกว่าระบบพิกัดจริงคืออะไร — true Z-axis, second screen-Y, หรือ projected จาก isometric Y? P1 (Movement/Depth) implement ไปแล้วจริง (`battleCoordinates.ts`) — เอกสารควร backfill ให้ตรงกับที่ ship จริง เพื่อกัน implementer คนถัดไปเดาผิด

ต้องการ: ยืนยัน/บันทึกโมเดลพิกัดจริงจากโค้ดที่ shipped ลง blueprint §3.1

### comment — `nustanakritwithai` · 2026-08-07T12:31:51Z

placeholder

### comment — `nustanakritwithai` · 2026-08-07T12:33:52Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Coordinate contract — doc backfill P1 (ไม่สร้าง model ใหม่)**

| Axis                           | Canonical meaning                         | Source of truth                                |
| ------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| **battle X**                   | Horizontal left / right                   | `src/game/realtimeBattle/battleCoordinates.ts` |
| **battle depth** (`runtime.y`) | Screen-plane up/down (front ↔ back arena) | same file                                      |

**Rendering contract:** presentation maps battle coords → Three.js (`runtime.x` → `worldX`, `runtime.y` → `worldZ`; `worldY` = height only).

**Combat rule:** logic/collision/AI/hitboxes ใช้ canonical battle X + depth เท่านั้น — **ห้าม** ใช้ raw render Z/Y แทน depth

Blueprint §3.1 backfilled to match shipped code

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:33:53Z

ปิด — Ring 0 ล็อก coordinate contract (P1 backfill) แล้ว

### comment — `HetCreep` · 2026-08-07T12:47:12Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกตามที่เสนอ

---

## #52 — GAP: "Elite" enemy tier ถูกอ้างถึงหลายที่แต่ไม่เคยนิยาม

_closed · opened by `HetCreep` 2026-08-07T12:26:06Z · closed 2026-08-07T12:33:53Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — เจอ 2/3 lens

§5.2 ("Wave → Wave → Elite"), §3.6.8 และ §3.6.12 ("Elite/boss... ไม่ default สำหรับ mob ปกติ") อ้างถึง Elite เป็น tier ศัตรูแยกจาก normal mob กับ boss แต่ไม่มีจุดไหนนิยามว่าอะไรทำให้เป็น Elite (stat multiplier? spawn rule? AI ต่างจาก mob ปกติยังไง?)

ต้องการ: นิยาม Elite tier ก่อน P4 (ถ้าจะมีใน early enemy roster) หรือย้ายไป P5/P7 explicit ถ้ายังไม่ใช้ตอนนี้

### comment — `nustanakritwithai` · 2026-08-07T12:31:52Z

placeholder

### comment — `nustanakritwithai` · 2026-08-07T12:33:52Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Elite enemy tier — LOCKED**

| หัวข้อ                 | คำตอบ                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| นิยาม                  | **Tier ระหว่าง normal mob กับ boss** — ไม่ใช่ boss ย่อส่วน / mini-boss |
| AI core                | **เดียวกับ normal mob** (Enemy AI core ร่วม)                           |
| Phase system           | **ไม่มีโดย default**                                                   |
| สิ่งที่ Elite เพิ่มได้ | cast bar, enhanced telegraph, per-move knockdown/armor, moveset เพิ่ม  |
| Normal mob knockdown   | **ไม่มี** (P4 baseline — hitstun only)                                 |
| Elite knockdown        | **ได้** ตาม per-move `knockdown` flag                                  |

Blueprint §3.6.8 updated (enemy tiers table + state machine)

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T12:33:53Z

ปิด — Ring 0 ล็อก Elite tier definition แล้ว

### comment — `HetCreep` · 2026-08-07T12:47:13Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกตามที่เสนอ

---

## #53 — GAP: Skill Level ไม่มีกติกาว่า level ขึ้นแล้วได้อะไร

_closed · opened by `HetCreep` 2026-08-07T12:26:07Z · closed 2026-08-07T13:00:25Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — เจอ 2/3 lens

§4.2 ล็อกชื่อ layer "Hero Level → Star → Skill Level" แต่ไม่มีจุดไหนบอกว่า skill level ขึ้นแล้วเปลี่ยนอะไร (ดาเมจ%? cooldown ลด? cast delay เปลี่ยน? ทั้งหมด?) คนละเรื่องกับ resource-model ที่ล็อกไปแล้ว (#42, ปิดแล้ว)

ต้องการ: กติกาว่า skill-level-up ให้ผลอะไร ก่อน P8

### comment — `nustanakritwithai` · 2026-08-07T13:00:23Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Skill Level rules — P8 baseline LOCKED**

| หัวข้อ                   | คำตอบ                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Scope                    | Per-slot levels: S1 / S2 / S3 / Ultimate (แยกกัน)                                         |
| Max level                | **10** ต่อ slot (แยกจาก hero level cap 60 — #40)                                          |
| **Primary effect**       | `damageMultiplier` หรือ `healMultiplier` ต่อ skill level — กำหนดใน kit config             |
| **Secondary (optional)** | `cooldownReductionMs`, `effectAmount` — เฉพาะ skill ที่ kit row ระบุ                      |
| **NOT by default**       | `castDelayMs` / animation phase timing — คงที่เว้นแต่ skill ตั้ง `scalesCastTiming: true` |
| Upgrade cost             | Materials + gold — **config table, tune ที่ P8**                                          |

**Config shape:** `skillLevelScaling { damageMultiplierPerLevel?, healMultiplierPerLevel?, cooldownReductionMsPerLevel?, maxBonusCooldownReductionMs? }`

ตัวเลข % ต่อ level = **P8 tuning** — Ring 0 lock เฉพาะ **อะไรเปลี่ยน** และ **data-driven per skill**

Blueprint §4.2.1 updated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T13:00:24Z

ปิด — Ring 0 ล็อก Skill Level rules สำหรับ P8 แล้ว

### comment — `nustanakritwithai` · 2026-08-07T13:10:44Z

## PARTIALLY SUPERSEDED — Ring 0 (HetCreep, 2026-08-07)

**Withdrawn (not Ring 0 lock):**

- ~~max skill level = 10~~
- ~~specific damage/heal % per level~~
- ~~upgrade cost numbers~~

**Architecture lock (still valid):**

- Skill Level = **per-slot** progression (S1/S2/S3/Ult)
- Scaling = **data-driven** per skill kit
- Skill definitions must support **progression parameters** (`skillLevelScaling` structure)
- damage/heal/effect scaling **may** be defined per skill

**Numerical TBD → P8:** maxLevel, % scaling, CD/cast-delay scaling, costs, curve

Blueprint §4.2.1 updated — architecture vs numerics separated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T13:14:23Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกเฉพาะ architecture (per-slot skill level, data-driven scaling) ตัวเลขจริง (max level/%, cost) เลื่อนไป P8 ตามที่ withdraw เอง

---

## #54 — GAP: สูตร star ascension (duplicate ต้องกี่ตัวต่อ 1 star) ไม่มี

_closed · opened by `HetCreep` 2026-08-07T12:26:08Z · closed 2026-08-07T13:00:25Z_

**Source**: ask-CB 3-lens rescan รอบ 2, 2026-08-07 — เจอ 2/3 lens

§4.1/§4.3 บอกว่า duplicate hero → star ascension และ power-gap ระหว่าง star ถูกล็อกไว้แล้วที่ 130% (#35, ปิดแล้ว) แต่ไม่มีจุดไหนบอกว่าต้องใช้ duplicate กี่ตัวถึงขึ้น 1 star หรือใช้ material/currency อะไรร่วม — คนละเรื่องกับ % gap ที่ล็อกแล้ว

ต้องการ: สูตร duplicate-to-star conversion ก่อน P9

### comment — `nustanakritwithai` · 2026-08-07T13:00:23Z

## Resolved — Ring 0 (HetCreep, 2026-08-07)

**Star ascension formula — P9 baseline LOCKED**

| หัวข้อ               | คำตอบ                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Max star             | **★6**                                                                |
| Material per +1 star | **1 duplicate** same `characterId` (★n → ★n+1) — default baseline     |
| At ★6 overflow       | Convert to **hero shards** (same character) — shard uses = P9 economy |
| Optional soft cost   | Gold + materials via config — amounts tune ที่ P9                     |
| Stat cap             | #35: **★6 ≤ 130% ★1**                                                 |
| Default formula      | `statMultiplier(star) = 1 + (star − 1) × 0.06` → ★6 = 1.30            |

**Config shape:** `starAscensionCosts[2..6] = { duplicates, gold?, materialId?, materialQty? }`

**Rule:** duplicate-to-star เป็น **config-driven** — default 1 dup/+1 star เป็น initial baseline ไม่ใช่ hard-coded constant

Gacha rate/pity/cost ยัง **P9** (#38) — คนละเรื่องกับ conversion formula

Blueprint §4.3.1 updated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `nustanakritwithai` · 2026-08-07T13:00:24Z

ปิด — Ring 0 ล็อก star ascension formula สำหรับ P9 แล้ว

### comment — `nustanakritwithai` · 2026-08-07T13:10:45Z

## PARTIALLY SUPERSEDED — Ring 0 (HetCreep, 2026-08-07)

**Withdrawn (not Ring 0 lock):**

- ~~1 duplicate = +1★~~
- ~~statMultiplier formula 0.06/step~~
- ~~shard overflow rules~~

**Architecture lock (still valid):**

- Star Ascension = **data-driven** per-star configuration
- Config supports duplicates / materials / currency / stat outcomes per tier
- Must respect **#35** power-gap constraint (★6 ≤ 130% ★1)

**Numerical TBD → P9:** duplicate/material/currency per star, per-star stats, final ★ cap (if not locked elsewhere), exact formula

Blueprint §4.3.1 updated — architecture vs numerics separated

Operator: HetCreep | Cursor Agent | 2026-08-07

### comment — `HetCreep` · 2026-08-07T13:14:24Z

**HetCreep อนุมัติจริง** (verified nustanakritwithai user.login) — ล็อกเฉพาะ architecture (data-driven star ascension config, ต้องเคารพ #35 130% cap) ตัวเลขจริง (duplicate/material/formula) เลื่อนไป P9 ตามที่ withdraw เอง

---

## #80 — GAP: Hero Kit (#12) Done-criterion #2 ยังไม่ re-verify หลัง PR #61

_closed · opened by `HetCreep` 2026-08-08T12:37:34Z · closed 2026-08-09T18:34:43Z_

**บริบท** (TASKS.md row 20, MEMORY.md item 144):

Row 20 (Hero Kit / Archetype System) เดิมตั้งใจ**ไม่**เพิ่ม `castDelayMs`/`interruptible`/`movementDuringCast`/`hitstunMs`/knockdown-flag/`multiTarget`/`lungeDistance` เข้า `AttackDefinition` เพราะฟิลด์พวกนี้เป็นของ Per-Move-Property-Schema (#5, row 13) ซึ่งมี contract เดิมว่า "no field ahead of a real consumer" — เพิ่มฟิลด์เข้า Hero Kit โดยไม่มี Hero-Kit-owned consumer จะผิด Done-criterion #2 ของ #5

PR #61 กลับเพิ่ม `castDelayMs`/`movementDuringCast`/`multiTarget` เข้า `AttackDefinition` จริง — สวนทาง stance เดิมของ row 20 โดยไม่ได้ re-check กับ contract ของ #5

**สถานะตอนนี้**: #5 (Per-Move Property Schema) graduated แล้ว (row 13, PR #54) — บล็อกเดิมอาจ moot ไปแล้ว แต่**ไม่มีใคร verify จริง**

**ขอให้ทำ**: verify Done-criterion #2 ของ #5 ยังผ่านอยู่ไหมหลังฟิลด์ใหม่จาก PR #61 เข้ามา แล้วอัปเดต TASKS.md row 20 จาก 90%→100% ถ้าผ่าน (หรือระบุว่ายังไม่ผ่านตรงไหนถ้าไม่ผ่าน)

---

_Filed from `KatomnoiStudio/LegendOfSoulTH` session sweep, 2026-08-08 — ดู `TASKS.md` row 20 / `MEMORY.md` item 144 สำหรับรายละเอียดเต็ม_

### comment — `HetCreep` · 2026-08-08T13:08:47Z

คำตอบจาก HetCreep (Ring 0): **0** — schema เพิ่ม field แล้วแต่ยังไม่มี runtime consumer อ่านค่าจริง นับเสร็จไม่ได้ คง row 20 + DF20 ที่ 90% จนกว่า consumer PR จะ land ดูรายละเอียดที่ https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/61#issuecomment-5226239810

---

## #81 — TUNE: per-hero finisher numbers ยังเป็น placeholder

_closed · opened by `HetCreep` 2026-08-08T12:37:46Z · closed 2026-08-09T18:34:37Z_

**บริบท** (MEMORY.md "Still open" list): เลข finisher damage/effect ต่อฮีโร่แต่ละตัวยังไม่ล็อกเป็นเลขจริง — ปัจจุบัน cover ไว้ด้วย `nonProductionBalance` banner ในเกม (progressionConfig.ts)

**ขอบเขต**: กำหนดเลข finisher จริงต่อฮีโร่ (ไม่ใช่ placeholder/estimate) ให้พร้อม production

**เงื่อนไขปิดงาน**: ตัวเลขผ่าน manual playtest round เต็ม (ไม่ใช่แค่ unit test) ก่อนถอด `nonProductionBalance` banner ออก — ดู MEMORY.md item 36 สำหรับ P8 balance lock context ที่ผูกกับ banner นี้

---

_Filed from `KatomnoiStudio/LegendOfSoulTH` session sweep, 2026-08-08_

### comment — `HetCreep` · 2026-08-08T13:08:48Z

คำตอบจาก HetCreep (Ring 0): **0** — ยังไม่ได้กำหนดตัวเลข finisher อย่างเป็นทางการ ห้าม agent เดาค่าเองแล้ว pick งานนี้ตอนนี้

---

## #82 — TUNE: Lv11+ EXP formula ยังเป็น placeholder

_closed · opened by `HetCreep` 2026-08-08T12:37:57Z · closed 2026-08-09T18:34:30Z_

**บริบท** (MEMORY.md "Still open" list): สูตร EXP สำหรับ level 11 ขึ้นไปยัง tunable/placeholder อยู่ — ปัจจุบัน cover ไว้ด้วย `nonProductionBalance` banner ในเกม (progressionConfig.ts)

**ขอบเขต**: กำหนดสูตร EXP จริงสำหรับ Lv11+ ให้พร้อม production (สูตรปัจจุบัน tune ไว้แค่ถึงระดับต้น ๆ)

**เงื่อนไขปิดงาน**: สูตรผ่าน manual playtest round เต็ม (curve เล่นแล้วรู้สึกโอเค ไม่ใช่แค่ unit test ผ่าน) ก่อนถอด `nonProductionBalance` banner ออก — ดู MEMORY.md item 36 สำหรับ P8 balance lock context ที่ผูกกับ banner นี้

---

_Filed from `KatomnoiStudio/LegendOfSoulTH` session sweep, 2026-08-08_

### comment — `HetCreep` · 2026-08-08T13:08:49Z

คำตอบจาก HetCreep (Ring 0): **0** — สูตร Lv11+ ยังเป็น placeholder ยังไม่ล็อกเป็นสูตรสมดุลสุดท้าย

---

## #85 — Upstream skill source(s) have new commits

_open · opened by `github-actions[bot]` 2026-08-10T04:20:45Z_

## `affaan-m/ECC`

- ใช้เพื่อ: global rules cherry-picked manually per SKILL_REGISTRY.md (frozen policy, not vendored in this repo)
- commit ใหม่กว่าที่บันทึกไว้ **19** ตัว
- เทียบ: https://github.com/affaan-m/ECC/compare/623f2c020f052319657674e4e6c29ab5d0ad566b...ae303fb6c19e3f7cb88cb9fd9f15ddcf235294b6
- SHA เดิม -> ใหม่: `623f2c020f052319657674e4e6c29ab5d0ad566b` -> `ae303fb6c19e3f7cb88cb9fd9f15ddcf235294b6`

---
