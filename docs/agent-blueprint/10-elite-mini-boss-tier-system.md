# 10. Elite / Mini-boss Tier System

> Category: Enemy / Boss · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns two things, locked at §3.8.4/§5.2: (1) the **Elite tier** — stat-multiplier profile + knockdown-eligibility for a non-mob enemy (§3.6.8 line 234, §3.6.12 line 302) — and (2) **Mini-boss**, defined as an Elite-tier encounter used as a stage centerpiece (§5.2 line 433) that explicitly does **not** run the Boss phase-transition system (§3.6.9). Does not own: the Boss phase-transition state machine itself (§3.6.9 — separate, also unbuilt); the enemy AI state machine core (`EnemyAISystem.ts`, reused as-is); per-move telegraph/attack data (`attacks.ts`); CC-as-status-effect (§3.8.6, separate); summon AI (§3.8.3, separate); PvP hit-reaction tier mapping (§3.8.7, deferred to P12).

### Inputs/Outputs

**Not implemented in code today** — no `tier`/`elite`/`boss` discriminant exists anywhere except the bare `EntityType = 'player' | 'enemy' | 'boss'` union (`src/game/realtimeBattle/types.ts:31`), and `RealtimeEnemyTemplate` (`src/game/realtimeBattle/stageConfig.ts:29-54`) has no tier field — only flat `maxHp/atk/def/speed/...`. Proposed contract, grounded in existing shapes:

- **In:** add `tier: 'normal' | 'elite'` to `RealtimeEnemyTemplate`, plus an elite stat-multiplier row (data-driven table, same file) — not a new type.
- **In:** `BattleWaveDefinition.enemies[]` (`stageConfig.ts:56-58`) marks one spawn's `templateId` as the mini-boss for that wave — no schema change needed, just data.
- **Out:** `EnemyBrain`/`RealtimeBattleEntity` carry the resolved tier so `EnemyAISystem.stepEnemyAI` (`EnemyAISystem.ts:76+`) and the damage/hitbox knockdown gate can branch on it — reusing the existing `EnemyAIState = 'idle'|'chase'|'attack'|'recover'|'hit'|'dead'` (`EnemyAISystem.ts:17`), extended with Knockdown/GetUp per §3.6.8, no new states beyond that.

### Dependencies

- **enemy** (`EnemyAISystem.ts`, `stageConfig.ts`, `attacks.ts`) — supplies the AI state machine and template table this system extends, not forks.
- **combat** (`DamageSystem.ts`, `HitboxSystem.ts`, `ComboSystem.ts`) — owns the knockdown/hit-reaction gate this tier flag feeds into.
- **adventure** (stage/wave design, §5.2) — consumes this as a stage-variation type ("Mini-boss" wave).
- Explicitly **not** dependent on the Boss phase-transition system (§3.6.9) — that's the point of §3.8.4.
- Future, not yet: **pvp** — §3.8.7 notes PvP hit-reaction tier mapping is deferred to P12; will need this system's tier concept then.

### Done-criteria

1. `RealtimeEnemyTemplate` gains a `tier` field consumed by **one knockdown-gating code path, built once and shared by `'elite'` and `'boss'`, not duplicated per tier** — this is new code (grep of `src/game/realtimeBattle` confirms zero existing `knockdown`/`getUp` logic today, and `entityType: 'boss'` is never instantiated anywhere in that directory, only declared in the `EntityType` union at `types.ts:31` — there is no pre-existing "boss path" to extend, so the gate must be built from scratch and shaped to serve both tiers from day one).
2. A wave can flag one spawn Elite/mini-boss; it plays out using only the existing `idle|chase|attack|recover|hit|dead(+Knockdown/GetUp)` states — no `PhaseTransition`/invulnerable state ever fires for it.
3. Regression test: an Elite entity hit by a knockdown-flagged move enters Knockdown + 200ms i-frame (§3.6.12 line 304) identically to a `'boss'` entity; a `'normal'` entity under the identical hit does not knock down (pins the tier gate per AGENTS.md rule 12).
4. Test asserts a mini-boss entity goes from full HP to death with no HP-threshold branch ever setting an invulnerable/phase flag (there is currently no such flag to check against — see Stay-current note).
5. Elite stat multiplier is read from the data table, never a hardcoded branch inside `EnemyAISystem`/`DamageSystem`.

### World-class bar

