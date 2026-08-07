# Legend of Soul TH — Blueprint v2.0 Migration Audit

> **Audit date**: 2026-08-07  
> **Branch**: `cursor/blueprint-v2-e117`  
> **Base commit**: `4f76a6d` (`upstream/master`)  
> **Blueprint**: [`MASTER_BLUEPRINT_v2.0.md`](MASTER_BLUEPRINT_v2.0.md)  
> **Supersedes**: [`BLUEPRINT_GAP_ANALYSIS.md`](BLUEPRINT_GAP_ANALYSIS.md) (v1.0 era)  
> **Scope**: Classify only — **no gameplay changes** in this audit PR

---

## 0. Repository topology

| Item                         | Fact                                             | Status                  |
| ---------------------------- | ------------------------------------------------ | ----------------------- |
| Canonical remote             | `upstream` → `KatomnoiStudio/LegendOfSoulTH`     | ALIGNED                 |
| Practice fork                | `origin` → `nustanakritwithai/GameTurnBase`      | ALIGNED                 |
| Fork divergence (2026-08-07) | fork **45 ahead**, **62 behind** upstream        | PARTIAL — sync needed   |
| Live site                    | https://katomnoistudio.github.io/LegendOfSoulTH/ | ALIGNED                 |
| Game version                 | `GAME_INFO.version` = **0.4.0**                  | ALIGNED                 |
| Client architecture today    | React 19 + TS + Vite + R3F lobby + localStorage  | PARTIAL (no server yet) |

**Sync note:** Fork issues #19–#25 were filed against v1.0 assumptions (premium model, 360° arena movement). **v2.0 supersedes those product decisions** — fork issues need human re-triage, not automatic closure by this PR.

---

## 1. Summary matrix

| Area                       | Status              | Priority                  |
| -------------------------- | ------------------- | ------------------------- |
| Turn-based                 | SUPERSEDED          | P0 — classify only (done) |
| Realtime combat core       | PARTIAL             | P1–P5                     |
| Top-down battle camera     | LEGACY              | P1–P2                     |
| 2.5D movement (depth axis) | PARTIAL             | **P1**                    |
| Attack facing L/R only     | MISSING             | P2–P3                     |
| Depth alignment hit model  | MISSING             | P2–P3                     |
| 360° / cone attacks        | LEGACY              | P3                        |
| 2D HD battle sprites       | ALIGNED             | maintain                  |
| 3D/GLB character pipeline  | LEGACY              | deprecate gradually       |
| Stage/chapter adventure    | MISSING             | P7–P9                     |
| Hero roster                | PARTIAL             | P10–P12                   |
| Gacha / stars              | MISSING             | P12                       |
| Equipment / loot RPG       | MISSING             | P11                       |
| Monetization (gacha core)  | MISSING             | P12–P13                   |
| Demo top-up shop UI        | LEGACY / SUPERSEDED | re-triage #19             |
| PvP / matchmaking / rank   | MISSING             | P14–P16                   |
| Backend / server authority | MISSING             | P13+                      |
| Save (client)              | PARTIAL             | migrate later             |
| Tests / CI                 | ALIGNED             | maintain                  |
| Docs / MEMORY              | PARTIAL → this PR   | P0                        |
| Exploration subsystem      | LEGACY              | isolate, do not expand    |

---

## 2. Detailed findings

### 2.1 Turn-based

| Evidence                                                                       | Status                   |
| ------------------------------------------------------------------------------ | ------------------------ |
| `src/game/battle/engine.ts` deleted                                            | SUPERSEDED               |
| `src/game/battle/types.ts`, `formulas.ts` still imported                       | LEGACY (adapter/helpers) |
| `src/game/realtimeBattle/BattleResultAdapter.ts` maps to legacy `BattleResult` | LEGACY                   |
| `docs/battle-realtime-migration-audit.md` frames turn→top-down migration       | SUPERSEDED               |
| Live combat path: `LobbyBattleSession` → `BattleScene` → `realtimeBattle/`     | ALIGNED (realtime only)  |

