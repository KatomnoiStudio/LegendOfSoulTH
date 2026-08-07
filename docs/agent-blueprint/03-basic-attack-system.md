# 3. Basic Attack System

> Category: Combat core · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns the player's 3-hit basic-attack chain: sequencing/state machine (`ComboSystem.ts`), per-hit timing/hitbox/damage data (`PLAYER_ATTACK_CHAIN` in `attacks.ts`), combo-window/reset/input-buffer/hit-stop rules (`COMBO_CONFIG`), and driving the per-hit horizontal multi-target hitbox query (`HitboxSystem.findHitTargets`, `hitsHorizontal`). Does **not** own: damage math (`DamageSystem.calcDamage`/`applyDamage`), knockback/hit-stun resolution beyond calling `applyDamage` (Hit Reaction System, #6), skill casting (`SkillSystem.ts`, #4), enemy AI (#9), or per-hero finisher tuning as a registry — today there is exactly one hero (Monkey King) and `PLAYER_ATTACK_CHAIN` is a single hardcoded array, not yet the "per-kit finisher" mechanism §3.6.11 describes.

### Inputs/Outputs

- In: `pressAttack(player: RealtimeBattleEntity, combo: ComboState)` on button press; `stepCombo(player, combo, deltaMs: number)` every frame.
- `ComboState` (mutable, `ComboSystem.ts:25-38`): `attack: AttackDefinition | null`, `chainIndex`, `sinceStartMs`, `sinceLastFinishMs`, `bufferedInputAgeMs`, `hitTargets: Set<string>`, `hitStopRemainingMs`.
- Out: `ComboTick { hitboxActive: boolean, attack: AttackDefinition | null }` (`ComboSystem.ts:105-108`) — consumed by `RealtimeBattleRuntime.ts:166-194`, which on `hitboxActive` calls `findHitTargets` then `applyDamage` per target.
- Data contract per hit: `AttackDefinition` (`attacks.ts:15-42`) — `startupMs/activeMs/recoveryMs`, `comboWindowStartMs/EndMs`, `damageMultiplier`, `range`, `hitShape: 'horizontal'|'radial'`, `arcDegrees`, `depthTolerance`, `knockback`. Note: no `lungeDistance` field exists on this type despite being named in the locked schema (§3.6.7) — see Done-criteria #8. (`knockdown` is also named in §3.6.7/§3.6.12 but is out of scope here — see Dependencies, Hit Reaction System #6.)

### Dependencies

