# Legend of Soul TH — Master Blueprint v1.0

> **Document type**: Product Specification + Master Blueprint + Agent Work Contract  
> **Status**: ADOPTED as Product Baseline (documentation PR — no gameplay implementation in the same change)  
> **Operator**: HetCreep  
> **Agent author**: Cursor Agent (cloud)  
> **Created**: 2026-08-07  
> **Source**: SOL WORK / CODING AGENT COMMAND (inline specification — no external DOCX)  
> **Scope of adopting PR**: Documentation / Governance / Repository Audit only  
> **Companion**: [`BLUEPRINT_GAP_ANALYSIS.md`](BLUEPRINT_GAP_ANALYSIS.md)

---

## How agents must use this document

1. This file is the **Product North Star** and **locked decision record** for Legend of Soul TH.
2. Agents **must not reinterpret** locked decisions (§2 and later LOCKED sections).
3. Finding code that conflicts with this blueprint → **AUDIT, DOCUMENT, CLASSIFY** — do **not** rewrite gameplay in a documentation PR.
4. Implementation work requires a **separate, explicitly scoped PR** after human review of gaps.
5. Turn-based remnants and current top-down combat are **LEGACY / CURRENT**, not permission to keep them forever — migration is future work.

---

## Mission (adopting this baseline)

Repository Adoption / Documentation Baseline / Project Governance:

1. Audit the current repository
2. Inspect upstream / fork / branch / divergence
3. Create this Master Blueprint from the command source material
4. Encode Product Vision below
5. Produce gap analysis
6. Align `MEMORY.md` to the new Product Baseline
7. Record Engineering Governance
8. Verify tests / build / CI as supported
9. Open a Pull Request
10. **STOP and wait for Review** — do not start the next implementation PR unprompted

### Critical scope rule (documentation PR)

**Allowed:** docs, MEMORY, audit, classify, governance, CI verify.

**Forbidden in the same PR:** rewrite combat, dungeon, hero, loot, gacha, progression, skills, enemy AI, boss, town, quest, large architecture refactors, removing turn-based or top-down code, UI/balance changes, or “doing the next PR” automatically.

---

# PART 1 — PRODUCT NORTH STAR

**Name:** Legend of Soul TH

**Genre:** Premium Action RPG

**Theme:** รามเกียรติ์ / Ramakien Fantasy

**Product North Star:**

> เกมรามเกียรติ์ Action RPG ที่เล่นลื่น ควบคุมง่าย มี Asset ตัวละครและ Skill สวยงาม และมีระบบพัฒนาตัวละครเชิงลึก ให้ผู้เล่นสามารถเล่นต่อเนื่องได้เป็นเวลานาน

Legend of Soul TH is **not** a 1v1 fighting game with RPG bolted on.

It must be a **FULL ACTION RPG** with these **Core Pillars**:

| Pillar                | Role                        |
| --------------------- | --------------------------- |
| COMBAT                | Realtime action combat feel |
| DUNGEON               | Core content session        |
| LOOT                  | Build hunting / item chase  |
| HERO COLLECTION       | Roster growth               |
| CHARACTER PROGRESSION | Deep long-term growth       |

---

# PART 2 — LOCKED PRODUCT DECISIONS

Agents **must not reinterpret** these.

## 2.1 Game genre

Premium Action RPG composed of:

- Action RPG
- Dungeon RPG
- Loot RPG
- Hero Collection
- Character Progression

## 2.2 Business model

- **One-time purchase** (Premium)
- Baseline: **no real-money gacha**
- **No Pay-to-Win**
- Gacha uses **in-game resources only**

## 2.3 Platform

First-class targets:

- Mobile
- PC

Forbidden design paths:

- Build PC first then shrink to mobile
- Build mobile then paste the same UI onto PC

## 2.4 Single-player first

- Development priority: **Single-player first**
- Online is a later phase
- Online target (early): **Battle Room / Match Room**
- Not MMO
- Not a persistent shared world

---

# PART 3 — CAMERA & MOVEMENT

**Cancel all Top-down product direction.**

### Target camera

**2.5D SIDE VIEW** — does **not** mean left/right only.

Characters must move on a ground plane:

```
← → ↑ ↓ ↖ ↗ ↙ ↘
```

or **analog 360° movement**.

Overall form: **2.5D Arena / Brawler-style movement**  
Camera presents a side-biased view with **depth**.

