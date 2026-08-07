# Legend of Soul TH — Master Blueprint v2.0

> **Document type**: Product Specification + Master Blueprint + Agent Work Contract  
> **Status**: ADOPTED as Product Baseline (documentation PR — no gameplay implementation in the same change)  
> **Operator**: HetCreep  
> **Agent author**: Cursor Agent (cloud)  
> **Created**: 2026-08-07  
> **Source**: SOL WORK / CODING AGENT COMMAND — Master Direction Reset  
> **Scope of adopting PR**: Documentation / Governance / Repository Audit / Migration Roadmap only  
> **Companion**: [`BLUEPRINT_V2_MIGRATION_AUDIT.md`](BLUEPRINT_V2_MIGRATION_AUDIT.md)  
> **Supersedes**: [`MASTER_BLUEPRINT_v1.0.md`](MASTER_BLUEPRINT_v1.0.md) (and [`BLUEPRINT_GAP_ANALYSIS.md`](BLUEPRINT_GAP_ANALYSIS.md))

---

## How agents must use this document

1. This file is the **Product North Star** and **locked decision record** for Legend of Soul TH.
2. Agents **must not reinterpret** locked decisions in §2–§56.
3. Code that conflicts → **AUDIT, DOCUMENT, CLASSIFY** — do **not** rewrite gameplay in a documentation PR.
4. Implementation requires **separate, scoped PRs** — **one topic = one PR** (§42).
5. Prior blueprint (v1.0), premium-one-time model, MMORPG assumptions, 3D character direction, top-down combat, and 360° attack are **SUPERSEDED** unless HetCreep issues a new command.
6. Do not delete legacy code blindly in a docs PR — use the migration audit first (§51).

---

## Mission

Correct the project baseline of Legend of Soul TH to match the latest game direction.

This is **not** a single-feature PR. It is:

```
AUDIT → CORRECT PROJECT DIRECTION → UPDATE DOCUMENTATION → UPDATE MEMORY
     → IDENTIFY LEGACY → PREPARE MIGRATION ROADMAP
```

**Do not implement the full blueprint in one PR.**

---

# §1 — Final game definition

**Legend of Soul TH** is:

| Attribute         | Value                                   |
| ----------------- | --------------------------------------- |
| Genre             | **Stage-Based 2.5D Action RPG**         |
| Collection        | Hero Collection / Gacha                 |
| Progression       | Loot / Character Progression            |
| PvP               | **Ranked 1v1**                          |
| Theme             | **Ramakien / รามเกียรติ์**              |
| Character visuals | **2D HD Sprite** — **not** 3D character |

**Two gameplay pillars:**

1. **PvE Adventure** — chapter/stage progression
2. **PvP Ranked Arena** — random matchmaking 1v1

Stage flow example:

```
1-1 → 1-2 → 1-3 → 1-4 → 1-5 Boss → Chapter 2 → …
```

---

# §2 — Core product pillars

## PILLAR 1 — Action Combat

- Realtime only — **no turn-based**
- Responsive, mobile-friendly
- Positioning-based, skill-based, dodge-based

## PILLAR 2 — Adventure

```
Chapter → Stage → Stage → Stage → Boss
```

Example Chapter 1: `1-1` … `1-5 Boss`. Clear to unlock next chapter.

## PILLAR 3 — Hero Collection

Ramakien heroes (directional examples): หนุมาน, พระราม, พระลักษมณ์, ทศกัณฐ์, อินทรชิต, สุครีพ, องคต, พิเภก.

Each hero must differ in: Visual Identity, Gameplay Identity, Skill Identity, Progression Identity.

## PILLAR 4 — Deep Progression

Per hero: Level → Stars → Skill Level → Talent → Equipment → Set Bonus → Build.

## PILLAR 5 — Ranked PvP

Random Matchmaking · 1v1 Arena · MMR · Rank · Season · Rank Reward.

---

# §3 — Explicitly removed directions

**No longer product direction.** If found in repo → classify LEGACY / SUPERSEDED / REQUIRES MIGRATION:

| Removed                                             | Notes                               |
| --------------------------------------------------- | ----------------------------------- |
| Turn-based                                          | Combat only                         |
| MMORPG / Open World / Massive Shared World          |                                     |
| Zone Server / World Server                          |                                     |
| 3D Character / GLB Character / 3D Skeleton pipeline | Battle characters                   |
| Top-down gameplay                                   | Battle presentation                 |
| **360-degree attack**                               | Attack axis is LEFT/RIGHT only (§6) |
| Hero switching during stage                         | Pick one hero per stage run         |