**Migration:** Keep helper types until PvE result/stage systems stabilize; delete only after dependency map in a dedicated PR.

---

### 2.2 Realtime combat

| Component    | Path                                                | v2.0 fit                             | Status  |
| ------------ | --------------------------------------------------- | ------------------------------------ | ------- |
| Runtime loop | `RealtimeBattleRuntime.ts`, `RealtimeBattleLoop.ts` | Reusable core                        | PARTIAL |
| Movement     | `MovementSystem.ts` — 8-dir on 2D plane             | Needs depth-axis 2.5D contract       | LEGACY  |
| Facing       | `types.ts` `Direction8`                             | Needs L/R combat facing              | LEGACY  |
| Hitbox       | `HitboxSystem.ts` — cone arcs                       | Needs depth tolerance + L/R baseline | LEGACY  |
| Attacks      | `attacks.ts` — 110°–150° cones, **360° skill**      | Conflicts §6 (no 360° attack)        | LEGACY  |
| Dash         | `DashSystem.ts`                                     | 8-dir dodge OK per §14               | PARTIAL |
| Combo        | `ComboSystem.ts`                                    | Reusable after hit model             | PARTIAL |
| Skills       | `SkillSystem.ts`, `skills.ts` — 1 skill/hero        | Needs 1–4 + ultimate framework       | PARTIAL |
| AI           | `EnemyAISystem.ts` — free 2D chase                  | Needs depth-lane awareness           | LEGACY  |
| Tests        | 10+ files under `realtimeBattle/`                   | Valuable — update with migration     | ALIGNED |

---

### 2.3 Top-down vs 2.5D

| Subsystem              | Evidence                                       | Status                                                                        |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| **Battle camera**      | `BattleCamera.tsx` `PITCH_DEG=58`, follows X+Z | LEGACY (top-down oblique)                                                     |
| **Battle arena**       | `BattleArena.tsx` — top-down presentation      | LEGACY                                                                        |
| **Lobby**              | `LobbyScene.tsx` — fixed 2.5D perspective      | PARTIAL (lobby only)                                                          |
| **WukongAdventure**    | `WukongAdventure.tsx` — 2D depth band Y-sort   | PARTIAL (moonlight walk, not stage PvE)                                       |
| **v1.0 fork #25 lock** | “360° ground movement” + side-down camera      | **SUPERSEDED** by v2.0 §5–§6: movement 4-way/diagonal OK; **attack L/R only** |

**Migration track (P1–P2):** Replace `BattleCamera` + movement plane contract together — not camera-only.

---

### 2.4 Character visuals: 2D sprite vs 3D

| Layer          | Evidence                                                                      | Status                                           |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| Battle sprites | `battleSpriteSequences.ts`, `PlayerBattleSprite.tsx`, `EnemyBattleSprite.tsx` | **ALIGNED**                                      |
| Stage config   | `stageConfig.ts` `spriteKind`                                                 | ALIGNED                                          |
| Lobby 3D scene | `LobbyScene.tsx` R3F temple environment                                       | PARTIAL (environment OK; not character pipeline) |
| GLB pipeline   | `tools/build-models.mjs`, `CharacterModel.tsx`, README GLB section            | LEGACY — do not expand                           |
| Prod GLB       | Not shipped to gameplay (per MEMORY)                                          | SUPERSEDED                                       |

**Migration:** Battle already on 2D sprites. Deprecate GLB **character** docs/tooling in a future docs-only PR; lobby 3D **environment** may remain until art direction says otherwise.

---

### 2.5 Adventure / stage flow