Reference philosophy: mobile Action Naruto–style arenas — free ground movement, 2.5D presentation.

**Forbidden:**

- Top-down
- Isometric top-down
- Side-scroller (1-axis only)

## 3.1 Movement contract

Target movement:

- 360° ground movement
- Left / Right
- Forward / Backward in depth
- Diagonal
- Dash / Dodge
- Smooth acceleration / deceleration (Game Feel)
- Facing related to combat target / action
- Collision for 2.5D arenas
- Camera respects depth bounds

Town, Combat Area, and Dungeon should share the same **character-controller philosophy**.

---

# PART 4 — CORE GAME LOOP

### Primary loop

```
Town / Hub
  → Prepare Hero
  → Equipment / Skill / Build
  → Quest / Select Dungeon
  → Enter Combat Area
  → Dungeon
  → Enemy Encounters
  → Elite / Challenge
  → Boss
  → Loot / EXP / Currency
  → Return Town
  → Upgrade Hero
  → Equip / Salvage / Improve Build
  → Gacha / Unlock Hero
  → Harder Dungeon
  → Repeat
```

## 4.1 Session target

| Phase                   | Target length |
| ----------------------- | ------------- |
| Preparation             | ~1–3 minutes  |
| Dungeon                 | ~10 minutes   |
| Boss + Result           | ~1–3 minutes  |
| Progression / Inventory | ~2–5 minutes  |

**Dungeon Run** is the core gameplay session.

---

# PART 5 — COMBAT SYSTEM

Combat is **REALTIME ONLY**.

**Turn-based is cancelled** as product direction.

If the repository still contains turn-based code → classify as **LEGACY**. Do not delete it in a documentation PR.

## 5.1 Combat control philosophy

Controls prioritize ROV-like simplicity.

### Mobile

**LEFT:** Virtual Joystick

**RIGHT:**

- Basic Attack
- Dodge / Dash
- Skill 1
- Skill 2
- Skill 3
- Skill 4
- Ultimate

Do not flood Mobile with too many buttons.

## 5.2 PC

PC must support:

- Keyboard
- Mouse as appropriate
- Controller mapping readiness

Input architecture must map the **same actions** from multiple devices.

## 5.3 Target assist

Use **Soft Target** or **Target Assist** so skills stay usable on Mobile.

Target Assist **must not steal control** from the player.

---

# PART 6 — COMBAT PIPELINE

Target architecture:

```
Input
  → Intent Buffer
  → Action Resolver
  → Character State
  → Animation
  → Hit Query / Hitbox
  → Hit Validation
  → Damage / Effect Resolver
  → Reaction
  → VFX / SFX / Camera Feedback
  → Combat State Update
```

**Critical:** Animation must **not** be the sole source of truth for combat state.

Combat Logic and Presentation have **separate responsibilities**.

---

# PART 7 — CHARACTER STATE MACHINE

Minimum target states:

- Idle
- Move
- Dash
- Dodge
- Attack
- Skill
- Ultimate
- HitStun
- Knockback
- Knockdown
- GetUp
- Invulnerable
- Dead

Transitions must support:

- Priority
- Interrupt rules
- Cancel windows
- Recovery
- Cooldown
- Input buffer

---

# PART 8 — ATTACK MODEL

Each attack:

```
Startup → Active → Recovery
```

May also include a **Cancel Window**.

| Phase         | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| Startup       | Wind-up                                                       |
| Active        | Hit generation                                                |
| Recovery      | Post-hit restrictions                                         |
| Cancel Window | Allowed chain into Attack / Skill / Dodge / other per moveset |

---

# PART 9 — GAME FEEL

Combat must emphasize Game Feel. Target systems:

- Hit Stop
- Hit Flash
- Impact VFX
- Camera Shake
- Knockback
- Hit Reaction
- Sound Impact
- Character Voice
- Damage Number
- Skill VFX
- Ultimate Presentation

**Critical:** VFX must not obscure enemy/boss telegraph. Beauty must not destroy readability.

---

# PART 10 — HERO SYSTEM

- Player starts with **1** Hero
- Additional Heroes unlock via **in-game Gacha**
- One Dungeon run: select **1 Hero** and keep that Hero for the whole run
- **No mid-run Hero switching**

## 10.1 Hero level

Each Hero has its **own Level** (example: Hanuman Lv.30, Rama Lv.12, Tosakan Lv.5).

Do not use a single shared account level as the only progression for Heroes.