**Do not preserve old direction just because code still exists.**

---

# §4 — Character visual architecture

**HIGH QUALITY 2D HD SPRITE** — no 3D model characters in production pipeline.

**Not used:** GLB character, 3D skeleton as character production.

**Animation set (minimum):** Idle, Movement, Attack, Combo, Dodge, Skill, Ultimate, Hit, Knockback, Knockdown, Death, Victory.

**Also:** Portrait, Character Select Art, Gacha Art, Skill Icons, VFX.

---

# §5 — 2.5D movement model

**CRITICAL:** Movement and Attack Direction are **separate systems**.

**Field:** 2.5D plane.

**Movement allowed:**

```
LEFT · RIGHT · UP · DOWN · DIAGONAL
```

Joystick may provide continuous movement vectors.

```
               UP / DEPTH
                   ↑
                   |
LEFT  ←──────── PLAYER ────────→ RIGHT
                   |
                   ↓
              DOWN / DEPTH
```

**UP/DOWN** changes **depth position** on the field.

---

# §6 — Attack axis (LOCKED)

**Attack axis has only:**

```
LEFT · RIGHT
```

**Not** 360° attack.

- Player moves in all directions to **align depth** with enemies.
- Basic Attack / Combo primary facing: **LEFT** or **RIGHT** only.

---

# §7 — Depth alignment combat

Combat loop:

```
MOVE → ALIGN DEPTH → APPROACH → ATTACK
```

If player and enemy are too far apart in **depth**, basic attack must **not** hit.

**Do not** require pixel-perfect Y alignment.

Support:

- **Horizontal attack range**
- **Depth tolerance band**

```
      ATTACK DEPTH AREA
   ┌─────────────────────┐
   │                     │
 P ●════════════════════►│
   │                     │
   └─────────────────────┘
```

Target must be within horizontal range **and** depth tolerance to be hit.

---

# §8 — Character facing (LOCKED)

Combat facing baseline: **LEFT · RIGHT** only.

No 8-direction attack animations.

**Asset strategy:** **RIGHT master sprite** → horizontal flip for LEFT when animation is symmetric.

---

# §9 — Movement sprites

May require: Walk Left, Walk Right, Walk Up, Walk Down.

Diagonal walk sprites: **optional** (art quality decision).

**Goal:** reduce asset explosion; invest in character quality, animation, skill VFX, gacha art.

---

# §10 — Mobile control

Reference: Mobile Action / Naruto-style arena UI.

| Left             | Right                                    |
| ---------------- | ---------------------------------------- |
| Virtual Joystick | Basic Attack, Dodge, Skill 1–4, Ultimate |

Must be readable, easy to tap, multi-touch capable, not overcrowded.

---

# §11 — PC control

Keyboard · Mouse · Controller-ready mapping.

**Input architecture:** separate **Physical Input** from **Game Action / Player Intent** so Mobile / PC / Controller share one combat core.

---

# §12 — Basic attack

Horizontal combat combo chain (example): Attack 1 → 2 → 3 → Finisher.

Lifecycle: **Startup → Active → Recovery** (+ optional Cancel Window).

---

# §13 — Skill system

Skills are **not** limited to horizontal hitboxes only.

Supported hit shapes: LINE, WIDE LINE, PROJECTILE, CONE, CIRCLE, AOE, DASH ATTACK, TARGET AREA, GROUND EFFECT.

---

# §14 — Dodge

Uses movement direction: Left, Right, Up, Down, Diagonal.

**Depth dodge** is critical — dodge up/down to leave horizontal attack lanes.

---

# §15 — Combat state model

Minimum states: Idle, Move, Attack, Skill, Ultimate, Dodge, HitStun, Knockback, Knockdown, GetUp, Invulnerable, Dead.

Require: State Priority, Interrupt Rules, Cancel Window, Recovery, Cooldown, Input Buffer.

---

# §16 — Hero identity (directional)

Heroes must not differ only by sprite and ATK number.

| Hero    | Role                    | Core fantasy                                    |
| ------- | ----------------------- | ----------------------------------------------- |
| Hanuman | Fast Fighter / Mobility | Fast combo, gap close, dash, clone/staff        |
| Rama    | Ranged DPS              | Projectile, precision, range control, burst     |
| Tosakan | Heavy Fighter           | Heavy hit, wide attack, area control, poise, CC |

Direction only — not final balance.

---

# §17 — Adventure mode

