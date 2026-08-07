# Legend of Soul TH — Blueprint Gap Analysis

> **⚠️ SUPERSEDED** — v1.0 era gap analysis.  
> **Current:** [`MASTER_BLUEPRINT_v3.0.md`](MASTER_BLUEPRINT_v3.0.md) · [`BLUEPRINT_V3_MIGRATION_AUDIT.md`](BLUEPRINT_V3_MIGRATION_AUDIT.md)

> **Against**: [`MASTER_BLUEPRINT_v1.0.md`](MASTER_BLUEPRINT_v1.0.md) (historical)  
> **Audit date**: 2026-08-07  
> **Auditor**: Cursor Agent (cloud), Ring 1  
> **Working tree**: branch `cursor/master-blueprint-v1-e117` @ upstream `KatomnoiStudio/LegendOfSoulTH`  
> **Scope**: Facts from the repository only. **No gameplay changes** in the adopting PR.  
> **Labels**: PRESENT · PARTIAL · ABSENT · LEGACY · CONFLICT

---

## 0. Repository topology

| Item              | Fact                                                   | Label                        |
| ----------------- | ------------------------------------------------------ | ---------------------------- |
| Canonical remote  | `upstream` → `KatomnoiStudio/LegendOfSoulTH`           | PRESENT                      |
| This agent origin | `origin` → `nustanakritwithai/GameTurnBase` (fork)     | PRESENT                      |
| Fork name         | Still encodes “TurnBase” while live combat is realtime | CONFLICT (naming vs product) |
| Live site         | https://katomnoistudio.github.io/LegendOfSoulTH/       | PRESENT                      |
| Game version      | `GAME_INFO.version` + `package.json` = **0.4.0**       | PRESENT                      |

---

## 1. Product North Star / genre claims

| Source                 | Claim                                                      | vs Blueprint                                                              | Label                 |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------- |
| `src/game/gameInfo.ts` | “Mythic Real-Time RPG” / realtime action                   | Aligns on realtime; missing Premium Action RPG + Ramakien pillars wording | PARTIAL               |
| `MEMORY.md`            | mythic real-time action RPG                                | Same                                                                      | PARTIAL               |
| `README.md`            | Real-time Action 2.5D; claims exploration + “no real drop” | Exploration orphaned; drops exist via `RewardSystem`                      | CONFLICT (docs stale) |
| Business model         | Demo gold/gem topup UI (`CurrencyShopModal`)               | Blueprint: premium one-time, no RM gacha                                  | CONFLICT / PARTIAL    |

---

## 2. Camera & movement (PART 3) — CRITICAL CONFLICT

| Finding                                   | Evidence                                                                           | Label                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Combat camera is **top-down oblique**     | `BattleCamera.tsx` (pitch ~58°), `realtimeBattle/types.ts` “Top-down Hack & Slash” | **CONFLICT** (blueprint cancels top-down)                |
| Lobby camera fixed 2.5D oblique           | `LobbyScene.tsx` / README                                                          | PARTIAL (presentation family differs from combat target) |
| 360° / 8-dir ground movement              | `MovementSystem.ts`                                                                | PRESENT (movement axes OK; camera contract wrong)        |
| Mobile joystick                           | `BattleJoystick.tsx`                                                               | PRESENT                                                  |
| Town/Dungeon shared controller philosophy | Exploration orphaned; only battle arena live                                       | ABSENT / LEGACY                                          |

**Migration note (DO NOT implement in docs PR):** camera/presentation migration from top-down arena to 2.5D side-view-with-depth is a dedicated implementation track.

---

## 3. Combat (PART 5–9)

