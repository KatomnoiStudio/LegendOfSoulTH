# Legend of Soul TH — Master Blueprint v3.0

> **Document type**: Product Specification + Master Blueprint + Agent Work Contract  
> **Status**: ADOPTED as Product Baseline (documentation PR — no gameplay implementation in the same change)  
> **Operator**: HetCreep (Ring 0 — live direction lock, 2026-08-07)  
> **Agent author**: Cursor Agent (cloud)  
> **Created**: 2026-08-07  
> **Source**: HetCreep baseline refinement — supersedes v2.0 in-flight direction  
> **Scope**: Documentation / Governance / Audit / Migration Roadmap only  
> **Companion**: [`BLUEPRINT_V3_MIGRATION_AUDIT.md`](BLUEPRINT_V3_MIGRATION_AUDIT.md)  
> **Supersedes**: [`MASTER_BLUEPRINT_v1.0.md`](MASTER_BLUEPRINT_v1.0.md) · v2.0 draft/PR direction · [`BLUEPRINT_GAP_ANALYSIS.md`](BLUEPRINT_GAP_ANALYSIS.md)

---

## How agents must use this document

1. This file is the **Product North Star** and **locked decision record**.
2. Agents **must not reinterpret** locked decisions below.
3. Conflicting code → **AUDIT, DOCUMENT, CLASSIFY** — no gameplay rewrites in a docs PR.
4. Implementation = **separate PRs**, **one topic = one PR**.
5. Items marked **DEFERRED** or **CUT** must not be reintroduced without explicit HetCreep approval.
6. Do not delete legacy code blindly — migration audit first.

---

## One-line definition (LOCKED)

> **Legend of Soul TH** is a **Stage-based 2.5D Hero Collection Action RPG** using **2D HD Sprites** from diverse literature and legends. Players move up/down/left/right to align attacks, fight with **Basic Attack + 3 Skills + Ultimate**, clear stages and bosses, collect heroes via gacha, raise stars and develop characters, then enter **1v1 Ranked PvP** later.

---

# §1 — Product identity

## 1.1 Genre & pillars

| Pillar                    | Focus                       |
| ------------------------- | --------------------------- |
| **PvE Adventure** (first) | Chapter/stage progression   |
| **Hero Collection**       | Core long-term engagement   |
| **Ranked PvP** (later)    | 1v1 matchmaking by rank/MMR |

Combat genre: **Stage-based 2.5D Action RPG** — realtime, positioning-based, mobile-friendly.

## 1.2 Universe of Legends (LOCKED)

The game is **not** “Ramakien only.”

- **Brand framing:** **Universe of Legends** — heroes from literature, myth, and public-domain character sets.
- **Ramakien** may be the **first Chapter / Series** — not the entire product ceiling.
- Hero roster must scale to **many distinct characters** — art capacity is **not** the primary bottleneck; **gameplay identity** is.

## 1.3 Visual standard

- **2D HD Sprite** characters in combat — **not** 3D / GLB character pipeline.
- Lobby/environment 3D (if any) is presentation only — not the character production path.

---

# §2 — Core loop (LOCKED)

```
Adventure → Stage → Combat → Clear
    → EXP / Material / Currency
        → Hero Upgrade
            → Gacha → Hero / Star
                → Harder Stages
```

**Early phase:** rewards are **EXP, materials, currency** — **not** gear-hunt loot.

---

# §2.1 — Explicitly CUT from scope (early / current baseline)

Do **not** plan or implement these until HetCreep reopens them:

| CUT                          | Notes                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------- |
| **Loot RPG** (gear hunt)     | Deferred — prove combat + stage loop first                                      |
| **Equipment random affix**   | Deferred                                                                        |
| **Set bonus**                | Deferred                                                                        |
| **Talent tree**              | Deferred                                                                        |
| **Awakening**                | Deferred                                                                        |
| **MMORPG / Open World**      | Never                                                                           |
| **3D character pipeline**    | Never for heroes                                                                |
| **Hero switching mid-stage** | Never                                                                           |
| **Skill 4 button**           | CUT — use **3 Skills + Ultimate**                                               |
| **Separate Dash button**     | CUT — dodge/mobility via skills or movement design, not a dedicated dash button |

---

# §3 — Combat model

## 3.1 Movement (LOCKED)

- Field: **2.5D plane**
- Move: **left, right, up, down, diagonal** (joystick vector OK)
- **Up/down = depth** positioning to align with enemies
- Movement and attack direction are **separate systems**

## 3.2 Attack axis (LOCKED)

- Primary attacks face **LEFT or RIGHT only**
- **Not** 360° attack
- Depth alignment required: horizontal range + **depth tolerance** (not pixel-perfect Y)

## 3.3 Controls — mobile (LOCKED)

| Left             | Right            |
| ---------------- | ---------------- |
| Virtual joystick | **Basic Attack** |
|                  | **Skill 1**      |
|                  | **Skill 2**      |
|                  | **Skill 3**      |
|                  | **Ultimate**     |

**No separate Dash button.**

PC: keyboard/mouse/controller-ready; same action layer.

## 3.4 Skills

- **3 skills + 1 ultimate** per hero (baseline kit)
- Skills may use varied hit shapes (line, projectile, AOE, etc.) — not limited to horizontal basic-attack box
- Mobility/evasion may live **inside skills**, not a global dash button

## 3.5 Facing & assets

- Combat facing: **LEFT / RIGHT**
- **RIGHT master sprite** → horizontal flip for LEFT when symmetric
- Movement sprites: L/R/U/D; diagonal optional

---

# §4 — Hero collection & progression

## 4.1 Collection (LOCKED — central pillar)

- Gacha unlocks heroes; duplicates → **star ascension**
- Heroes must differ by **archetype / gameplay**, not reskins with same kit