PvE core: **STAGE BASED**

```
CHAPTER 1: 1-1 → 1-2 → 1-3 → 1-4 → 1-5 BOSS → CHAPTER 2 …
```

---

# §18 — Stage length

| Type         | Target      |
| ------------ | ----------- |
| Normal stage | 2–5 minutes |
| Boss stage   | 5–8 minutes |

Mobile session friendly — “one more stage” feel.

---

# §19 — Stage structure

**Normal:** Start → Wave 1 → Advance → Wave 2 → Elite → Clear → Reward

**Boss:** Entry → Encounter → Challenge → Boss → Result

---

# §20 — Stage star rating

★★★ per stage. Example conditions:

| Star | Example                 |
| ---- | ----------------------- |
| ★1   | Clear stage             |
| ★2   | HP > 50%                |
| ★3   | Clear under target time |

Chapter star rewards: Gold, Material, Summon Ticket, Currency.

---

# §21 — Difficulty

Normal · Hard · Nightmare · Challenge.

Higher difficulty must add patterns, composition, aggression, hazards — **not** HP × N only.

---

# §22 — Hero selection

Account holds many heroes. Before stage: **pick exactly one** — use until stage ends. **No mid-stage hero switch.**

---

# §23 — Hero progression

Per-hero: Level → Stars → Skill Level → Talent → Equipment → Set Bonus → Build.

---

# §24 — Hero gacha

Core collection loop:

```
Summon → (new) UNLOCK HERO
       → (duplicate) SOUL FRAGMENT → STAR ASCENSION
```

---

# §25 — Star ascension

Baseline: ★1 → ★2 → ★3 → ★4 → ★5 → ★6

| Star | Design intent           |
| ---- | ----------------------- |
| ★1   | Fully playable core kit |
| ★2   | Minor power / passive   |
| ★3   | Skill enhancement       |
| ★4   | Stats / utility         |
| ★5   | Major passive / synergy |
| ★6   | Signature enhancement   |

Duplicates must have value; ★1 must never be an incomplete character.

---

# §26 — Monetization direction (LOCKED)

**Not** premium one-time purchase as core model.

**Core:** Hero Gacha + Duplicate / Star Ascension.

**Potential secondary:** Skin, Season Pass, Starter Pack, Progression Bundle, Convenience.

**Must not:** sell best equipment primarily via direct purchase.

---

# §27 — Loot RPG

Equipment from gameplay. Rarity, main stat, random affix, upgrade, set bonus.

**Goal:** build hunting — not “higher number = always equip.”

---

# §28 — Progression split (LOCKED)

| Source       | Progression                           |
| ------------ | ------------------------------------- |
| **Gacha**    | Hero + Stars                          |
| **Gameplay** | Level + Equipment + Materials + Build |

Both connect; gameplay must retain value even for paying gacha players.

---

# §29 — PvP core mode

**Random Matchmaking PvP** — baseline **1v1**.

```
Select Hero → Queue → Matchmaking → Opponent Found → Arena
→ Battle → Win/Lose → MMR → Rank → Reward
```

---

# §30 — PvP combat

Same combat core as PvE: 2.5D movement, depth alignment, left/right attack, dodge, skills, ultimate.

Skill expression: positioning, depth movement, lane change, dodge timing, combo timing, punish, cooldown management, hero matchup.

---

# §31 — PvP matchmaking

Prepare for: MMR, Rank, Latency, Queue Time.

Philosophy: start tight MMR range; expand search if queue waits too long.

---

# §32 — Rank system

Example ranks: Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster.

**Visible Rank** + **Internal MMR**.

---

# §33 — PvP season

Season Start → Rank Matches → Climb → Season Reward → Soft Reset → Next Season.

Rewards: Skin, Frame, Title, Currency, Summon Ticket.

---

# §34 — PvP vs Gacha (LOCKED requirement)

PvE may use full progression.

**Ranked PvP must have a PvP Balance Layer** — e.g. stat normalization, PvP scaling, equipment/star scaling, or hybrid.

**Must not** apply raw PvE power to ranked without balance design.

Final PvP progression rule requires Game/System Design approval.

---

# §35 — Game modes roadmap

**Core first:** Adventure · Boss · Ranked PvP

**Later (after core stable):** Material Stage, Equipment Stage, Hero Trial, Tower, Event Stage.

Do not build all modes at once.

---

# §36 — Backend direction

**Not** MMORPG architecture. No world server, zone server, persistent MMO world.