| Feature             | Evidence                                       | Status  |
| ------------------- | ---------------------------------------------- | ------- |
| Stage IDs           | `stageConfig.ts` — `trial-01`, `trial-02` only | PARTIAL |
| Chapter grid `1-1`… | Not present                                    | MISSING |
| Stage select UI     | `LobbyBattleSession.tsx` hardcodes `trial-01`  | MISSING |
| Star rating         | Not present                                    | MISSING |
| Boss flow           | `trial-02` wave 2 boss template; unreachable   | PARTIAL |
| Live entry          | `LobbyPage.tsx` — battle buttons → `trial-01`  | PARTIAL |
| Mislabeled CTA      | “เริ่มการผจญภัย” opens battle not stage map    | LEGACY  |

**Unreachable path:** `GameExplorationSession` / `useGameFlow` / NPC `trial-02` dialogue — zero live importers.

---

### 2.6 Hero system

| Feature           | Evidence                                                     | Status  |
| ----------------- | ------------------------------------------------------------ | ------- |
| Roster data       | `characters.ts` — 3 heroes, `Rarity`                         | PARTIAL |
| Ownership         | `accountRepository.ts` `grantCharacter`, starter monkey-king | PARTIAL |
| Per-hero level    | `OwnedCharacter.level/exp`                                   | PARTIAL |
| Stars / ascension | No fields                                                    | MISSING |
| Gacha summon      | `MainNavigation` “อัญเชิญ” → `comingSoon()`                  | MISSING |
| Mid-stage switch  | Not implemented                                              | ALIGNED |
| Battle lead       | `createRealtimeBattle.ts` — lead slot only                   | ALIGNED |

---

### 2.7 Equipment / loot