## 10.2 Hero identity

Heroes must differ in **gameplay**, not only models.

Direction examples (not final balance):

| Hero    | Direction                                                            |
| ------- | -------------------------------------------------------------------- |
| HANUMAN | High mobility, combo, gap close, fast action, clone / aerial fantasy |
| RAMA    | Ranged precision, projectile, range control, burst                   |
| TOSAKAN | Heavy power, area control, poise, crowd control                      |

---

# PART 11 — HERO MOVESET

Baseline per Hero:

- Basic Attack Combo
- Dodge / Dash
- Skill 1–4
- Ultimate

Every skill needs a **gameplay purpose** (damage, mobility, CC, defense, buff/debuff, area, burst, execute, gap close, …).

Forbidden: skills that differ only by flat damage numbers with identical behavior.

---

# PART 12 — DUNGEON SYSTEM

Dungeon is **core content**. Target run ≈ **10 minutes**.

Example structure:

```
ENTRY → ROOM 1 (Normal) → ROOM 2 (Hazard/Objective)
  → ROOM 3 (Elite/Challenge) → BOSS → RESULT
```

Room count is not sacred; pacing is:

```
Start → Escalation → Challenge → Climax → Reward
```

## 12.1 Death rule

If the Hero dies:

- **Dungeon run failure**
- Exit the run
- Start a new Dungeon

Baseline: **no mid-run checkpoint revive**.

---

# PART 13 — DUNGEON REPLAYABILITY

The same Dungeon must be worth replaying via e.g.:

- Enemy composition
- Difficulty tier
- Challenge modifiers
- Loot tables
- Optional objectives
- Time rank
- Hero / equipment builds
- Different Hero playstyles

Goal: same dungeon must not feel 100% identical every run.

---

# PART 14 — ENEMY SYSTEM

Example roles: Melee, Ranged, Tank, Guard, Controller, Support, Elite.

Roles must create **different combat situations**, not only different HP/Damage.

---

# PART 15 — ENEMY AI

Target AI loop:

```
Observe → Evaluate Distance → Evaluate Threat → Choose Action
  → Telegraph → Execute → Recover → Re-evaluate
```

AI should support: Chase, Attack, Retreat, Reposition, Skill, Block/Guard (when appropriate), Punish, Recover.

---

# PART 16 — BOSS

Bosses validate the combat engine. Required:

- Telegraph
- Attack patterns
- Punish windows
- Phases
- Reactions
- Signature skills
- Clear hit feedback

Boss attacks must be learnable, dodgeable, readable — not unavoidable damage.

Phases may change by HP, time, mechanic, or other conditions.

---

# PART 17 — CHARACTER PROGRESSION

Progression is a Core Pillar equal to Combat.

Target systems:

- Hero Level
- Skill Upgrade
- Equipment
- Talent Tree
- Awakening
- Hero Collection

Players should feel **player skill** and **character power** grow together.

---

# PART 18 — EQUIPMENT

Loot-RPG equipment with **rarity** and **random stats / affixes**.

Example rarities: Common, Rare, Epic, Legendary, Mythic (names adjustable later).

## 18.1 Item data (minimum)

Item ID, Base Item, Slot, Required Level, Rarity, Main Stat, Random Affix, Roll Value, Allowed Range, Upgrade State, Drop Source.

**Stable IDs** — never bind identity directly to filenames.

---

# PART 19 — RANDOM LOOT

Same base item can drop with different rolls (Build Hunting).

Higher number alone must not always mean “equip immediately.”

---

# PART 20 — ITEM LIFECYCLE

Players decide: Equip / Keep / Upgrade / Salvage.

Unused drops must still have value via salvage/economy.

Do not fill inventory with worthless junk.

---

# PART 21 — ECONOMY

Every currency needs a **SOURCE** and a **SINK**.

Example sources: Dungeon, Quest, Boss, Achievement, Salvage.  
Example sinks: Upgrade, Craft/Enhancement, Gacha, Progression.

Do not invent currencies without a use.

---

# PART 22 — GACHA

Baseline: **IN-GAME ONLY** (no real-money purchase for gacha).

Purpose: Hero acquisition / collection.  
Currency from gameplay (quest, dungeon milestone, achievement, progression).

## 22.1 Duplicate Hero

Duplicates must not be worthless (shards / awakening resource / universal currency — design later). Keep Premium philosophy.

## 22.2 Gacha data

