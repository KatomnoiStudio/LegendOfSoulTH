# Legend of Soul TH — Master Blueprint v3.0

> **Document type**: Product Specification + Master Blueprint + Agent Work Contract  
> **Status**: ADOPTED as Product Baseline (documentation PR — no gameplay implementation in the same change)  
> **Operator**: HetCreep (Ring 0 — live direction lock, 2026-08-07)  
> **Agent author**: Cursor Agent (cloud)  
> **Created**: 2026-08-07  
> **Source**: HetCreep baseline refinement — supersedes v2.0 in-flight direction  
> **Scope**: Documentation / Governance / Audit / Migration Roadmap only  
> **Supersedes**: Blueprint v1.0, v2.0 draft direction, and the v1.0-era gap analysis — all deleted, this is the sole blueprint file (§14)

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

| CUT                          | Notes                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loot RPG** (gear hunt)     | Deferred — prove combat + stage loop first                                                                                                                                                                                                                                               |
| **Equipment random affix**   | Deferred                                                                                                                                                                                                                                                                                 |
| **Set bonus**                | Deferred                                                                                                                                                                                                                                                                                 |
| ~~**Talent tree**~~          | **Un-deferred 2026-08-09 (item #7)** — already fully built (`progressionSchema.ts`, `progressionService.ts:unlockTalent`, live in `0008_progression_state.sql`); UI stays hidden via `showTalentAwakeningUi:false` until ready to reveal, but the system itself is no longer "not built" |
| ~~**Awakening**~~            | **Un-deferred 2026-08-09 (item #7)** — same as Talent tree, `advanceAwakening()` fully working, DB-persisted                                                                                                                                                                             |
| **MMORPG / Open World**      | Never                                                                                                                                                                                                                                                                                    |
| **3D character pipeline**    | Never for heroes                                                                                                                                                                                                                                                                         |
| **Hero switching mid-stage** | Never                                                                                                                                                                                                                                                                                    |
| **Skill 4 button**           | CUT — use **3 Skills + Ultimate**                                                                                                                                                                                                                                                        |
| **Separate Dash button**     | CUT — dodge/mobility via skills or movement design, not a dedicated dash button                                                                                                                                                                                                          |

---

# §3 — Combat model

## 3.1 Movement (LOCKED)

- Field: **2.5D plane**
- Move: **left, right, up, down, diagonal** (joystick vector OK)
- **Up/down = depth** positioning to align with enemies
- Movement and attack direction are **separate systems**

## 3.2 Attack axis (LOCKED, exception carved 2026-08-09)

- Primary attacks face **LEFT or RIGHT only**
- **Not** 360° for the **Basic Attack** specifically
- **Skills and Ultimate MAY use a 360°/radial hit shape** — revised via the blueprint-vs-code audit (`wf_acfdbf87-87e`, item #1): the shipped Monkey King kit (`attacks.ts`) already uses `arcDegrees:360` for S1 (spinning staff) and the Ultimate (Golden Fury), which reads correctly as an AoE skill design, not a violation of the LEFT/RIGHT basic-attack lock. §14's history table entry "360° attack — SUPERSEDED" refers to the old **turn-based/basic-attack** direction system, not a blanket ban on any radial skill.
- Depth alignment required: horizontal range + **depth tolerance** (not pixel-perfect Y)

## 3.3 Controls — mobile (LOCKED)

| Left             | Right            |
| ---------------- | ---------------- |
| Virtual joystick | **Basic Attack** |
|                  | **Skill 1**      |
|                  | **Skill 2**      |
|                  | **Skill 3**      |
|                  | **Ultimate**     |

**Layout (REVISED + LOCKED 2026-08-08, HetCreep):** joystick **bottom-left**; **S1 → S2 → S3 → Ultimate** form a curved right-thumb **Combat Cluster around** the attack button; **Basic Attack** = **largest button, bottom-right**. Buttons must remain inside device safe areas, keep at least 48px touch targets, and never overlap at supported landscape sizes. Walk and press Attack/Skill simultaneously (separate pointer ids). This supersedes the 2026-08-07 straight-row arrangement.

**Button presentation (LOCKED 2026-08-07):**

- **Basic Attack, Skills S1–S3, Ultimate:** all share the same button style — **short text label** (`ATK`/`S1`/`S2`/`S3`/`ULT`) until real icons land, **art icons TBD** (placeholder until assets land) — **revised 2026-08-07** from an earlier icon-only-for-Attack draft: PR #24 shipped a uniform label style across the whole cluster (easier to learn the reference layout), the blueprint now matches what's live rather than the reverse
- **Ultimate when gauge empty:** button **pressable but no effect** (no disabled state required)

**PC keybinds (LOCKED):** Attack `J` / `Space` · S1 `1`/`E` · S2 `2`/`R` · S3 `3`/`F` · Ultimate `4`/`Q`

**No separate Dash button.**

**No soft-target, no auto-snap, no hard lock-on UI.** See §3.6.

PC: keyboard/mouse/controller-ready; same action layer.

## 3.4 Skills

- **3 skills + 1 ultimate** per hero (baseline kit)
- Skills may use varied hit shapes (line, projectile, AOE, etc.) — not limited to horizontal basic-attack box
- Mobility/evasion may live **inside skills**, not a global dash button

## 3.5 Facing & assets

- Combat facing: **LEFT / RIGHT**
- **RIGHT master sprite** → horizontal flip for LEFT when symmetric
- Movement sprites: L/R/U/D; diagonal optional

## 3.6 Combat Foundation Design Lock (LOCKED — HetCreep Ring 0, 2026-08-07)

> **Status:** Design contract for P4 (Enemy AI) and P6 (Boss).  
> **Closes gap:** fork issue [#33](https://github.com/nustanakritwithai/GameTurnBase/issues/33) (boss telegraph/state-machine + soft-target).  
> **Implementation:** separate PRs only — this section is documentation, not gameplay code.

### 3.6.1 Controls & targeting

| Rule                                         | Decision                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mobile layout                                | Joystick left + S1/S2/S3/U + large Attack bottom-right (§3.3)                                |
| Dash button                                  | **CUT** — not in UI                                                                          |
| Soft-target / auto-snap / hard lock (global) | **CUT** for basic movement, facing, and basic attack — player positions depth + L/R manually |
| Skill-specific target lock                   | **Allowed per skill definition only** (e.g. Ultimate — see §3.7); not a global assist        |
| `combatFacing` source                        | Movement / joystick vector                                                                   |
| Vertical-only movement                       | **Keep previous facing** (no auto flip)                                                      |
| Walk + Attack/Skill                          | **Allowed** simultaneously                                                                   |

### 3.6.2 Basic attack

- **Multi-target:** every enemy inside the active hitbox takes damage — **not** single-target selection.
- **No target magnet:** attacks do not pull the player toward enemies.
- **Attack lunge:** on press, character moves **slightly forward** along `combatFacing`. This is **lunge**, not magnet.
- **Flow:** `Movement → Attack Wind-up/Lunge → AttackActive → Recovery`

### 3.6.3 Movement during combat

- Player may **press Attack while walking**.
- During **AttackActive**, **no 100% free movement** — attack animation/lunge drives position to prevent unnatural hitbox dragging through enemies.

### 3.6.4 Skill casting

- Skills support **cast delay / wind-up** before AttackActive.
- **Flow:** `Input → Cast/Wind-up → AttackActive → Recovery`
- During cast/wind-up: if hit by an **interruptible** attack → **cancel cast** → `Casting → Interrupted → Hit Reaction`
- **Do not** hard-code “every skill interrupts the same.” Per-move properties govern behavior.

### 3.6.5 Normal hit reaction

When hit by a **normal/basic** attack:

`Hit → Small Knockback → Short Hitstun → Resume`

- Small backward push + brief stun.
- **Knockdown is NOT** the default for every normal hit.

**Knockdown reserved for:** heavy attacks, specific skills, and combo finishers — **but only against elite/boss-tier targets** (§3.6.12). Normal mobs always take hit-stun only, regardless of which move category lands (resolves an earlier ambiguity between this line and the §3.6.12 tuning table — the table is the source of truth).

### 3.6.6 Interrupt rules

Interrupt capability is a **per-attack property**, not a global rule.

**Forbidden:** “getting hit always cancels everything.”

Future **hyper armor / uninterruptible** windows are allowed per move design.

### 3.6.7 Per-move property contract (LOCKED schema)

Every attack/skill definition should carry its own data (extend `AttackDefinition` / skill defs in implementation PRs):

| Property                                | Purpose                                                                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startupMs` / `activeMs` / `recoveryMs` | Phase timing (existing)                                                                                                                                                                                                      |
| `castDelayMs`                           | Wind-up before active (skills; basic may be 0 or folded into startup)                                                                                                                                                        |
| `interruptible`                         | Can this phase be cancelled by incoming hit?                                                                                                                                                                                 |
| `movementDuringCast`                    | Allowed movement while casting (usually none or reduced)                                                                                                                                                                     |
| `lungeDistance`                         | Forward displacement on attack (basic attack lunge)                                                                                                                                                                          |
| `hitstunMs`                             | Stun applied to target on hit                                                                                                                                                                                                |
| `knockback`                             | Push distance (existing)                                                                                                                                                                                                     |
| `knockdown`                             | Whether this move can knock down                                                                                                                                                                                             |
| `multiTarget`                           | Hit all in box vs single target (basic = true)                                                                                                                                                                               |
| `hitShape` / `range` / `depthTolerance` | Hit geometry (existing P2 model)                                                                                                                                                                                             |
| `effects[]`                             | Optional non-damage effects (§3.8) — kinds: `heal`/`buff`/`cc`/`summon`; each with its own `target` (`self`/`singleEnemy`/`nearestEnemy`/`allEnemies`/`singleAlly`/`allAllies`/`aoe`); omitted entirely on pure-damage moves |

Boss/enemy attacks additionally define: `telegraphMs`, `attackShape`, phase eligibility.

### 3.6.8 Enemy & boss state machine (LOCKED)

Core loop:

`Idle → Chase → Telegraph → AttackActive → Recovery → Chase`

Interruption states:

`Hit → (Knockdown → GetUp → Chase)` when rules allow

| State                 | Notes                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **Telegraph**         | Wind-up; player reads danger before damage                        |
| **AttackActive**      | Damage window                                                     |
| **Recovery**          | Punish window                                                     |
| **Knockdown / GetUp** | Elite/boss (and specific moves) — not default for normal mob hits |

**Telegraph feedback layers:**

1. **Ground marker** (required) — on 2.5D floor plane
2. **Cast bar** (boss / elite)
3. **Sprite tint** (wind-up → active)
4. **SFX / screen edge** (optional later; respect `prefers-reduced-motion`)

Each boss attack is its own data row: telegraph/active/recovery duration, shape, interruptible, damage, knockback, knockdown.

### 3.6.9 Boss phase transition (LOCKED)

When HP crosses a threshold (e.g. 50%):

**Do not** cut the current action immediately.

**Flow:** `Current Action → Finish Current Action → PhaseTransition → Invulnerable → Phase 2`

During **PhaseTransition:**

- Boss stops attacking
- Plays transition animation
- **Invulnerable**
- Swaps attack set for new phase
- Enters Phase 2 only after transition completes

Prevents state-machine collisions between Telegraph/AttackActive/Recovery and phase change.

### 3.6.10 Explicitly OUT of this foundation

Do **not** add while implementing P4/P6 foundation:

- Dash button
- Soft-target / auto-target / **global** lock-on UI
- QTE dodge
- Heavy 3D telegraph VFX (markers + tint first)

Combat remains a **2.5D positioning-based brawler:** player controls **movement + depth + facing + attack timing**.

### 3.6.11 Basic Attack Combo System (LOCKED — HetCreep Ring 0, 2026-08-07)

| Rule                 | Decision                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Hit count**        | **3 hits** per combo chain                                                                                                            |
| **Combo window**     | **Keep current implementation** (~700 ms window per chain step — tune in playtest)                                                    |
| **Combo reset**      | Stop attacking → may **start again at hit 1** as soon as the next attack input is valid (no extra decay timer beyond recovery/window) |
| **Finisher (hit 3)** | **Per-character** — defined in each hero's kit data (e.g. stronger, longer range than normals/skills); not one global finisher rule   |
| **Cancel rules**     | **No cancel** between basic-attack combo and skills (cannot skill-cancel combo or attack-cancel skill)                                |
| **Input buffer**     | **Keep current** — buffer early input, never skip recovery                                                                            |
| **Animation**        | **Full sprite set** for every combo phase (startup / active / recovery per hit)                                                       |

### 3.6.12 Initial combat tuning (baseline — playtest & adjust)

HetCreep: set sensible defaults first; **values below are starting points**, not final balance.

| Parameter                                            | Initial value                              | Notes                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lungeDistance` (basic, per hit)                     | 32 / 36 / 44                               | Hit 1 → 2 → 3; hit 3 slightly longer                                                                                                                                               |
| `hitstunMs` (normal basic on hit)                    | 200                                        | Short stun before resume                                                                                                                                                           |
| `knockback` (basic)                                  | keep `attacks.ts` chain values             | Tune in playtest                                                                                                                                                                   |
| `castDelayMs` S1 / S2 / S3 / Ult                     | 0\* / 250 / 320 / 480                      | \*S1 folded into existing startup                                                                                                                                                  |
| `interruptible` (default skill)                      | `true` during cast                         | Per-skill override in kit                                                                                                                                                          |
| `interruptible` (Ultimate, telegraph/startup/active) | `false`                                    | Monkey King ult — hyper-armor through the strike itself, **recovery is cancelable** (revised 2026-08-09, item #5 — matches shipped `attacks.ts` + `SkillSystem.test.ts`), see §3.7 |
| `movementDuringCast` (default)                       | `none`                                     | S3 leap uses skill-driven displacement, not free walk                                                                                                                              |
| Mob `telegraphMs`                                    | 280                                        | Normal melee enemy                                                                                                                                                                 |
| Boss `telegraphMs`                                   | 800–1200                                   | Per attack row                                                                                                                                                                     |
| Knockdown on normal mob                              | **no**                                     | P4 mobs use Hit stun only                                                                                                                                                          |
| Knockdown                                            | elite/boss + heavy moves + combo finishers | Per move flag                                                                                                                                                                      |
| Boss phase threshold                                 | **50% HP**                                 | **2 phases** baseline                                                                                                                                                              |
| `getUp` i-frames                                     | 200 ms                                     | After knockdown                                                                                                                                                                    |

## 3.7 Reference hero kit — หนุมาน / Monkey King (LOCKED baseline)

First vertical-slice kit. Other heroes follow the same **per-hero kit file** pattern.

| Slot         | Name (TH)                                     | Design                                                                                        | Implementation notes                                                                                                                                                                                |
| ------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Basic**    | โจมตีปกติ                                     | 3-hit combo, multi-target, lunge                                                              | §3.6.11; finisher hit 3 tuned per §3.6.12                                                                                                                                                           |
| **S1**       | กระบวนทองคำ                                   | Spinning staff (existing)                                                                     | Radial AoE — already shipped                                                                                                                                                                        |
| **S2**       | กระบองตีระยะไกล                               | Long-range staff strike                                                                       | Horizontal or line hit; **no** target lock                                                                                                                                                          |
| **S3**       | กระบองกวาดกว้าง (revised 2026-08-09, item #6) | Wide staff sweep — matches shipped `MONKEY_STAFF_SWEEP` (`hitShape:'horizontal'`), not a leap | No leap/displacement mechanic — **current kit is a placeholder**, full per-hero move design (incl. whether S3 gets a real leap later) is a separate future detailed-design pass, not committed here |
| **Ultimate** | แยก 4 ร่าง → พุ่งโจมตี                        | Clone split → rush                                                                            | **Skill-specific nearest-target lock**; presentation uses clone animation; **code = long-range attack skill locked to nearest enemy, 4 strike phases**; not global soft-target                      |

**Ultimate exception:** only this skill (and future skills explicitly flagged `targetLock: 'nearest'`) may auto-pick a target. Basic attack and S2/S3 still use manual facing/positioning unless their kit row says otherwise.

**Ultimate strike-phase resolution (LOCKED, gold-standard-grounded — genre convention, e.g. Genshin/Star Rail ultimates):** all 4 strike phases hit the **same** locked target (the initial nearest-enemy lock persists through the whole sequence, not re-acquired per phase) — matches the "clone rush" flavor (4 clones converging on one target, not 4 separate picks). **Revised 2026-08-09 (item #5):** hyper-armor covers telegraph/startup/active — the strike itself can't be stopped mid-animation, which is the part that reads as broken if interruptible — but **recovery is cancelable by hitstun**, matching shipped behavior (`attacks.ts`'s `phaseOverrides`, pinned by `SkillSystem.test.ts`). Future `targetLock: 'nearest'` skills should default to this pattern (armor through the strike, not recovery) unless their kit row states otherwise.

**Next design gate (PARTIALLY CLOSED, 2026-08-09):** CoalBoard opinion-lane (ask CB) fixed 2 internal-consistency bugs — Lv11+ EXP formula (was non-monotonic at the Lv10→11 seam) and Ultimate's 4-strike damage scale (was a 9.6x-ATK outlier vs the rest of the kit, now 4.4x) — see `progressionConfig.ts`/`attacks.ts`. **Still OPEN:** absolute finisher/S2/S3 damage magnitude and additional hero kits beyond Monkey King — the board explicitly declined to invent these, since no enemy HP curve exists beyond one test dungeon; real playtest content is the blocker, not more research.

---

## 3.8 Archetype targeting & non-melee resolution (LOCKED — gold-standard-grounded)

> Fills gaps found in a repeat ask-CB design-gap scan (round 3, 2026-08-07) that survived §3.6/§3.7's locks. Grounded in named exemplars per gold-standard method — cite the exemplar, don't invent an unsourced convention.

### 3.8.1 Support archetype — no ally to target in solo-hero mode

§5.1 locks "pick one hero before stage, no mid-stage switch" — the player only ever has **one** hero on the field in PvE. §3.6.7's `effects[]` schema (item resolved in fork issue #47) already lists `singleAlly`/`allAllies` as valid targets, anticipating party/summon scenarios.

**Resolution (exemplar: Guardian Tales — single active hero, support kits buff the active hero rather than a party):**

- `singleAlly`/`allAllies` effects **fall back to targeting self** when no other ally unit exists on the field.
- A Summoner's active summons **do** count as allies — a Support kit paired with a Summoner's summons can genuinely multi-target.
- A pure solo Support hero (no summons out) therefore plays as a **self-buff/self-heal** kit — consistent with ★1-must-be-fully-playable (§4.3) without requiring a party system that doesn't exist yet.

### 3.8.2 Ranged archetype — reuses the existing per-move schema, no new fields

**Resolution (exemplar: Genshin Impact — bow/catalyst basic attacks are the same startup→active→recovery state machine as melee, just with `lungeDistance≈0` and a projectile hitbox):**

- Ranged basic attack uses the **same** §3.6.7 schema as Monkey King's melee basic — set `lungeDistance` near 0, `range` longer, and `hitShape` to a projectile/line shape instead of the close-range multi-target box.
- No new per-move property is needed; this is a data/tuning difference per hero kit, not an architecture gap.

### 3.8.3 Summoner archetype — summons reuse the enemy AI core

Already directionally locked in fork issue #47 ("summon effect → reuse spawn/entity pool — ไม่สร้าง AI core ใหม่"), stated explicitly here for the record:

- A summoned unit runs the **same** `Idle → Chase → Telegraph → AttackActive → Recovery` state machine as enemy AI (§3.6.8), flagged as player-ally and targeting the nearest enemy instead of the player.
- Summons do not get a bespoke AI system.

### 3.8.4 Mini-boss — Elite-tier stats, no phase transition

§3.6.9's phase-transition system is scoped to "Boss"; §3.6.8's knockdown/tier table only names "elite/boss." §5.2 introduces "Mini-boss" as a stage-variation example with no tier mapping stated.

**Resolution:** Mini-boss = **Elite tier** (stats, knockdown-eligibility per §3.6.8/§3.6.12) **without** the Boss phase-transition system (§3.6.9) — a stronger single-phase Elite encounter used as a stage centerpiece, not a scaled-down Boss.

### 3.8.5 PvP power normalization — level/skill-level, not just star

§4.3/§6.2 bound **star** power gap (★6 ≤ 130% ★1, fork issue #35) but never addressed hero Level or Skill Level in ranked PvP — a max-level, max-skill-level hero would still dominate a fresh one at the same star, defeating the point of the star-gap bound.

**Resolution (exemplar: the standard ranked-arena pattern in gacha PvP — e.g. Summoners War's arena, which normalizes level so rarity/investment differences are the only intended axis):** ranked PvP (§6) **normalizes Hero Level and Skill Level to the ranked baseline** (effectively max) for the duration of a match — only **star tier** creates the (already-bounded) power gap in ranked. PvE is unaffected; a player's real level/skill progression still matters there.

### 3.8.6 Control archetype — CC is a status effect, not a knockdown

§3.6.5/§3.6.12 restrict **knockdown** to elite/boss-tier targets only — but a Control hero's whole point is disabling _normal_ mobs too, and fork issue #47 already anticipated a `cc` kind in `effects[]` alongside `heal`/`buff`/`summon`.

**Resolution:** CC (stun/root/silence) is applied via `effects[]`'s `cc` kind, carrying its own `ccType`/`ccDurationMs` — it is a **status-effect application**, not a knockdown, and is therefore **not** subject to the elite/boss-only knockdown restriction. A Control kit can stun a normal mob; it just doesn't trigger the knockdown/hit-reaction state machine (§3.6.8) when it does. Heavy and Assassin need no dedicated resolution: Heavy is already a named knockdown trigger (§3.6.5), and Assassin-style mobility is already covered by the generic lunge/leap schema (§3.6.7) — there's no facing-based "backstab" concept possible in an L/R-only attack model, so nothing further to define.

### 3.8.7 PvP hit-reaction tier — deferred to P12

§3.6.5/§3.6.9's knockdown tiers (normal/elite/boss) are written for PvE; §6.3 doesn't state which tier an opposing player-hero maps to (knockdown-immune like a normal mob, or knockdown-eligible like an elite?). Not blocking before P12 (PvP prototype) — resolve alongside the PvP netcode model when that work actually starts.

---

# §4 — Hero collection & progression

## 4.1 Collection (LOCKED — central pillar)

- Gacha unlocks heroes; duplicates → **star ascension**
- Heroes must differ by **archetype / gameplay**, not reskins with same kit

**Target archetype examples:** Fighter, Ranged, Control, Summoner, Heavy, Assassin, Support, or unusual legend-inspired kits.

**Anti-pattern:** 50 heroes with identical gameplay.

## 4.2 Early progression (LOCKED — simplified, revised 2026-08-09 item #7)

Layers actually live in phase 1:

```
Hero Level → Star → Skill Level → Talent → Awakening
```

Talent and Awakening are un-deferred (see §2.1) — built end-to-end, UI stays hidden behind `showTalentAwakeningUi:false` until ready to reveal. **Still deferred:** Equipment, Loot affixes, Set bonus (genuinely not built).

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

**Stage-N+1 gating — LOCKED skeleton, numbers open (HetCreep, 2026-08-08):** yes, an energy/stamina system gates stage attempts — same genre-common shape as Genshin's Resin/Star Rail's Trailblaze Power (cited when this item was first flagged OPEN). Skeleton only: a per-account energy pool, consumed per stage attempt, regenerates over real time, refillable with gems (premium currency, §7) as one of several refill sources. **Explicitly deferred to P7/P11 tuning**: pool size, regen rate, per-stage cost, whether cost scales with stage difficulty. This is architecture, not a business-model number — building the pool/regen/refill mechanism doesn't commit to any specific friction level, that's set later by the numbers.

**Chapter/stage difficulty scaling — LOCKED architecture, numbers deferred to P7/P11:** enemy stats and stage difficulty scale via a **data-driven per-stage/per-chapter table** (consistent with the config-driven pattern already locked for gacha rates, star ascension, and skill-level scaling — never a hardcoded formula in code). Exact multipliers tune at P7/P11 implementation time.

## 5.2 Stage design (LOCKED)

**Not every stage is Wave → Wave → Elite.**

Required **variation** examples:

- Survival
- Defend
- Chase
- Hazard
- Mini-boss — **tier = Elite** (§3.8.4), no phase-transition system
- Time Attack
- Custom objectives

Goal: **positioning matters** — not repetitive arena waves. **Revised 2026-08-09 (item #8):** dropped "vertical movement" from this goal — the battle field is flat 2.5D (`Vec2{x,y}`, no height/z axis, confirmed no jump/elevation mechanic exists anywhere in the runtime); positioning variety instead comes from the 7 stage types above (chase/hazard/defend/etc.), not from a vertical axis.

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
- **PvP normalizes Hero Level and Skill Level to the ranked baseline** (§3.8.5) — only star tier creates a (bounded) power gap in ranked; PvE progression is unaffected
- **Queue-expansion thresholds — deferred to P13**, alongside the Elo/tier/K-factor numbers (fork issue #39): band-expansion step size and max wait target are tuning parameters, not architecture

## 6.3 Combat core

Same 2.5D movement + L/R attack + 3 skills + ultimate as PvE.

---

# §7 — Monetization (direction)

- **Core:** Hero Gacha + star ascension
- **Secondary (later, skeleton LOCKED, HetCreep 2026-08-08):** cosmetic/convenience only — skins, season pass, starter pack, currency packs. **Must never sell power directly** (a stat boost, a guaranteed top-rarity hero outside the gacha roll, a stage-skip that bypasses real play) — only appearance, currency, or QoL. Exact SKUs/pricing still TBD, deferred to P14 — this line locks the _category boundary_, not the catalog.
- **Must not:** sell best power primarily via direct purchase
- Premium one-time purchase model: **SUPERSEDED** (v1.0)

## 7.1 Gacha pity — LOCKED skeleton, numbers deferred to P9 (HetCreep, 2026-08-08)

Soft/hard pity, same shape as Genshin Impact's wish system (the exemplar this project's own gold-standard audit already cited for this exact gap) — a guaranteed top-rarity hero within a bounded pull count, pity counter persists per banner, resets on a top-rarity hit. **Deferred to P9, business-model call**: exact pity threshold, soft-pity ramp curve, per-pull cost, whether the pity counter is player-visible. This line locks _that a fairness floor exists_, not what the floor's number is — implementing the counter/reset mechanism doesn't commit to a specific rate.

---

# §7.5 — Social & Communication (direction, HetCreep 2026-08-08)

Retroactive lock for a system already shipped this session with no prior blueprint coverage (`src/components/WorldChat/`, `src/components/AddFriendModal/`, `supabase/migrations/0001_init.sql`'s `friends` table) — found via an ask-CB opinion-lane gap sweep, `AGENT_BLUEPRINT.md` system #28.

- **Data ownership**: server-authoritative (Supabase, RLS-protected) — `world_chat_messages` is the
  shared source of truth; authenticated players read through RLS, post through a rate-limited RPC,
  and receive inserts through Realtime. The server derives author identity/name/timestamp. Client
  storage is not chat-history authority.
- **Moderation skeleton — LOCKED, revised 2026-08-09 (blueprint-vs-code audit item #10)**: player-side block/mute is the current mechanism — `/block <name>`, `/unblock <name>`, `/blocklist` remain a client-local viewing preference even though messages are server-backed. The hidden `admin_accounts` grant commands are dev tools, not content moderation. Report/Hide/Delete/Mute administration remains an undecided additive scope; this migration does not silently choose it.
- **Scope**: World Chat is global and cross-device for authenticated players; Friends remain UID-based. Private/guild chat remain the existing "coming soon" placeholders.

---

# §8 — Backend

- **Not** MMO / open world / zone server
- Target: Client → Game API → modules → database
- Valuable data (account, heroes, stars, currency, gacha, rank, MMR) → **server authority**
- Supabase work in repo is **early seam** toward this — not full game authority yet
- **Error/Observability** (HetCreep 2026-08-08, cross-referenced per `AGENT_BLUEPRINT.md` system #27): governed by `.agents/rules/ecc/web/observability.md`, not re-specified here — that doc is the source of truth for the error-boundary/relay/code-registry design, already SETTLED. This line exists so a reader of this product blueprint doesn't miss that the system is real and governed elsewhere, not absent.

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

| Layer             | Document                        |
| ----------------- | ------------------------------- |
| Product direction | `docs/MASTER_BLUEPRINT_v3.0.md` |
| Project memory    | `MEMORY.md`                     |
| Implementation    | Source code                     |
| Verification      | Tests                           |

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