| Finding                                          | Evidence                                                                | Label                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| Live path realtime only                          | `LobbyBattleSession` → `BattleScene` → `realtimeBattle/**`              | PRESENT                                 |
| Turn-based engine                                | Deleted; `battle/types.ts` + `formulas.ts` remain as shared helpers     | LEGACY (types/formulas kept on purpose) |
| Exploration / `useGameFlow` / dialogue / npc     | Fully `//`-commented (PR #11 orphan)                                    | LEGACY                                  |
| Mobile: Attack + Dash + Skill                    | `BattleControls.tsx` — **not** Skills 1–4 + Ultimate                    | PARTIAL                                 |
| Skill count                                      | One skill, Monkey King only (`skills.ts`)                               | PARTIAL                                 |
| PC keyboard map                                  | `InputSystem.ts` (WASD, attack, dash, skill)                            | PRESENT                                 |
| Soft target / target assist                      | —                                                                       | ABSENT                                  |
| Gamepad                                          | Disclosed unbuilt                                                       | ABSENT                                  |
| Pipeline systems                                 | Input, Combo, Dash, Skill, Hitbox, Damage, HitStop (in Combo)           | PRESENT                                 |
| Intent buffer / full resolver split              | Partial via runtime; not full PART 6 diagram                            | PARTIAL                                 |
| VFX layer                                        | Effect events exist; limited on-scene rendering; damage numbers present | PARTIAL                                 |
| `EntityState`                                    | `idle\|walk\|attack\|skill\|dash\|hit\|dead`                            | PARTIAL vs PART 7 list                  |
| Ultimate / Knockdown / GetUp / Dodge-as-distinct | —                                                                       | ABSENT                                  |
| Attack Startup/Active/Recovery                   | Combo/skill timings present                                             | PARTIAL                                 |

---

## 4. Core loop / dungeon (PART 4, 12–13)

| Finding                                       | Evidence                                              | Label                                       |
| --------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Town → Prepare → Dungeon → Boss → Loot → Town | Lobby shortcut → single arena battle → result → lobby | PARTIAL (compressed loop)                   |
| Dungeon rooms / pacing graph                  | Single arena; waves only                              | ABSENT                                      |
| Stages                                        | `trial-01`, `trial-02` in `stageConfig.ts`            | PRESENT                                     |
| Live entry                                    | Only `trial-01`                                       | PARTIAL (`trial-02` unreachable)            |
| Death = dungeon run fail                      | Battle defeat → zero rewards → lobby                  | PARTIAL (battle fail ≠ multi-room run fail) |
| Replayability systems                         | —                                                     | ABSENT                                      |

---

## 5. Heroes (PART 10–11)

| Finding                    | Evidence                                                     | Label                                                                         |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Starter 1 hero             | `monkey-king`                                                | PRESENT                                                                       |
| Per-hero level/exp         | `ownedCharacters[]`                                          | PRESENT                                                                       |
| Catalog                    | 3 characters in `characters.ts`                              | PARTIAL (not Ramakien identity set)                                           |
| One hero in battle         | Lead `teamSlots` only                                        | PRESENT                                                                       |
| Team size 4                | `TEAM_SIZE = 4`                                              | CONFLICT / PARTIAL (blueprint: 1 hero per dungeon run; team UI still 4 slots) |
| Distinct movesets per hero | Only Monkey King skill                                       | PARTIAL                                                                       |
| In-game gacha acquisition  | Nav “อัญเชิญ” → coming soon; `grantCharacter` admin/API only | ABSENT                                                                        |

---

## 6. Loot / equipment / economy / gacha (PART 18–22)

| Finding                 | Evidence                                | Label                        |
| ----------------------- | --------------------------------------- | ---------------------------- |
| Item catalog + rarity   | `items.ts`                              | PRESENT                      |
| Inventory               | `grantItem` + battle drops              | PARTIAL                      |
| Random affix loot       | —                                       | ABSENT                       |
| Equipment slots / equip | —                                       | ABSENT                       |
| Salvage lifecycle       | —                                       | ABSENT                       |
| Gold sources            | Battle drop, demo topup; `quest` unused | PARTIAL                      |
| Currency sinks          | No spend APIs found                     | ABSENT                       |
| In-game gacha           | —                                       | ABSENT                       |
| Demo IAP topup          | `CurrencyShopModal` always-succeed      | CONFLICT vs premium baseline |

---

## 7. Quest / world / save (PART 23–25)

| Finding                                                                    | Evidence                                | Label               |
| -------------------------------------------------------------------------- | --------------------------------------- | ------------------- |
| Quest system                                                               | —                                       | ABSENT              |
| Multi-town world                                                           | Commented village map only              | LEGACY / ABSENT     |
| Save: auth, roster, inventory, currencies, progress flags, battle history  | `accountRepository.ts` / `Player`       | PARTIAL             |
| Save: equipment, talents, awakening, gacha, control maps, schema migration | —                                       | ABSENT              |
| UI as source of truth                                                      | Data mostly in repository; OK direction | PRESENT (direction) |

---

## 8. Platform UX / performance / pipelines (PART 26–30)

| Finding                                          | Evidence                                             | Label                      |
| ------------------------------------------------ | ---------------------------------------------------- | -------------------------- |
| Mobile combat HUD                                | Joystick + 3 buttons                                 | PARTIAL vs 7-button target |
| PC remappable controls                           | Fixed key map                                        | PARTIAL                    |
| Performance budgets documented                   | Adaptive quality exists; formal budgets incomplete   | PARTIAL                    |
| Asset contract / spreadsheet validation pipeline | Image pipeline tools exist; no spreadsheet→schema CI | PARTIAL / ABSENT           |

---

## 9. Priority gap register (for future PRs — do not implement here)

Ordered for product risk (human still gates each PR):

1. **CONFLICT — Camera contract** (PART 3): leave top-down as CURRENT; plan 2.5D side-view-with-depth migration.
2. **CONFLICT — Business model messaging** vs demo topup UI (PART 2.2).
3. **ABSENT — Dungeon run structure** (PART 12) vs single arena.
4. **PARTIAL — Moveset / skills 1–4 + Ultimate** (PART 5, 11).
5. **ABSENT — Soft target assist** (PART 5.3).
6. **ABSENT — Equipment + random loot** (PART 18–20).
7. **ABSENT — Currency sinks + in-game gacha** (PART 21–22).
8. **LEGACY cleanup policy** for commented exploration / turn types (classify only until ordered).
9. **Docs debt**: README claims vs live battle rewards / orphaned exploration.
10. **State machine expansion** (PART 7) and Boss telegraph/phase content (PART 16).

---

## 10. What this audit deliberately did **not** change

- No combat/camera/UI/gameplay edits
- No deletion of LEGACY exploration or remaining battle helper files
- No balance or content additions

Implementation requires separate, reviewed PRs naming the blueprint PART(s) they advance.