Exemplar: **Genshin Impact's overworld Elite enemy tier** — officially tagged "Elite" enemies sit one rung above common mobs and below true multi-phase Weekly/Trounce Bosses. The specimens that actually fit the pattern worth borrowing are the **stat-boosted variants of common enemies** — e.g. Mitachurl/Samachurl-line Elites — which run the _same_ base AI/move-data table as their common Hilichurl-line counterparts with a stat/moveset multiplier layered on, not a bespoke kit. (Hypostases and Ruin Guards are also tagged "Elite" in-game but are the wrong example for this specific point — they run bespoke, unique mechanics found on no common mob, closer in spirit to a mini-boss with its own kit than to a shared-AI stat-multiplier enemy — so they're excluded here even though the category name is real.) This reuse discipline — shared AI core, multiplier on top, no bespoke fork — is exactly what this blueprint already locks for Summoner AI (§3.8.3, fork issue #47: "ไม่สร้าง AI core ใหม่"), and matches the doc's own citation convention (§3.8.1 Guardian Tales, §3.8.2/§3.7 Genshin/Star Rail, §3.8.5 Summoners War) and its requirement to cite the exemplar accurately (line 328).

### Stay-current note

The Boss phase-transition system (§3.6.9) doesn't exist in code yet either — today "mini-boss never phase-transitions" can only be tested as "no invulnerable flag exists," which is a weak negative assertion. Once §3.6.9 actually ships, the mini-boss test needs to positively assert the PhaseTransition state is skipped, not just absent.

### Low-maintenance-cost design

Add `tier` as **one field on the existing `RealtimeEnemyTemplate` table** (`stageConfig.ts:29`), not a new `EliteEnemy` class/interface or a parallel AI system — mirrors this codebase's own stated rationale in `EnemyAISystem.ts:9-11` for refusing to fork the movement system ("จะกลายเป็นระบบเดินชุดที่สองที่กฎไม่ตรงกัน") and the file's explicit single-source-of-truth comment (`stageConfig.ts:6-9`, "ห้าม hard-code ข้อมูลด่านไว้ใน Component"). One flag, consumed by one shared knockdown gate — no premature Elite/Boss class hierarchy for what is currently a stat-multiplier + boolean.

Documented incidents were found at the level of that shared CC/interrupt-resistance system and the Common/Elite tier classification itself (Nobushi/Kairagi "Weight" tuning, Common-vs-Elite label mismatch) rather than a Mitachurl-specific bug report, since no such report surfaced. These are illustrations of the same _shape_ of failure, not reports about the Mitachurl/Samachurl line itself — tightened here so that connection isn't oversold.

### Known scars (real historical precedent)

- **Scar**: Genshin Impact's Nobushi/Kairagi elite enemies had their "Weight" stat (the interruption/knockback-resistance value read from the enemy data table) tuned high enough that Venti's and Sucrose's grouping Elemental Bursts — a crowd-control effect meant to work on enemies broadly — simply did nothing to them; this required a dedicated version 2.1 balance patch lowering their Weight specifically to restore the intended interaction. — Source: Sportskeeda, "Genshin Impact 2.1 nerfs the Nobushi and Kairagi to make it Venti-friendly."
  - **Test-for-us**: Push an Elite's stat-multiplier row in the data table to an extreme value and confirm the shared knockdown-eligibility check (Done-criteria #3) still fires at whatever threshold the project's own spec defines — try to prove a pure data-table tuning value (no code branch, no explicit "immune" flag) can accidentally make an Elite or mini-boss un-knockdownable, since that's a defect the code review would never catch by reading `EnemyAISystem.ts`/`DamageSystem.ts` alone.

_(A second candidate scar — Genshin's "Shadowy Husk" enemies (v2.5) allegedly shipping immune to Anemo-suction CC — was dropped from this list. On review I could not confirm the underlying claim from memory, the WebSearch budget for this session was already exhausted (200/200) when I attempted to verify it live, and the cited headline phrasing read as an awkward inversion of what it claimed. Per source-grounding, a version-sensitive patch claim that can't be checked against a live source doesn't go in as "real historical precedent" — it's dropped rather than kept with softened wording. Two well-grounded scars carry the "shared CC/interrupt-resistance system" precedent fine without it.)_

### Related caveat (not a patched incident — no fix to borrow)

- **Observation**: Genshin Impact's own wiki-documented enemy taxonomy shows the "Common Enemy" vs "Elite Enemy" classification doesn't reliably track actual in-combat power — certain monsters tagged "Common" (e.g. Kairagi, high-level Eremites) fight on par with "Elite"-tagged enemies in attack strength and move complexity. — Source: Genshin Impact Wiki (Fandom), "Common Enemy" page.
  - Unlike the Nobushi/Kairagi scar above, nothing here ever broke and HoYoverse never patched it — this is a static wiki observation, not an incident, so it's listed separately rather than under "real historical precedent" alongside an actual hotfix.
  - **Test-for-us**: Spawn a `tier: 'normal'` template whose flat stats (via bad data-entry, not code) happen to out-scale a `tier: 'elite'` template's multiplied stats, and confirm the knockdown gate and any other tier-branching logic behaves consistently with whatever tier discriminant this project's own spec defines — not off HP/ATK magnitude — so a mistuned "normal" enemy can't accidentally start behaving like an Elite (or an Elite like a normal) purely because its numbers drifted. (This project's own `docs/agent-blueprint/10-elite-mini-boss-tier-system.md` is the source for what "the discriminant" actually is here — Genshin has no fix to borrow for this one, since nothing was ever patched.)

None of the above prescribes adopting Genshin's fix (lowering a Weight stat, etc.) as correct for this project — only the _shape_ of what broke (a data-table value silently defeating a shared gate) or what doesn't hold (a tier label that stops predicting actual behavior) is being borrowed as a test target. What "correct" means for the Elite/Mini-boss Tier System here is defined entirely by this project's own `docs/agent-blueprint/10-elite-mini-boss-tier-system.md` (Done-criteria, one shared knockdown gate, data-driven multiplier) and `docs/MASTER_BLUEPRINT_v3.0.md`.

⚠️ unverified: the Nobushi/Kairagi (Sportskeeda, v2.1) and Common Enemy wiki citations above were assessed from training-data recall as plausible/low-risk, not re-confirmed against a live source this session (WebSearch budget was exhausted at 200/200 before either could be re-checked). Low-risk per the source-grounding rule's own citation threshold, but flagged here so a future pass with search budget available can confirm before this doc is treated as fully sourced.