| Feature                          | Evidence                                                    | Status  |
| -------------------------------- | ----------------------------------------------------------- | ------- |
| Item registry                    | `items.ts` — 5 items, display-only                          | PARTIAL |
| Inventory UI                     | `ItemsModal.tsx`                                            | PARTIAL |
| `grantItem` API                  | `accountRepository.ts` — wired from battle rewards (PR #14) | PARTIAL |
| Battle drops                     | `RewardSystem.ts` — basic drops exist                       | PARTIAL |
| Equipment slots / affixes / sets | Not present                                                 | MISSING |

---

### 2.8 Economy / monetization

| Feature       | Evidence                                  | Status                       |
| ------------- | ----------------------------------------- | ---------------------------- |
| Gold + gems   | `types/player.ts`                         | PARTIAL                      |
| Top-up shop   | `CurrencyShopModal.tsx` — ฿ demo packages | LEGACY (v1.0 premium debate) |
| Gacha economy | Not built                                 | MISSING                      |
| v2.0 model    | §26 Hero Gacha core                       | MISSING                      |

**Note:** v1.0 issue #19 (premium vs demo topup) is **SUPERSEDED** — v2.0 adopts gacha monetization; demo topup UI becomes LEGACY placeholder until real gacha/shop design lands.

---

### 2.9 PvP / matchmaking / rank

| Feature             | Status                                         |
| ------------------- | ---------------------------------------------- |
| PvP mode            | MISSING                                        |
| Matchmaking         | MISSING                                        |
| MMR / Rank / Season | MISSING                                        |
| PvP balance layer   | MISSING (required by §34 before ranked launch) |

---

### 2.10 Backend / server

| Feature                          | Evidence                         | Status                                       |
| -------------------------------- | -------------------------------- | -------------------------------------------- |
| Live backend                     | `SECURITY.md` — client-only      | MISSING (by design today)                    |
| Supabase CSP entry               | Recent upstream commit `4f76a6d` | PARTIAL (infra prep, not gameplay authority) |
| Server authority §37             | Not implemented                  | MISSING                                      |
| `accountRepository` SQL comments | Future seam                      | PARTIAL                                      |

---

### 2.11 Save system

| Feature                    | Evidence                           | Status                 |
| -------------------------- | ---------------------------------- | ---------------------- |
| localStorage DB            | `accountRepository.ts` `los:db:v1` | PARTIAL (client-only)  |
| Export/import              | `SettingsModal`, `saveFile.ts`     | ALIGNED (client scope) |
| Schema for stars/gacha/PvP | Not present                        | MISSING                |

---

### 2.12 Tests / CI / deployment

| Item                   | Evidence                                                  | Status                          |
| ---------------------- | --------------------------------------------------------- | ------------------------------- |
| Unit tests             | **195 tests / 28 files** (upstream)                       | ALIGNED                         |
| Battle tests           | `src/game/realtimeBattle/*.test.ts`                       | ALIGNED                         |
| CI                     | `.github/workflows/ci.yml` — typecheck, lint, test, build | ALIGNED                         |
| Deploy gate            | Version-bump gated Pages deploy                           | ALIGNED                         |
| Component coverage gap | Gold-standard backlog                                     | PARTIAL (non-blocking for v2.0) |

---

### 2.13 Documentation

| Document                                        | Status                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `MASTER_BLUEPRINT_v1.0.md`                      | SUPERSEDED → v2.0                                                    |
| `BLUEPRINT_GAP_ANALYSIS.md`                     | SUPERSEDED → this audit                                              |
| `MASTER_BLUEPRINT_v2.0.md`                      | **NEW** (this PR)                                                    |
| `README.md`                                     | LEGACY — GLB section, stale scope claims partially fixed in upstream |
| `MEMORY.md`                                     | PARTIAL — updated in this PR                                         |
| `docs/battle-realtime-migration-audit.md`       | SUPERSEDED                                                           |
| `docs/battle-integration-contract-readiness.md` | SUPERSEDED                                                           |

---

### 2.14 Exploration legacy

| Component                        | Reachable                         | Status                 |
| -------------------------------- | --------------------------------- | ---------------------- |
| `GameExplorationSession`         | No                                | LEGACY                 |
| `useGameFlow` / `useExploration` | No live caller                    | LEGACY                 |
| `game/dialogue/*`, `game/npc/*`  | Orphaned (`trial-02` unreachable) | LEGACY                 |
| `WukongAdventure` moonlight walk | Yes (`LobbyPage`)                 | LEGACY (not stage PvE) |

**Do not delete in docs PR.** Future PR: classify delete vs preserve per §51.

---

### 2.15 Theme alignment

| Item                         | Evidence                                        | Status                  |
| ---------------------------- | ----------------------------------------------- | ----------------------- |
| Ramakien theme (v2.0)        | Blueprint §1                                    | MISSING in much content |
| Journey to the West / ไซอิ๋ว | `items.ts`, `tools/lib/characters.mjs` comments | LEGACY                  |

Content re-theme is a separate art/design track — not this PR.

---

## 3. v1.0 → v2.0 direction changes (superseded items)

| v1.0 decision                       | v2.0 decision                                                  |
| ----------------------------------- | -------------------------------------------------------------- |
| Premium one-time purchase           | **Hero Gacha** monetization core                               |
| Dungeon run structure (10 min)      | **Stage-based** chapter grid                                   |
| 360° ground movement (fork #25)     | Movement 4-way/diagonal OK; **attack L/R only**                |
| 2.5D side-view-with-depth (generic) | **Locked:** movement plane + depth alignment + L/R attack axis |
| Single-player first (no PvP)        | **PvE + Ranked PvP** dual pillars                              |
| In-game gacha only (no real money)  | Gacha core; secondary monetization TBD                         |
| 3D lobby acceptable                 | **2D HD sprite characters** — no 3D character pipeline         |

---

## 4. Dependency map (what blocks what)

```
P0 Audit (this PR)
  ↓
P1 2.5D Movement Plane (replace top-down free-2D + BattleCamera contract)
  ↓
P2 L/R Facing + Depth Alignment
  ↓
P3 Basic Attack + Hit Detection (depth tolerance)
  ↓
P4 Combo + Dodge
  ↓
P5 Skill + Ultimate Framework
  ↓
P6 Enemy AI (depth-aware)
  ↓
P7 Vertical Slice A (Stage 1-1)
```

Parallel tracks after P3+: stage data (P9), hero progression (P10), loot (P11), gacha (P12), backend (P13), PvP (P14+) — **after** combat core proves out in Slice A/B.

---

## 5. Recommended next PR (exactly one)

### **PR: 2.5D Movement Plane Contract (P1)**

**Scope (single PR):**

- Replace top-down battle movement plane with v2.0 depth-axis model (UP/DOWN = depth, LEFT/RIGHT = horizontal).
- Update `MovementSystem.ts` input → position mapping and arena bounds for 2.5D plane.
- Begin `BattleCamera.tsx` migration toward side-down 2.5D presentation (framing only — no attack-axis change yet).
- Add/update unit tests for movement bounds and depth coordinate semantics.
- Update inline comments that say “top-down” where touched.

**Out of scope for this PR:** L/R attack facing, hit detection rewrite, combo/skill changes, stage system, gacha, PvP, asset pipeline deletion.

**Reason:** Every downstream combat system (`HitboxSystem`, `attacks.ts`, `EnemyAISystem`, facing, depth alignment) depends on the movement/camera contract. Current `Direction8` + cone hitboxes + `PITCH_DEG=58` top-down camera are the root LEGACY blockers. Turn-based is already gone — it does **not** block entry. Stage/gacha/PvP are MISSING but do not block proving combat in Slice A.

**Risks:**

- Touching camera + movement together may affect all 195 tests under `realtimeBattle/` — budget test updates in same PR.
- Lobby `LobbyScene` 3D presentation is separate — do not conflate environment camera with battle camera.
- Fork is 62 commits behind — sync before implementation PR to avoid merge pain.

---

## 6. Do-not-delete register (§51 evidence)

| Item                        | Depends on                   | Recommendation                                       |
| --------------------------- | ---------------------------- | ---------------------------------------------------- |
| `battle/types.ts`           | `BattleResultAdapter`, tests | Preserve until stage result schema stable            |
| `battle/formulas.ts`        | `DamageSystem.ts`            | Preserve; may refactor for depth hits later          |
| Exploration tree (21 files) | Nothing live                 | Preserve commented/orphaned until explicit delete PR |
| GLB tooling                 | README, dev workflow         | Preserve; mark deprecated in docs PR later           |
| `WukongAdventure`           | `LobbyPage` live             | Preserve until stage PvE replaces moonlight walk     |
| `CurrencyShopModal`         | TopBar, demo economy         | Preserve until gacha shop replaces it                |

---

## 7. Acceptance checklist (§54)

| Criterion                        | Met                                       |
| -------------------------------- | ----------------------------------------- |
| Repository audited               | ✅                                        |
| Branch / HEAD recorded           | ✅ `cursor/blueprint-v2-e117` @ `4f76a6d` |
| Fork/upstream divergence checked | ✅ 45 ahead / 62 behind                   |
| Master Blueprint v2.0 created    | ✅                                        |
| Old blueprint marked superseded  | ✅ (this PR)                              |
| MEMORY.md updated                | ✅ (this PR)                              |
| Migration audit created          | ✅                                        |
| Turn-based classified            | ✅ SUPERSEDED                             |
| MMORPG assumptions classified    | ✅ MISSING/never built                    |
| 3D character classified          | ✅ LEGACY pipeline; battle ALIGNED on 2D  |
| Movement/attack rules locked     | ✅ in v2.0 §5–§8                          |
| Adventure/gacha/PvP rules locked | ✅ in v2.0                                |
| 1 topic = 1 PR locked            | ✅                                        |
| Tests/build                      | ⏳ run before push                        |
| No feature implementation        | ✅ docs only                              |
| One recommended next PR          | ✅ P1 Movement Plane                      |

---

_Operator: HetCreep · Agent: Cursor Agent (cloud) · 2026-08-07_