Probability, pool, rate, guarantee, pity (if any) must be **data**, testable and auditable.

---

# PART 23 — QUEST SYSTEM

Content types: Main Quest, Side Quest, Dungeon, Challenge, Boss Hunt, Achievement.

- Main: story + unlock towns/systems
- Side: lore, character, resource, exploration, world building

---

# PART 24 — WORLD

Multiple connected towns (not necessarily seamless open world).

Each town should have visual identity, NPC group, enemy family, dungeon set, story context, shops/services as appropriate.

Theme: **Ramakien Fantasy**.

---

# PART 25 — SAVE SYSTEM

Save must support at least:

PlayerProfile, HeroRoster, HeroProgress per Hero, Inventory, Equipment, Skill Progress, Talent, Awakening, Quest State, World Progress, Currencies, Gacha State, Settings, Control Mapping, Schema Version, Migration.

**UI is not the source of truth.**

---

# PART 26 — MOBILE UX

LEFT: Virtual Joystick

RIGHT: Attack, Dodge, Skills 1–4, Ultimate

Must support multi-touch, aspect ratios, touch targets, HUD scaling, quality presets.

---

# PART 27 — PC UX

Keyboard, Mouse, controller-ready architecture.

Prefer remappable controls, input-aware UI prompts, resolution/aspect support.

---

# PART 28 — PERFORMANCE

Performance is a feature. Define budgets for draw calls, triangles, textures, animation, particles, VFX, audio, memory, loading, frame time.

Do not massively expand content before a performance baseline.

---

# PART 29 — ASSET PIPELINE

Design/Asset owns: character visual/assets, animation, skill visual, VFX, UI, environment, spreadsheets, game-data preparation.

Assets need a **stable contract**, e.g. Hero:

Hero ID, Model/Representation, Rig, Animation List, Portrait, Icon, Skill Icons, VFX, SFX Hook, Data Row.

---

# PART 30 — DATA PIPELINE

> **Note:** The source command was truncated mid–PART 30. The following encodes the completed intent from the provided fragment; any further subsections from the original command that were not transmitted remain **TBD for Blueprint v1.1**.

Spreadsheet / authored tables are **not** copy-pasted into source without validation.

**Target flow (intent):**

```
Spreadsheet / authored data
  → Schema validation
  → Codegen or typed import
  → Runtime Data Registry
  → Game systems consume Stable IDs
```

Rules:

- Validate before merge
- Fail CI on invalid rows / missing Stable IDs
- Prefer generated or typed modules over hand-duplicated constants
- Keep design sheets and runtime contracts synchronized

---

# PART 31 — ENGINEERING GOVERNANCE (repo adoption)

## 31.1 Document authority

| Document                         | Role                                                     |
| -------------------------------- | -------------------------------------------------------- |
| `docs/MASTER_BLUEPRINT_v1.0.md`  | Product + technical North Star                           |
| `docs/BLUEPRINT_GAP_ANALYSIS.md` | Repo vs blueprint, classified                            |
| `MEMORY.md`                      | Live session/project state (must ship with every submit) |
| `AGENTS.md` + `.agents/rules/**` | Agent laws                                               |

## 31.2 Classification vocabulary

| Label        | Meaning                                             |
| ------------ | --------------------------------------------------- |
| **TARGET**   | Required by this blueprint                          |
| **PRESENT**  | Exists and aligns enough to keep                    |
| **PARTIAL**  | Exists but incomplete vs TARGET                     |
| **ABSENT**   | Not built                                           |
| **LEGACY**   | Exists but product direction cancelled / superseded |
| **CONFLICT** | Present behavior fights a LOCKED decision           |

## 31.3 PR policy for blueprint work

1. **Docs/Governance PRs** may only document and classify.
2. **Implementation PRs** must name which blueprint PART(s) they advance.
3. Do not mix “delete LEGACY” with “ship new dungeon” unless explicitly ordered.
4. After a docs PR: **STOP for human review**.

## 31.4 Upstream vs fork

- Canonical product repository: `LegendofSoulTH/LegendOfSoulTH`
- Practice fork (if used): `nustanakritwithai/GameTurnBase` — not the product baseline remote
- Homework / product delivery targets **upstream**

---

## Revision history

| Version | Date       | Notes                                                                                                                                   |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0    | 2026-08-07 | Created from SOL WORK agent command (inline). PART 30 completed from truncated fragment; mark TBD for any missing original subsections. |
