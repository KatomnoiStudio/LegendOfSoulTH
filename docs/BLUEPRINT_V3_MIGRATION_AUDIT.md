# Legend of Soul TH — Blueprint v3.0 Migration Audit

> **Audit date**: 2026-08-07  
> **Branch**: `cursor/blueprint-v3-e117`  
> **Base commit**: `50c5f94` (`upstream/master`)  
> **Blueprint**: [`MASTER_BLUEPRINT_v3.0.md`](MASTER_BLUEPRINT_v3.0.md)  
> **Authority**: HetCreep Ring 0 live lock (refines v2.0 in-flight PR #17)  
> **Scope**: Classify only — no gameplay changes

---

## 0. v2.0 → v3.0 direction deltas

| Topic            | v2.0                                  | v3.0 (LOCKED)                                     |
| ---------------- | ------------------------------------- | ------------------------------------------------- |
| IP framing       | Ramakien Fantasy                      | **Universe of Legends** (Ramakien = first series) |
| Skills UI        | Skill 1–4 + Ultimate                  | **3 Skills + Ultimate**                           |
| Dash             | Dodge/dash button                     | **No separate dash button**                       |
| Early loot       | Equipment / affix / set in roadmap    | **CUT / DEFERRED** early phase                    |
| Hero progression | Level, stars, talent, equipment, sets | **Level → Star → Skill Level** only (early)       |
| PvP modes        | Balance layer TBD                     | **Single ranked**; match within rank              |
| Star balance     | Mentioned                             | **Bounded power gap** required                    |
| Stage design     | Wave structure example                | **Varied objectives** required                    |
| Roadmap          | P0–P20                                | **P0–P15** (simplified)                           |
| Backend          | MISSING                               | **PARTIAL** — Supabase account seam landed        |

---

## 1. Summary matrix

| Area                              | Status     | v3 note                                     |
| --------------------------------- | ---------- | ------------------------------------------- |
| Turn-based                        | SUPERSEDED | Engine gone; adapter types remain           |
| Realtime combat core              | PARTIAL    | Exists; wrong camera/attack/dash model      |
| 2.5D movement + depth             | LEGACY     | Top-down + free 2D plane                    |
| L/R attack + depth hits           | MISSING    | Cone/360° skill today                       |
| 3 skills + ultimate UI            | PARTIAL    | 1 skill + dash button today                 |
| Separate dash button              | LEGACY     | **CUT in v3** — `DashSystem`, `pressDash`   |
| 2D battle sprites                 | ALIGNED    |                                             |
| Universe of Legends IP            | MISSING    | Content still ไซอิ๋ว/JTTW in places         |
| Stage chapter grid                | MISSING    | `trial-01` only live                        |
| Stage variation types             | MISSING    | Wave-only trials                            |
| Gacha / stars                     | MISSING    |                                             |
| Early progression (Lv/Star/Skill) | PARTIAL    | Level exists; no stars/gacha                |
| Loot / equipment / affix          | DEFERRED   | **Not early scope** — do not build          |
| PvP / rank                        | MISSING    |                                             |
| Supabase backend                  | PARTIAL    | `accountRepository.supabase.ts` live-tested |
| Tests / CI                        | ALIGNED    |                                             |

---

## 2. Code evidence (current HEAD)

### ALIGNED

- `battleSpriteSequences.ts`, `PlayerBattleSprite.tsx` — 2D sprites in battle
- `realtimeBattle/` runtime, tests — reusable after contract migration
- `npm run ci` green on upstream

### PARTIAL

- `characters.ts` — 3 heroes, rarity, no star field
- `accountRepository.ts` + `accountRepository.supabase.ts` — dual persistence seam
- `RewardSystem.ts` — EXP/gold/material-style rewards (not loot affixes)
- `stageConfig.ts` — `trial-01`/`trial-02` wave stages only

### LEGACY (conflicts v3)

- `BattleCamera.tsx` — top-down (`PITCH_DEG=58`)
- `MovementSystem.ts` — `Direction8`, no depth combat contract
- `HitboxSystem.ts` / `attacks.ts` — cone arcs, **360° skill**
- `DashSystem.ts`, `useRealtimeBattle.pressDash`, battle UI dash button — **v3 CUT**
- `skills.ts` — single skill mapping (need 3 + ultimate framework)
- Exploration orphan + `WukongAdventure` moonlight walk
- GLB pipeline docs/tooling
- Theme: Journey to the West in `items.ts`, character tooling

### MISSING

- Chapter/stage map (`1-1`…), stage type variants
- Gacha summon UI + star ascension
- Skill level progression
- Ranked PvP queue/matchmaking
- Universe of Legends content framing in data

### DEFERRED (do not implement in early PRs)

- Equipment slots, random affix, set bonus
- Loot RPG drop tables beyond EXP/material/currency
- Talent, awakening trees

### SUPERSEDED

- Blueprint v1.0, v2.0 direction (4 skills, dash button, early loot RPG)
- Turn-based combat path
- Ramakien-only ceiling

---

## 3. Recommended next PR (one topic)

### **P1: Movement / Depth plane contract**

Replace top-down free-2D movement with v3 2.5D depth-axis semantics and begin side-down camera migration.

**Includes:** `MovementSystem.ts`, arena bounds, `BattleCamera.tsx` framing, tests.

**Excludes:** skill count changes (P3), dash removal (bundle with P2/P3 UI), gacha, stages, loot.

**Reason:** P2 basic combat and P3 skill framework depend on movement/camera contract. Dash removal is UI+runtime but should follow once new mobility design is clear (likely P3).

---

## 4. PR #17 (v2.0) status

Upstream PR #17 (Blueprint v2.0) should be **superseded or closed** in favor of v3.0 — v3 is the authoritative baseline HetCreep confirmed in chat.

---

## 5. Acceptance

| Criterion                   | Met                  |
| --------------------------- | -------------------- |
| v3.0 blueprint created      | ✅                   |
| v3 migration audit created  | ✅                   |
| v2 deltas documented        | ✅                   |
| CUT/DEFERRED items explicit | ✅                   |
| One next PR                 | ✅ P1 Movement/Depth |
| No gameplay in this PR      | ✅                   |

---

_Operator: HetCreep · Agent: Cursor Agent (cloud) · 2026-08-07_