**Target archetype examples:** Fighter, Ranged, Control, Summoner, Heavy, Assassin, Support, or unusual legend-inspired kits.

**Anti-pattern:** 50 heroes with identical gameplay.

## 4.2 Early progression (LOCKED — simplified)

Only these layers in **phase 1**:

```
Hero Level → Star → Skill Level
```

**Deferred:** Talent, Awakening, Equipment, Loot affixes, Set bonus.

## 4.3 Star balance note (LOCKED)

- ★1 must be **fully playable** (complete core kit)
- Duplicate value via star ascension
- **Power gap between star tiers must be bounded** — especially for PvP fairness (see §6)

---

# §5 — Adventure & stages

## 5.1 Structure (LOCKED)

```
Chapter → Stage → Stage → … → Boss
Example: 1-1 → 1-2 → 1-3 → 1-4 → 1-5 Boss → Chapter 2 …
```

- Pick **one hero** before stage; no mid-stage switch
- Normal stage target: **2–5 min**; boss: **5–8 min**

## 5.2 Stage design (LOCKED)

**Not every stage is Wave → Wave → Elite.**

Required **variation** examples:

- Survival
- Defend
- Chase
- Hazard
- Mini-boss
- Time Attack
- Custom objectives

Goal: **positioning and vertical movement matter** — not repetitive arena waves.

## 5.3 Rewards (early)

- **EXP, materials, currency** on clear
- No gear/affix drops in early phase

---

# §6 — PvP (later phase)

## 6.1 Mode (LOCKED)

- **Single ranked system** — no separate Casual/Normalized modes at launch
- Flow: **Select Hero → Queue → Match by Rank/MMR → 1v1 → Win/Lose → Rank update**

## 6.2 Matchmaking philosophy

- Match **within rank band** first; expand search if queue waits
- Rank band reduces raw power mismatch but **does not replace** star-gap balance design
- When tuning numbers: **limit star power gap** so ★6 does not auto-win vs ★1 in the same rank

## 6.3 Combat core

Same 2.5D movement + L/R attack + 3 skills + ultimate as PvE.

---

# §7 — Monetization (direction)

- **Core:** Hero Gacha + star ascension
- **Secondary (later):** skins, season pass, starter pack, convenience — TBD
- **Must not:** sell best power primarily via direct purchase
- Premium one-time purchase model: **SUPERSEDED** (v1.0)

---

# §8 — Backend

- **Not** MMO / open world / zone server
- Target: Client → Game API → modules → database
- Valuable data (account, heroes, stars, currency, gacha, rank, MMR) → **server authority**
- Supabase work in repo is **early seam** toward this — not full game authority yet

---

# §9 — Art strategy (LOCKED)

- Art team can support **high hero volume** — use that advantage
- Invest in **distinct kits and quality**, not duplicate gameplay
- 2D sprite pipeline; no 8-direction attack sprites

---

# §10 — Development roadmap (LOCKED sequence)

Dependency guide — **not** “build everything now”:

| Priority | Track                                                 |
| -------- | ----------------------------------------------------- |
| **P0**   | Blueprint v3 (this document)                          |
| **P1**   | Movement / Depth                                      |
| **P2**   | Basic Combat (L/R attack, depth alignment, hit model) |
| **P3**   | 3 Skills + Ultimate framework                         |
| **P4**   | Enemy AI                                              |
| **P5**   | Stage 1-1 vertical slice                              |
| **P6**   | Boss prototype                                        |
| **P7**   | Chapter / Stage system                                |
| **P8**   | Hero Level / Skill progression                        |
| **P9**   | Gacha / Stars                                         |
| **P10**  | Hero Collection expansion                             |
| **P11**  | PvE content expansion                                 |
| **P12**  | PvP prototype                                         |
| **P13**  | Matchmaking / Rank                                    |
| **P14**  | Monetization / Shop (basic)                           |
| **P15**  | Live content                                          |

**Deferred past early phase:** Loot RPG, equipment affix, set bonus, talent, awakening.

---

# §11 — Vertical slice A (first playable target)

Before wide systems:

- **1 hero** (e.g. หนุมาน) — production 2D sprite
- Movement: L/R/U/D + diagonal input; depth alignment
- Combat: L/R basic attack, **3 skills + ultimate** (no dash button)
- **2–3 enemy types**
- **Stage 1-1:** Start → Fight → Clear → EXP/material/currency reward

---

# §12 — Engineering governance

1. **One topic = one PR**
2. Docs PR = classify only
3. Update `MEMORY.md` when direction/contracts change
4. Sync fork/upstream before implementation PRs
5. After docs PR: **stop for review**

---

# §13 — Source of truth

| Layer             | Document                               |
| ----------------- | -------------------------------------- |
| Product direction | `docs/MASTER_BLUEPRINT_v3.0.md`        |
| Migration reality | `docs/BLUEPRINT_V3_MIGRATION_AUDIT.md` |
| Project memory    | `MEMORY.md`                            |
| Implementation    | Source code                            |
| Verification      | Tests                                  |

---

# §14 — Superseded directions (history)

| Prior                                                 | Status                           |
| ----------------------------------------------------- | -------------------------------- |
| Blueprint v1.0 (premium, dungeon-only)                | SUPERSEDED                       |
| Blueprint v2.0 (4 skills + dash, loot RPG in roadmap) | SUPERSEDED by v3                 |
| Turn-based                                            | SUPERSEDED                       |
| Top-down combat                                       | LEGACY in code — migrate         |
| 360° attack                                           | SUPERSEDED                       |
| Ramakien-only product ceiling                         | SUPERSEDED → Universe of Legends |

---

_Operator: HetCreep · Agent: Cursor Agent (cloud) · 2026-08-07_