- **Combat Facing System** (#2) — combo start snaps `player.facing = player.combatFacing` (`ComboSystem.ts:102`); horizontal hit test reads `attacker.combatFacing` (`HitboxSystem.ts:48`).
- **Per-Move Property Schema** (#5) — `AttackDefinition` is the shared type this system's chain entries are instances of; the schema itself (including any `lungeDistance`/`knockdown` field additions) is that system's contract to extend, not this one's.
- **Hit Reaction System** (#6) — every landed hit feeds `DamageSystem.applyDamage`, which sets hit-stun/knockback/invulnerability (`DamageSystem.ts:81-93`). Per the blueprint's system list (`AGENT_BLUEPRINT.md`), knockdown (elite/boss-only, per-move flag) is that system's charter, not this one's — the §3.6.12 finisher-knockdown gap belongs on Hit Reaction System's own done-criteria, not here.
- **Skill/Cast System** (#4) — `cancelCombo()` is invoked when a skill starts (`RealtimeBattleRuntime.ts:231`); no reverse path exists (matches §3.6.11 "no cancel between combo and skills").
- **Enemy AI System** (#9) — targets hit are enemy `RealtimeBattleEntity` instances driven by that system.
- Feeds: `RealtimeBattleRuntime.getPlayerComboState()` (HUD/combo-counter UI, `RealtimeBattleRuntime.ts:513`).

### Done-criteria

1. `pressAttack` within a hit's `comboWindowStartMs..EndMs` advances chain 1→2→3→wraps to 1; existing `ComboSystem.test.ts` stays green.
2. No press for > `COMBO_CONFIG.comboResetMs` (700ms) after a hit finishes → next press restarts at hit 1.
3. Damage applies only during `isActiveWindow`, once per target per hit (`combo.hitTargets` dedupe).
4. Press buffered up to `COMBO_CONFIG.inputBufferMs` (160ms) before the current hit ends still chains; older buffer is dropped, never causes a skip-ahead of recovery.
5. `player.hitStunRemainingMs > 0` during an active combo hit cancels it outright (chainIndex → 0, no partial credit) — `ComboSystem.ts:147-155`.
6. All enemies inside the horizontal hitbox (`range` + `depthTolerance`, facing-gated) take damage in one active window, not just the nearest — multi-target, not single-target selection (§3.6.2).
7. `npm test -- ComboSystem HitboxSystem DamageSystem RealtimeBattleRuntime` green.
8. **Lunge gap to close or explicitly defer, not silently skip** (`.agents/rules/master-blueprint-law.md`): §3.6.2/§3.6.11 lock an attack **lunge** (`lungeDistance` 32/36/44 per hit) — this does not exist in code today (`AttackDefinition` has no `lungeDistance` field; grep for "lunge" across `src/` returns zero files). This is in-scope for this system per the blueprint's one-line charter ("multi-target hitbox, lunge (not magnet), 3-hit combo"). Either implement it before calling this system done, or get HetCreep sign-off to mark it DEFERRED. (The separate finisher-**knockdown** gap named in §3.6.12 is out of scope for this contract — see Dependencies, Hit Reaction System #6, whose own done-criteria should track it instead.)

### World-class bar

Exemplar: **Hades** (Supergiant Games, 2020) — its Stygius sword basic combo is the widely-cited reference for "a basic attack that feels good": each swing carries the character slightly forward (lunge), input is buffered generously while the combo _window itself_ stays tight, and hits carry hit-stop. This project's `COMBO_CONFIG` already separates `inputBufferMs` from the per-hit `comboWindow`, matching that structure — the piece still missing is the per-hit forward lunge itself (see Done-criteria #8), which is the one concrete pattern worth finishing to match Hades' feel.

### Stay-current note

`PLAYER_ATTACK_CHAIN` is one flat array assuming a single hero; once a second hero kit lands (#12, Hero Kit/Archetype System) this will need to become per-hero-keyed data rather than a single hardcoded export — revisit at that point, not before.

### Low-maintenance-cost design

Keep the existing single-source-of-truth convention stated in the `attacks.ts` file header (§13: "ค่าจังหวะทุกตัวอยู่ในไฟล์นี้ไฟล์เดียว ห้ามกระจาย" — all timing/tuning values live in this one file, never scattered into components or systems) — `ComboSystem.ts` itself contains zero hardcoded balance numbers, only reading `PLAYER_ATTACK_CHAIN`/`COMBO_CONFIG`. When a second hero kit is added, extend by adding a new `AttackDefinition[]` constant, not by branching logic inside `ComboSystem.ts` or introducing a premature "attack-chain registry" interface for a single implementation — YAGNI until a 2nd kit genuinely exists.

### Known scars (real historical precedent)

- **Scar**: A dash's invulnerability window kept applying after the player canceled the dash into an attack, so a state flag from the prior action bled into the new one instead of being cleared on cancel. — Source: Supergiant Games official blog, "Hades: The Blood Price Update Patch Notes Pt. 1" (supergiantgames.com/blog/hades-the-blood-price-update-patch-notes-pt-1/), Patch 047 (July 2, 2020), verbatim: "Adamant Rail (Lucifer Aspect): fixed Dash invulnerability persisting after canceling with an attack; range normalized with other Aspects; fixed cases where it triggered some Boon effects very frequently."
- **Test-for-us**: Cancel out of one action into another right at the transition boundary (e.g. a hit lands and `cancelCombo()` fires because a skill starts, or `hitStunRemainingMs` interrupts a swing mid-active-window) and check whether every piece of that hit's state — `hitStopRemainingMs`, `hitTargets`, `chainIndex` — actually resets to a clean value, versus a stale leftover surviving into the next `pressAttack`/`stepCombo` cycle.

- **Scar**: Input buffering around chaining a dash-attack immediately after a special move needed a dedicated tuning pass during Hades' Early Access period, i.e. the buffer's behavior at an action-type transition boundary wasn't right on the first attempt. (Note: this was an Early Access iteration, not a post-1.0-launch fix — Hades left Early Access on September 17, 2020, over ten months after this patch.) — Source: Supergiant Games official blog, "Hades: The Superstar Update Patch Notes" (supergiantgames.com/blog/hades-superstar-update-patch-notes/), Early Access Patch 030 (October 15, 2019), verbatim: "Shield of Chaos: improved Bull Rush input buffering after the Throw special."
- **Test-for-us**: Press attack at the extreme edges of `COMBO_CONFIG.inputBufferMs` (160ms) right around a state-machine boundary — right as `comboResetMs` (700ms) is about to expire, or right at `comboWindowEndMs` — and confirm the buffered press is honored/dropped consistently with the documented rule, not just in the middle-of-window case that's easy to hand-test.

- **Scar**: The Stygian Blade's Arthur Aspect needed a hit-box correction because the active hitbox on the second swing of the Attack sequence didn't match what the animation visually showed. This is one confirmed instance, not a pattern of repeated hitbox rework across the weapon's patch history. — Source: Supergiant Games official blog, "Hades: The Blood Price Update Patch Notes" (supergiantgames.com/blog/hades-the-blood-price-update-patch-notes/), Early Access Patch 044 (June 23, 2020), verbatim: "Stygian Blade (Arthur Aspect): improved hit box on second swing in the Attack sequence."
- **Test-for-us**: For each of the 3 hits in `PLAYER_ATTACK_CHAIN` independently (not just hit 1), place a target right at the edge of that hit's `range`/`depthTolerance`/`arcDegrees` and confirm `findHitTargets`/`hitsHorizontal` connects or whiffs in a way that matches that specific hit's own values — a hitbox tuned by eyeballing hit 1 can silently be wrong on hits 2 and 3.

- **Scar (⚠️ unverified — inferred-plausible, not a sourced historical incident)**: Flurry Jab ("Hold Attack to strike rapidly, but you cannot Spin Attack") and Serrated Point ("Your Dash-Strike hits 3 times, but your dash has -25% range") are both real Daedalus Hammer upgrades for the Eternal Spear (Varatha) in Hades, and stacking them is a plausible source of a bug where a dash-attack forces an extra, unrequested jab into the combo regardless of player timing — which would both add unwanted recovery and miscount hits for hit-count-dependent effects. I could not locate a specific Steam Community thread, patch note, or other primary source documenting this as an actual reported/fixed incident; treat the mechanic-level plausibility as real but the "this specific bug happened and was reported" claim as unconfirmed. If a specific thread turns up later, replace this entry with its ID/URL/date/quote; otherwise this scar should be read as "worth testing because the interaction is plausible," not "documented precedent."
- **Test-for-us**: Trigger a dash-cancel-into-attack right as the combo chain is about to advance and verify `chainIndex` always advances by exactly the amount the player's own input should cause — never an extra silently-inserted hit or a skipped one — since anything later keyed off "which hit number just landed" (finisher logic, per-hit buffs) would miscount without any visible error.

This project's own spec (`docs/MASTER_BLUEPRINT_v3.0.md`, `docs/agent-blueprint/03-basic-attack-system.md`) — not how Hades happened to fix any of the above — is what "correct" means here; these entries only say what shape of failure to go try to reproduce.