```
CLIENT → GAME API → Backend Modules → Database
```

Future modules: Account, Hero, Progression, Inventory, Equipment, Economy, Gacha, Adventure, PvP Matchmaking, Rank, Shop, Event.

PvP eventually needs match server / authoritative match layer.

---

# §37 — Server authority (LOCKED)

Server is source of truth for valuable data:

Account, Hero Ownership, Hero Stars, Currency, Gacha, Inventory, Equipment, Rank, MMR, Purchase, Important Reward.

Client must **not** self-authorize hero grants, currency, rank, or match wins without server validation.

---

# §38 — Art production pipeline

```
Concept → Master Design → Movement Sprites → Combat Sprites
→ Skill Animation → Ultimate → VFX → Portrait → Gacha Illustration
→ Icons → Sprite Atlas → Game Integration
```

---

# §39 — Art cost control

Attack axis LEFT/RIGHT → no 8-direction attack sprites.

RIGHT master + horizontal flip for LEFT when symmetric.

UP/DOWN movement sprites as needed; diagonal optional.

Invest in quality over redundant sprite count.

---

# §40 — Data-driven content

**StageDefinition** (target fields): `id`, `chapter`, `stage`, `background`, `bounds`, `enemyWaves`, `spawnPositions`, `elite`, `boss`, `objectives`, `timeTarget`, `starConditions`, `rewards`, `dropTable`, `recommendedPower`.

**HeroDefinition** (target fields): `id`, `name`, `rarity`, `baseStats`, `growth`, `basicCombo`, `skills`, `ultimate`, `starProgression`, `assetSet`, `tags`.

---

# §41 — Team responsibility (LOCKED)

| Domain                     | Owns                                                                                                                              | Must not                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Design / Asset**         | Character art, sprites, animation, VFX, gacha art, portrait, UI, environment, spreadsheet prep                                    | Change combat rules alone   |
| **Game / System Design**   | Combat rules, hero kits, stages, PvP/rank rules, progression, gacha, economy, loot, balance, UX, acceptance criteria              | — (gameplay decision owner) |
| **Backend / Architecture** | Code architecture, game state, data, account, DB, economy, gacha tx, PvP matchmaking, rank/MMR, tests, CI, deploy, git, fork sync | Redesign gameplay alone     |

Escalate conflicts as **DESIGN CONSTRAINT** or **ARCHITECTURAL CONFLICT**.

---

# §42 — Engineering governance (LOCKED)

**One topic = one PR.**

Forbidden: “Implement Blueprint v2” in a single PR.

Example PR sequence: Blueprint baseline → Movement Plane → Facing L/R → Depth Alignment → Basic Attack → Hit Detection → Combo → Dodge → …

---

# §43 — MEMORY.md rule

Every PR that changes architecture, rules, contracts, or project direction must update `MEMORY.md`.

MEMORY.md holds: Current Baseline, Locked Decisions, Important Contracts, Known Constraints, Current Migration State — **not** a long changelog.

---

# §44 — Fork sync rule

“ปรับหน้าสมุดให้ตรงกัน” — before new PRs, check upstream/fork divergence; after merge, sync fork. Do not let code, docs, rules, or MEMORY.md diverge for long.

---

# §45 — Development roadmap (dependency guide)

| Priority | Track                               |
| -------- | ----------------------------------- |
| **P0**   | Blueprint / Legacy Audit            |
| **P1**   | 2.5D Movement                       |
| **P2**   | Left/Right Facing + Depth Alignment |
| **P3**   | Basic Attack + Hit Detection        |
| **P4**   | Combo + Dodge                       |
| **P5**   | Skill + Ultimate Framework          |
| **P6**   | Enemy AI                            |
| **P7**   | Stage 1-1 Vertical Slice            |
| **P8**   | Boss Prototype                      |
| **P9**   | Chapter / Adventure System          |
| **P10**  | Hero Progression                    |
| **P11**  | Equipment / Loot RPG                |
| **P12**  | Hero Collection / Gacha / Stars     |
| **P13**  | Account / Server Economy            |
| **P14**  | PvP 1v1 Prototype                   |
| **P15**  | Matchmaking                         |
| **P16**  | Rank / MMR / Season                 |
| **P17**  | Content Pipeline                    |
| **P18**  | Shop / Live Content                 |
| **P19**  | Production Content                  |
| **P20**  | Polish / Launch                     |

Not a command to do all immediately.

---

# §46 — First real game target: Vertical Slice A

Before building all systems:

**Hero:** หนุมาน ×1 — production-quality 2D sprite.

**Movement:** L/R/U/D + diagonal input.

**Combat:** L/R facing, depth alignment, basic combo, dodge, skills, ultimate.

**Enemies:** 2–3 types.

**Content:** Stage `1-1` — Start → Fight → Clear → Reward.

---

# §47 — Second target: Vertical Slice B

After PvE combat passes:

**Hero A vs Hero B** — 1v1 arena, same combat core.

Prove: depth movement, L/R attack, dodge, skill, KO, result — before full rank system.

---

# §48 — Current adopting PR mission

This PR only:

1. Audit repo, docs, MEMORY, old blueprint/rules
2. Identify conflicts with new direction
3. Create this blueprint + migration audit
4. Update MEMORY.md and direction references
5. Open PR and **STOP**

**No** roadmap implementation in this PR.

---

# §49 — Required documents

| Document                               | Role                           |
| -------------------------------------- | ------------------------------ |
| `docs/MASTER_BLUEPRINT_v2.0.md`        | Product North Star (this file) |
| `docs/BLUEPRINT_V2_MIGRATION_AUDIT.md` | Implementation reality vs v2.0 |

Old blueprint: mark **SUPERSEDED BY MASTER_BLUEPRINT_v2.0.md** — do not delete history.

---

# §50 — Migration audit labels

| Label      | Meaning                         |
| ---------- | ------------------------------- |
| ALIGNED    | Matches v2.0                    |
| PARTIAL    | Scaffold exists, incomplete     |
| LEGACY     | Pre-v2.0 direction in code/docs |
| SUPERSEDED | Replaced; remnants may remain   |
| MISSING    | Not built                       |
| UNKNOWN    | Insufficient evidence           |

---

# §51 — Do not delete blindly

Even turn-based or old systems: **do not mass-delete in a docs PR.**

First document: dependencies, shared architecture, UI-only vs core, delete vs migrate vs preserve.

---

# §52 — Recommend next PR

After audit: propose **exactly one** next PR from real repo dependencies — not blind roadmap order.

---

# §53 — Testing

Documentation PR must not break the project. Run existing tests, CI-equivalent commands, build, typecheck, lint. Report honestly if a command does not exist.

---

# §54 — Acceptance criteria (adopting PR)

- [ ] Repository audited
- [ ] Branch / HEAD recorded
- [ ] Fork/upstream divergence checked
- [ ] Master Blueprint v2.0 created
- [ ] Old blueprint marked superseded
- [ ] MEMORY.md updated
- [ ] Migration audit created
- [ ] Turn-based, MMORPG, 3D character assumptions classified
- [ ] Movement/attack rules locked
- [ ] Adventure, gacha, PvP rules locked
- [ ] Team responsibility locked
- [ ] 1 topic = 1 PR locked
- [ ] Tests/build pass
- [ ] No large feature implementation
- [ ] PR opened, not merged
- [ ] Exactly one recommended next PR

---

# §55 — Final report format

See adopting PR description / agent final message.

---

# §56 — Stop condition

After opening PR: **STOP.**

Do not merge, start next PR, delete turn-based, refactor combat, build gacha/rank/PvP/stage/backend, or out-of-scope cleanup.

Wait for review.

---

# Final source of truth

| Layer             | Document                               |
| ----------------- | -------------------------------------- |
| Product direction | `docs/MASTER_BLUEPRINT_v2.0.md`        |
| Project memory    | `MEMORY.md`                            |
| Migration reality | `docs/BLUEPRINT_V2_MIGRATION_AUDIT.md` |
| Feature detail    | Issue / Feature Spec                   |
| Implementation    | Source Code                            |
| Verification      | Tests                                  |

---

# Final project statement

**Legend of Soul TH** is a **Stage-Based 2.5D Action RPG** themed **Ramakien**.

Players move **up/down/left/right** on a 2.5D field using **depth positioning** to align with enemies, but **primary attacks face left or right only**.

**Adventure:** `1-1`, `1-2`, … Boss chapters.  
**Collection:** Hero gacha; duplicates feed star ascension.  
**Progression:** Level, equipment, loot builds.  
**PvP:** Ranked 1v1 — matchmaking, MMR, rank, seasons.

The game must feel: smooth, easy to control, beautiful characters and skills, skillful combat, collectible heroes, long-term progression.

**Do not revert** to Premium Single-player Blueprint, MMORPG Blueprint, Turn-based Direction, or 3D Character Direction without explicit new instruction from Game/System Design.
