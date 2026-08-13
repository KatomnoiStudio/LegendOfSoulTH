# BLUEPRINT-CHECK HOLD — system owner onboarding findings (2026-08-09)

> **⚠️ The HOLD below is over-broad as of 2026-08-13 — the answer landed, and this header did
> not notice.** Ten of the twelve conflicts in `DESIGN-LOCK-HANDOFF-20260809.md` are resolved:
> seven were answered 2026-08-10 and dispatched (`223a4b4`, `836cd36`, `3262783`, `707bc8f`,
> each leaving a `design-lock N.x` marker in the contract it corrected), and three more that
> carried a recommended answer were applied 2026-08-13. **Only items 4 (ally AI vs the enemy
> state machine) and 12 (who owns `applyBattleExp`) are genuinely still held**, because both
> are real design forks rather than corrections. Item 4 got worse while held: `stepAllyAI` now
> has two production callers. Read a finding below against the handoff before treating it as
> live.
>
> **The original ruling named a person who has since left, so read it as history rather than as a
> live condition.** As written (mid-install, 2026-08-09) it said: _every ship-vs-doc conflict below
> is HELD — neither the code nor the contract gets edited — until nustanakritwithai's design-lock
> answer lands._ That answer arrived for ten of the twelve items and will not arrive for the
> remaining two: `nustanakritwithai` left the project on 2026-08-13. **Items 4 and 12 are HetCreep's
> to decide now** — the hold on them is real, but waiting on that name is not, and a wait condition
> that can never be satisfied is worse than no condition at all, because it reads as pending rather
> than as abandoned. When either is answered, it becomes a dispatch: adjust SHIP or adjust DOCS per
> the answer. Findings were produced by each system's own newly-hired
> system owner verifying its contract against live code during onboarding (28/28 systems,
> every system owner names how many claims it checked — silence was not accepted as clean).

## 01-movement-system

_sid `650123ce-29cf-4400-b48b-355ed43c1d0e`_

Confirmed — no `MEMORY/01-*.md` yet, matches onboarding (lazy-born at first dispatch).

**(1) Seat summary**
Own: `src/game/realtimeBattle/MovementSystem.ts` — pure per-tick movement: normalize/deadzone, diagonal-speed correction, speed→displacement, circle collision push-out, arena clamp, facing update (delegates combat-facing to `combatFacing.ts`).
Never touch: input capture, enemy/ally decision-making, hit/damage resolution, hit-stun/death state transitions (read-only on those), rendering/camera.
Gated by: a spawned QC seat (opus·xhigh) per dispatch, no split (2-seat: system owner+QC). Seam edits (other systems calling `stepMovement`) are main's, but I gate seam touches to my own files.

**(2) BLUEPRINT CHECK** — 8 claims verified

| Contract claim                                                                               | Reality                                                                                                                             | Evidence                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Scope: `MovementSystem.ts:1-134`                                                             | File is 145 lines now                                                                                                               | Read full file — sub-stepping fix (known-scars section itself notes this landed commit `56a7d9a`) grew it past 134, header stale |
| Dependencies: blockers built at `RealtimeBattleRuntime.ts:127-130,370-373`                   | Those lines are unrelated code (tick loop / skill side-effects); real `stepMovement` call sites are `152-154`, `166-168`, `527-529` | Grep `stepMovement\|blockers:` in `RealtimeBattleRuntime.ts`                                                                     |
| Dependencies: only `EnemyAISystem.ts` named as upstream caller                               | `AllyAISystem.ts:37` also calls `stepMovement` directly, undocumented in contract                                                   | Grep confirmed                                                                                                                   |
| Scope citation `EnemyAISystem.ts:7-11` for "don't reimplement movement" comment              | Comment actually at lines 12-18 (Dependencies section's own citation matches reality)                                               | Read file lines 1-22                                                                                                             |
| Done-criteria test citations (`:45,169`, `:55,74`, `:96,101,106,156`, etc.)                  | Line numbers drifted by a handful of lines each but content matches (test names/assertions confirmed) — cosmetic, not substantive   | Read `MovementSystem.test.ts:40-210`                                                                                             |
| Known-scars: maxStepMs=50 sub-stepping fix landed, large-deltaMs + multi-blocker tests added | Confirmed in code (`MovementSystem.ts:108-135`) and test file (tests present, titled with scar names)                               | Direct read                                                                                                                      |
| `isControlLocked` delegation for dead/hitstun gating                                         | Confirmed — `combatReaction.ts:109-115`, checks `hitStunRemainingMs`, `state`                                                       | Read                                                                                                                             |
| No React/DOM coupling ("pure file" claim)                                                    | Confirmed, only imports from same-folder modules + types                                                                            | Read                                                                                                                             |

Net: mechanism/scope claims hold; only file-path line citations have rotted (normal churn), plus one real gap — AllyAISystem as a second direct caller isn't in Dependencies.

**(3) System state**
Healthy — the deltaMs-spike scar from the prior revision is closed and tested, TASKS.md marks it graduated 100%. Open nit: contract's line citations need a refresh pass (not urgent, doesn't affect correctness), and Dependencies section should add AllyAISystem.ts as a caller.

**(4) Questions**

1. Want me to fix the contract's stale line citations + missing AllyAISystem dependency now, or hold until first real dispatch touches this file?
2. AllyAISystem.ts calling `stepMovement` directly — is that seam work I should flag to main, or just a doc gap since it's calling my exported function correctly (no ownership violation, just undocumented)?

---

## 02-combat-facing-system

_sid `d4e6f171-08e5-4015-80aa-9d9c7d96a2f1`_

**(1) Seat summary**

ถือ system 02 — Combat Facing System: `combatFacing.ts` (51 lines) ผู้กำหนด/mutate axis `CombatFacing` (left/right, แยกจาก `Direction8` 8-ทิศสไปรต์). ไม่แตะ: hitbox math (`HitboxSystem.ts`), sprite frame select (`EntitySprite.tsx`), knockback apply (`combatReaction.ts`), combo state (`ComboSystem.ts`), raw input capture (`RealtimeBattleRuntime.ts`). Gate: spawned QC (opus·xhigh) ต่อ dispatch, ไม่ใช่ main. Seam (call site ในไฟล์ระบบอื่น) = งาน main แต่ผมเป็นคน gate seam edit ที่แตะไฟล์ผม. Memory ผม: `MEMORY/02-combat-facing-system.md` — ยังไม่มี, สร้างตอน dispatch แรก.

**(2) BLUEPRINT CHECK** — verified 19 claims (file:line citations + factual claims) จาก contract ตรงต่อ source จริง

| Claim (contract)                                                       | Says                            | Reality                                                             | Evidence                                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Scope: initial combatFacing set at                                     | `createRealtimeBattle.ts:47,96` | ไม่เกี่ยวกัน — L47=`PLAYER_BASE_SPEED`, L96=`statsAtStar(...)` call | actual `combatFacing:` literals อยู่ที่ L106,192,224 (ตรงกับที่ Dependencies section ของ**เอกสารเดียวกัน**อ้างถูก — ขัดกันเองในไฟล์)    |
| It-does-NOT-own: sprite frame select at                                | `EntitySprite.tsx:100`          | L100 = `group.current.visible = true`                               | `entity.facing` จริงอยู่ L120 (`resolveBattleFrames(animation, entity.facing)`); ไฟล์อยู่ `src/components/BattleScene/EntitySprite.tsx` |
| Dependencies: ComboSystem facing-lock at                               | `ComboSystem.ts:102`            | เนื้อหาคนละบรรทัด                                                   | `player.facing = player.combatFacing` จริงอยู่ L100                                                                                     |
| Scope: RealtimeBattleRuntime owns moveInput, calls module per tick, at | `:162`                          | L162 = `this.playerSkill.definition &&` (ไม่เกี่ยว)                 | call จริงอยู่ L198 (ตรงกับ Dependencies section เดียวกันที่อ้างถูก)                                                                     |
| Dependencies: MovementSystem tick call at                              | `:131`                          | L131 = `blocker.collisionRadius,` (arg เฉย ๆ)                       | `applyCombatFacingFromMovement(entity, direction)` จริงอยู่ L142                                                                        |
| Dependencies: HitboxSystem attack-hit-test at                          | `:48`                           | L48 = `dx = target.position.x - attacker.position.x`                | `attacker.combatFacing` ใช้จริงที่ L50 (off-by-2, minor)                                                                                |

Claims ที่ verify แล้ว**ตรง**: types.ts:23/19-20/73-75, combatFacingFromDirection = 0 production callers (จริง), DamageSystem ไม่ import combatFacing.ts อีกแล้ว→ผ่าน combatReaction.ts (จริง), combatReaction.ts:68-81/73-76/75 (applyKnockback) ตรงเป๊ะ, EnemyAISystem.ts:262 ตรงเป๊ะ, AllyAISystem.ts:39,45 ตรงเป๊ะ, createRealtimeBattle.ts:106,192,224 ตรงเป๊ะ, RealtimeBattleRuntime.ts:198 ตรงเป๊ะ.

**(3) System state**

โค้ดตัวมอดูลเองสั้นสะอาด, logic ตรง contract ทุกจุด (deadzone 0.12, vertical-keeps-fallback, knockback ใช้ horizontal ไม่ใช่ radial — ตรวจแล้วตรง). ช่องโหว่จริงที่ contract บอกเองถูกต้อง: `combatFacingFromDirection` export+test แล้วแต่ 0 production caller (dead code จริง, ไม่ใช่ blueprint ผิด). ปัญหาที่เจอคือ **เอกสาร contract เองมี line-citation ผิด/บาน 5 จุด** (ดูตาราง) — เนื้อหาตรรกะไม่ผิด แค่พิกัดไฟล์คลาดเคลื่อน (บาง line เอกสารขัดกันเองในคนละ section).

**(4) Questions**

1. Line-citation 5 จุดที่คลาดนี้ — ต้องการให้ผมแก้ contract file ให้ตรงตอน dispatch แรกเลย (เป็นงานเล็กในสโคปตัวเอง) หรือปล่อยไว้จนกว่าจะมี dispatch จริงมาแตะบริเวณนั้น?
2. `combatFacingFromDirection` dead-code (0 caller) — ต้องการให้ system owner ผมเสนอ wire เข้า `createRealtimeBattle.ts` หรือถอดทิ้งเมื่อมี dispatch แรกมาถึง หรือรอ owner สั่งเฉพาะ?

---

## 03-basic-attack-system

_sid `badab0dc-3975-4e39-a58a-42255221d975`_

Read-only study done. No edits made.

**(1) Seat summary**
System owner of system 03 (basic-attack). Own: combo state machine (`ComboSystem.ts`), per-hero chain data (`heroes/attackChains.ts`/`attacks.ts`), `COMBO_CONFIG`, horizontal hitbox query (`HitboxSystem.findHitTargets`/`hitsHorizontal`). Never touch: damage math (`DamageSystem.calcDamage`/`applyDamage`), knockback/hit-stun resolution beyond calling it (Hit Reaction #6), skill casting (#4), enemy AI (#9). Gated by: spawned QC (opus·xhigh) per dispatch, then main's Unit Gate. PRs failing QC in my scope get adopted by me. Memory file `MEMORY/03-basic-attack-system.md` created on first dispatch.

**(2) BLUEPRINT CHECK** — 11 file:line claims verified, 6 discrepancies found:

| Contract says                                                                     | Reality                                                                                                                                                                                                                                                                | Evidence                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Note in Inputs/Outputs: "no `lungeDistance` field exists on this type"            | False — field exists, populated, wired                                                                                                                                                                                                                                 | `attacks.ts:65` field; consumed `RealtimeBattleRuntime.ts:206-216`; contract's own Done-criteria #8 says CLOSED. Stale sentence never deleted after the fix landed. |
| Combo start "snaps `player.facing`... `ComboSystem.ts:102`"                       | Line is 100, not 102                                                                                                                                                                                                                                                   | `ComboSystem.ts:100`                                                                                                                                                |
| Horizontal hit test "reads `attacker.combatFacing` (`HitboxSystem.ts:48`)"        | Line is 50, not 48                                                                                                                                                                                                                                                     | `HitboxSystem.ts:50`                                                                                                                                                |
| `applyDamage` "sets hit-stun/knockback/invulnerability (`DamageSystem.ts:81-93`)" | Function is lines 71-79; body just delegates to `applyCombatReaction` (separate module), doesn't set those itself                                                                                                                                                      | `DamageSystem.ts:71-79`                                                                                                                                             |
| `AttackDefinition` data contract cited `attacks.ts:15-42`                         | Interface opens at 18, `knockback` field at 44, interface continues to 83 (many fields past the cited range unlisted)                                                                                                                                                  | `attacks.ts:18-83`                                                                                                                                                  |
| Done-criteria #5 "chainIndex → 0... `ComboSystem.ts:147-155`"                     | Reset actually happens via delegated `interruptPlayerCombo()` at `combatInterrupt.ts:44`. Cited range's own else-branch (152-158) is unreachable dead code — `stepCombo`'s earlier `if (!combo.attack) return` guard means `combo.attack` is always truthy by line 146 | `ComboSystem.ts:130,146-158`, `combatInterrupt.ts:42-52`                                                                                                            |

Everything else checked clean: `ComboState` (22-35), `ComboTick` (103-106), runtime consumer (238-248), lunge mechanism (Done-criteria #8) all match as claimed.

**(3) System state**
Code matches contract intent — combo/hitbox/lunge logic all present and wired as described, just several stale line-number citations (likely drift from later edits, not logic bugs) plus one found dead-code branch worth a future rot pass. No open TASKS.md row for system 03 right now — nothing queued.

**(4) Questions**

1. Line-citation drift — want me to just fix the citations (+ delete the stale lunge note) as a housekeeping dispatch, or leave contract text alone until an unrelated dispatch touches it?
2. The dead else-branch at `ComboSystem.ts:152-158` — worth a cleanup dispatch on its own, or fold into whenever I next touch that function for real work?

---

## 04-skill-cast-system

_sid `d0f250c7-3a0a-4e0f-b583-4e9188dd31b4`_

Good, confirms hero kit shape. That's sufficient verification depth for onboarding.

**(1) Seat summary**
System owner of system 04 skill-cast-system: skill1/skill2/skill3/ultimate cast lifecycle (Input→Cast/Wind-up→AttackActive→Recovery), cooldown/ultimate-gauge gating, i-frame windows, kit→hitbox mapping. Own `SkillSystem.ts`, `skills.ts`, `RealtimeSkillDefinition`/`SkillState` schema. Never touch: `HitboxSystem.ts` collision, `DamageSystem.ts` math, `ComboSystem.ts` chaining, `EnemyAISystem.ts`, hero roster/leveling. `attacks.ts` timing data is shared source-of-truth, not mine to fork. Gated by a spawned Unit Gate/QC (opus·xhigh) per the local workflow doc — I never gate my own work; a fail bounces back to me with full finding.

**(2) BLUEPRINT CHECK**

| Contract claim                                         | Reality                                                                                                                                                                                                                                         | Evidence                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Done-criterion 1 gates cited at `SkillSystem.ts:37-40` | Wrong range — lines 37-40 are `isCastingSkill`, not `canStartSkill`. Real gates live at `canStartSkill` lines 44-67 (dead/hitstun/knockdown routed through `isControlLocked` in `combatReaction.ts:109-115`, not literally in `SkillSystem.ts`) | Read `SkillSystem.ts` full file + `combatReaction.ts:107-115` |

All other citations checked clean: `skills.ts:14-24` (interface), `SkillSystem.ts:18-27` (SkillState), `SkillSystem.ts:100-104` (SkillTick), `attacks.ts:18-83`/`54-82` (AttackDefinition + §3.6.7 fields), `HERO_SKILL_KITS` at `kits/index.ts:10-16`, `REALTIME_CHARACTER_KITS` re-export at `skills.ts:34`, five kits present (`monkey-king, pig-warrior, celestial-archer, nezha-warden, sand-sage`), test coverage at `SkillSystem.test.ts:163-188` matches word-for-word, `castDelayMs`/`movementDuringCast`/`multiTarget` confirmed live in `RealtimeBattleRuntime.ts:163` and `HitboxSystem.ts:152`. **9 claims checked, 1 discrepancy.**

**(3) System state**
Clean, working system — 5 hero kits shipped, tests passing shape, done-criteria 1-3 solidly covered. Known open gap: `effects[]` (heal/buff/cc/summon) has schema but no resolver yet (§3.8.3 blocked on it); interrupt-phase edge cases (done-criterion 4/queued-input-during-recovery) flagged in blueprint's "known mechanic" as worth a pinning test, not yet confirmed present.

**(4) Questions**

1. Fix the `SkillSystem.ts:37-40` citation now (trivial doc edit, no code change) or leave it for a dedicated docs dispatch since I'm supposed to be read-only this run?
2. Should I write `MEMORY/04-skill-cast-system.md` at this session's end even though no work dispatch happened yet, or strictly wait for the first real dispatch per the lazy-birth rule?

---

## 05-per-move-property-schema

_sid `16383f76-aa9d-4f79-a25a-215765633314`_

Onboarding read done, no edits made.

**(1) Seat summary**
Own: `AttackDefinition` interface (`attacks.ts:18-83`) — single data contract for every attack/skill/enemy-move literal. Own the data literals too (`MONKEY_*`, `ENEMY_ATTACK_*`, boss phase tables). Never touch: hit-geometry resolve (HitboxSystem #3), damage apply (DamageSystem #6), combo chain (ComboSystem #3), cast/cooldown (SkillSystem #4), enemy AI timing consumption (EnemyAISystem #9), boss phase-eligibility (#11). Gate: spawned QC (opus/xhigh), mandatory `drift-canary` every dispatch (schema system, 4+ downstream readers). Headcount: 2 (system owner+QC), no split condition.

**(2) BLUEPRINT CHECK** — 18 claims verified

| Claim (file:line cited)                             | Contract says                                                               | Reality                                                               | Verdict                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `RealtimeSkillDefinition` location                  | `skills.ts:18-27`                                                           | Actual interface spans `skills.ts:14-24`                              | **Discrepancy** — off by 4 lines, doc drift                                |
| Done-criteria #2 wording                            | Calls the 8 §3.6.7 fields "un-shipped set" needing same-PR-as-consumer rule | Scope section (same doc) says all 8 already shipped w/ real consumers | **Internal contradiction** — stale done-criteria clause vs own Scope claim |
| `AttackDefinition` span                             | `attacks.ts:18-83`                                                          | Confirmed exact                                                       | clean                                                                      |
| REQUIRED_FIELDS (13) / OPTIONAL_FIELDS (14)         | matches interface                                                           | `attacks.test.ts:49-86` list matches interface exactly                | clean                                                                      |
| `telegraphMs` field                                 | `attacks.ts:68`                                                             | confirmed                                                             | clean                                                                      |
| `effects`/`multiTarget`                             | `attacks.ts:54,82`                                                          | confirmed                                                             | clean                                                                      |
| PLAYER_ATTACK_CHAIN re-export                       | `attacks.ts:89-93`                                                          | confirmed                                                             | clean                                                                      |
| `MONKEY_SPINNING_STAFF`/`_THRUST`                   | `attacks.ts:114-128`/`131-146`                                              | confirmed                                                             | clean                                                                      |
| Boss phase literals                                 | `attacks.ts:257-294`                                                        | confirmed                                                             | clean                                                                      |
| `ENEMY_ATTACK_TIMING` deprecated-reexport exception | `EnemyAISystem.ts:331-335`, reads not hardcodes                             | confirmed, reads `getEnemyAttackById()`                               | clean                                                                      |
| `attackShape`→`hitShape` reuse                      | `stageConfig.ts:84-91`                                                      | comment actually spans ~85-90                                         | minor, within tolerance                                                    |
| `hitShape` closed union 2 members                   | —                                                                           | confirmed `attacks.ts:39`                                             | clean                                                                      |
| `phaseOverrides` Golden Fury lock                   | —                                                                           | confirmed `attacks.ts:194-198`                                        | clean                                                                      |
| Docstring §13 mandate                               | `attacks.ts:4-5`                                                            | confirmed                                                             | clean                                                                      |

**(3) System state**
Schema itself: complete, all 14 optional fields shipped w/ real consumers per test file. One stray oddity: `attacks.test.ts:82` has `\ Runtime consumers:...` inside array literal (other comment lines use `//` correctly) — worth eyeballing next dispatch, may be a rendering artifact not real syntax. Open cross-system item not mine: #14 vs #18 contract conflict on `RewardSystem.ts:96-128`.

**(4) Questions**

1. Fix the skills.ts:18-27→14-24 citation + the done-criteria #2 stale wording now, or bundle into next real dispatch?
2. `attacks.test.ts:82` — want me to check if that's a literal syntax bug (`\` instead of `//`) on first dispatch, or file scope forbids touching test file structure without a ticket?

---

## 06-hit-reaction-system

_sid `50ffae6a-584e-4ace-bd95-8f73e155a88e`_

Read-only study done. No edits made.

**(1) Seat summary**

- Own: hit-reaction moment-of-impact — hitStunRemainingMs/invulnerableUntilMs/knockback/knockdown-getUp lifecycle in `combatReaction.ts` + `applyDamage` wiring in `DamageSystem.ts`.
- Never touch: `calcDamage` (damage math, same file, different owner), `HitboxSystem.ts` hit detection, `EntitySprite.tsx` visuals, attacker-side interrupt logic (owned but consumed, not authored here).
- Co-tenant file: `DamageSystem.ts` — own `applyDamage`, not `calcDamage`. Name owned functions, not just files, on dispatch.
- Gated by: a spawned QC seat, opus·xhigh. Fail bounces to me, never fixed by gate.

**(2) BLUEPRINT CHECK** — verified ~18 claims, 3 confirmed discrepancies:

| Contract says                                                                                           | file:line    | Reality                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence             |
| ------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Input gates check `hitStunRemainingMs > 0` directly at `ComboSystem.ts:76,148`, `SkillSystem.ts:38,100` | those coords | Both now call shared `isControlLocked()` (`combatReaction.ts:109-117`), which ALSO gates on `knockdown`/`getUp` state + `isCcLocked` — a status-effects dependency the contract's Dependencies section never names. Line numbers stale too (ComboSystem gate is line 73, SkillSystem line 50). `MovementSystem.ts:97` coincidentally still right (also now `isControlLocked`). `combatButtonState.ts:18,28` unchanged, still direct check. | grep confirmed       |
| "Sole consumer of `state === 'hit'`... is `EntitySprite.tsx:113`"                                       | :113         | Actual line 138. Not sole consumer: `RealtimeBattleRuntime.ts:620` and `src/game/pvp/PvPAuthorityEngine.ts:256` also read it (reset to idle post-stun) — meaning pvp system reads this system's state, contradicting "No dependency on... pvp... today" one direction over.                                                                                                                                                                | grep across repo     |
| `calcDamage`, "same file, lines 46-61"                                                                  | 46-61        | Actual `calcDamage` is lines 54-69 (46-52 is the `DamageContext` interface instead)                                                                                                                                                                                                                                                                                                                                                        | Read DamageSystem.ts |

Everything else checked clean: `canApplyKnockdown` (combatReaction.ts:15-19) exact, `applyCombatReaction` (37-66) exact, `attacks.ts` field lines 60/70/72/75 exact, `DamageSystem.ts:72-79` delegation exact, `EnemyAISystem.ts` zero `player.state`/`player.hitStunRemainingMs` matches confirmed, `EliteTierSystem.test.ts` 373 lines + Done-criterion 3 confirmed, `DamageSystem.test.ts` Done-criterion 5 confirmed, `combatInterrupt.test.ts` exists.

**(3) System state**
Core lifecycle (hit→stun→knockback, knockdown→getUp, interrupt) all implemented and tested, matches contract's "shipped" claims on the numbers. Live drift: a shared `isControlLocked` gate got added since the contract was written — folds in CC-lock (`statusEffects.ts`) that the contract's Scope/Dependencies never mention. Worth a doc-fix dispatch, not a code bug.

**(4) Questions**

1. `isControlLocked` now also gates on `isCcLocked(entity)` (status effects module) — is CC/status-effects a real dependency of my system now, or does that belong to a different system's contract that I'm just reading?
2. Contract doc-drift found (3 stale citations) — do I file/fix these myself as a docs dispatch, or flag to main since contract edits are "security-grade" per the local workflow doc §6?

---

## 07-effects-system-non-damage

_sid `851285e1-e85d-4b86-a0c1-e3f7a47be88f`_

**Seat summary** (07 effects-system-non-damage, system owner):
เก็บ `heal`/`buff`/`cc`/`summon` resolver + target resolution (`EffectsSystem.ts`, 247 บรรทัด) — data field บน `AttackDefinition.effects[]` (`attacks.ts:54`), เรียกผ่าน `battleEffects.ts`. ไม่แตะ damage calc, hit-reaction state machine, AI loop เอง, หรือ balance number — เส้นแบ่งคือ `applyCcEffect` ห้ามเรียก `applyDamage`/`applyCombatReaction` เด็ดขาด (verified: ไฟล์ไม่ import ทั้งคู่). Gate = QC seat (opus·xhigh) ต่อ dispatch, ยัง headcount 2 (system owner+QC), no split.

**BLUEPRINT CHECK** — 12 claims verified:

| #   | Contract says                                                                                                                              | file:line                                | Reality                                                                                                                                                                                                                                                   | Verdict                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | EffectsSystem.ts 247 + test 376                                                                                                            | the seat roster row 07                   | `wc -l` = 247 / 376 ตรงเป๊ะ                                                                                                                                                                                                                               | ✅ match                                                                                                          |
| 2   | `combatReaction.ts:63` hitStunRemainingMs write                                                                                            | contract Inputs/Outputs                  | line 63 ตรงคำต่อคำ                                                                                                                                                                                                                                        | ✅ match                                                                                                          |
| 3   | `DamageSystem.ts:72-79` applyDamage→ReactionOutcome                                                                                        | contract Inputs/Outputs                  | ตรง                                                                                                                                                                                                                                                       | ✅ match                                                                                                          |
| 4   | `types.ts:29-30` EntityState มี knockdown/getUp                                                                                            | Dependencies                             | ตรง                                                                                                                                                                                                                                                       | ✅ match                                                                                                          |
| 5   | `combatReaction.ts:9-19` canApplyKnockdown/resolveCombatTier                                                                               | Dependencies                             | ตรง                                                                                                                                                                                                                                                       | ✅ match                                                                                                          |
| 6   | cc ไม่เรียก applyDamage/gate เด็ดขาด                                                                                                       | Done-criterion #4                        | EffectsSystem.ts ไม่ import combatReaction/DamageSystem เลย — structurally จริง                                                                                                                                                                           | ✅ match                                                                                                          |
| 7   | **"cc/buff resolve entirely in SkillSystem.ts"**                                                                                           | Low-maintenance-cost design              | จริง ๆ เรียกจาก `RealtimeBattleRuntime.ts:373-395` + `PvPAuthorityEngine.ts:378-392` ผ่าน `battleEffects.ts` — SkillSystem.ts ถือแค่ flag `sideEffectsApplied`, ไม่เรียก resolver เลย                                                                     | ❌ **stale — wrong file named**                                                                                   |
| 8   | **summon "hand off to Enemy AI System verbatim... no bespoke AI"**, Done-crit #5 "same Idle→Chase→Telegraph→AttackActive→Recovery machine" | Dependencies + Done-criteria             | Production path: `RealtimeBattleRuntime.ts:402-408` ทุก tick เรียก `stepAllyAI` จาก **`AllyAISystem.ts`** — bespoke state machine แยก (idle/walk/attack เท่านั้น ไม่มี Telegraph/Recovery, ไม่เรียก `createEnemyBrain`/`stepEnemyAI` เลยตอน runtime จริง) | ❌ **contradicted — test-level reuse (`EffectsSystem.test.ts:263-293`) proven, production wiring forked instead** |
| 9   | PvP consumer ของระบบนี้                                                                                                                    | Dependencies section (ไม่มีชื่อ PvP เลย) | `PvPAuthorityEngine.ts` (699 บรรทัด, ของจริงไม่ใช่ stub) เป็น caller จริงตั้งแต่ตอนนี้ ผ่าน `battleEffects.ts`                                                                                                                                            | ⚠️ **omitted dependency/seam**                                                                                    |
| 10  | `battleEffects.ts` เป็นไฟล์กลาง                                                                                                            | ไม่มีชื่อไฟล์นี้ในสเปกเลย                | มีจริง เป็น seam entrypoint หลัก                                                                                                                                                                                                                          | ⚠️ **unnamed file in the seam**                                                                                   |
| 11  | Done-crit #1-3 (schema field/regression/fallback-to-self)                                                                                  | contract                                 | ตรวจ code+test ตรงตามที่อ้าง                                                                                                                                                                                                                              | ✅ match                                                                                                          |
| 12  | TASKS.md/MEMORY.md อ้าง "summons AI handoff versatility" verified, graduated 100%                                                          | TASKS.md:20, MEMORY.md:235               | claim อิงจาก unit-test harness (#8 ข้างบน) ไม่ใช่ production path จริง                                                                                                                                                                                    | ⚠️ **graduation claim overstates production coverage**                                                            |

**System state**: ระบบ compile ผ่าน, test ครบตาม done-criteria ที่ทดสอบได้จริง, graduated ใน TASKS.md แล้ว (PR #55). แต่ contract 2 จุด (#7, #8) ล้าหลังของจริง — จุด #8 สำคัญสุด: production ไม่ได้ reuse EnemyAISystem อย่างที่สเปกล็อกไว้ ("no bespoke AI") จริง ๆ มันมี `AllyAISystem.ts` แยกต่างหาก เป็น drift ที่ QC รอบต่อไปควรรู้ก่อนตัดสิน pass/fail บน done-criterion #5.

**Questions**:

1. #8 (AllyAISystem.ts bespoke แทน reuse EnemyAISystem) — แก้สเปกให้ตรงของจริง (ยอมรับ bespoke, ปรับ Done-crit #5) หรือถือเป็น scope creep ที่ต้อง refactor summon AI ให้ reuse จริงตามล็อกเดิม?
2. `battleEffects.ts` + `PvPAuthorityEngine.ts` caller — ใครเจ้าของ seam นี้ตอนแก้ (main ตาม §2b) หรือผมควรเพิ่มลง Dependencies ของตัวเองตอน dispatch แรก?

---

## 08-skill-targeting-system

_sid `1db27aaf-94de-46be-bcb0-aa85336faa0f`_

Studied. No edits made — read-only pass as instructed.

**(1) Seat summary**
I own: the target-lock decision for skills flagged `targetLock: 'nearest'` — nearest-enemy selection at cast start, held through the skill's active window. Concretely: the `targetLock` field on `AttackDefinition` (attacks.ts), `lockedTargetId`/`strikeHits`-adjacent bookkeeping in `SkillSystem.ts`, the `targetLock === 'nearest'` branch in `HitboxSystem.ts`, and `softTarget.ts`'s helpers (`distanceBetween`, `findNearestLivingEnemy`, `resolveLockedTarget`).
I never touch: strike-phase sequencing / `interruptible` / `phaseOverrides` (system #4's), basic-attack hit detection, movement/facing/camera, damage math, enemy-AI's own targeting.
Gated by: a spawned QC seat (opus·xhigh per the seat roster), never by myself.

**(2) BLUEPRINT CHECK** — 15 claims verified, 6 discrepancies found:

| #   | Contract says                                                                                                      | Reality                                                                                                                                                                                                                                                            | Evidence                       |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 1   | `attacks.ts:169-183`, `MONKEY_GOLDEN_FURY` itself commented "placeholder content, P3 framework"                    | That phrase is on `MONKEY_STAFF_THRUST`/`MONKEY_STAFF_SWEEP`'s comments (lines 130, 148) — Golden Fury's own comment (166-177) talks about CoalBoard damage rebalance, no such phrase                                                                              | attacks.ts:130,148 vs 166-177  |
| 2   | `attacks.ts:15` = `AttackDefinition` interface                                                                     | Interface opens at line 18; line 15 is an import statement                                                                                                                                                                                                         | attacks.ts:15,18               |
| 3   | `EnemyAISystem.ts:100` = the `distanceBetween` helper pattern to reuse                                             | `distanceBetween` is actually lines 93-95; line 100 sits inside an unrelated `resolveRanges` guard                                                                                                                                                                 | EnemyAISystem.ts:93-100        |
| 4   | `createRealtimeBattle.ts:21` for `state.enemies[]`                                                                 | Line 21 opens the `RealtimeBattleState` interface; the `enemies:` field itself is line 31                                                                                                                                                                          | createRealtimeBattle.ts:21,31  |
| 5   | `AGENT_BLUEPRINT.md:46` vs `:50` for system #4 vs #8 taxonomy entries                                              | Those lines are unrelated (Tier-3 Social note / list header); the actual #4 and #8 entries are lines 59 and 67                                                                                                                                                     | AGENT_BLUEPRINT.md:46,50,59,67 |
| 6   | `softTarget.ts` "consumed by ... SkillSystem.ts, HitboxSystem.ts, RealtimeBattleRuntime.ts, PvPAuthorityEngine.ts" | Only `RealtimeBattleRuntime.ts` directly imports it. The other three consume the `lockedTargetId`/`targetLock` concept, not the module. Missed real consumer: `AllyAISystem.ts` imports `findNearestLivingEnemy` directly and isn't named anywhere in the contract | grep `softTarget` across src/  |

Bonus (registry, not contract): the seat roster says "NO own file — boundary is field-level inside `SkillSystem.ts`," but `softTarget.ts` (46 lines) + `softTarget.test.ts` already exist as a dedicated file that looks exactly like this system's own home — worth flagging to the owner, not something I should silently "fix" by editing the registry myself.

Everything else checked clean: `attacks.ts:49/75-78/2-5`, `SkillSystem.ts` dedup lines 21/33/78/117/137, `HitboxSystem.ts` dedup lines 36/98/104/135/145/150, `RealtimeBattleRuntime.ts:330,341-344`, TASKS.md row 15/DF15/PR#56, and the Scope's "does NOT own" strike-sequencing claim (confirmed all in system #4's files).

**(3) System state**
Graduated 100%, PR #56, TASKS.md row 15/DF15. Code matches the shipped description — one skill (`MONKEY_GOLDEN_FURY`) uses `targetLock: 'nearest'`, resolved once at cast start, dead/stale-target case returns `[]` (no crash), dedup routed through `strikeHits` separately from `hitTargets`. No open bugs visible in my scope.

**(4) Questions**

1. `softTarget.ts` looks like my own file in practice (contradicts the registry's "no own file" note) — should I treat it as mine going forward, and is that worth a registry correction?
2. `AllyAISystem.ts` also calls `findNearestLivingEnemy` from my module for ally target selection — is that in-scope for me to touch, or does it belong to whichever system owns ally AI?

---

## 09-enemy-ai-system

_sid `120b45f5-e14a-4eea-aab9-3f750c18aa4c`_

**Seat: System owner of `09-enemy-ai-system`.** Own `EnemyAISystem.ts` decision-making only (state transitions + move direction). Never touch: movement execution (MovementSystem), damage application (DamageSystem), hit detection (HitboxSystem), telegraph VFX rendering (none exists), or `stageConfig.ts`/`attacks.ts` data beyond reading them. `QC seat` gates every dispatch (opus·xhigh). Seam edits into my file from other systems get gated by me. Memory file `MEMORY/09-enemy-ai-system.md` — create on first dispatch.

**BLUEPRINT CHECK** — verified 9 file:line claims + all named "shipped" substance claims. 5 stale pointers found (line drift from later edits), 0 false substance claims.

| Contract says                                                            | Reality                                                                                                                  | Evidence                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `EnemyBrain` interface at `EnemyAISystem.ts:34-49`                       | Interface actually at lines 44-58; lines 34-42 are `EnemyAIState` enum                                                   | Read EnemyAISystem.ts:31-58  |
| `EnemyBrain` listed as only `{state, stateElapsedMs, hitTargets}`        | Interface now also has `bossPhaseIndex`, `bossPendingPhaseTransition`, `bossAttackIndex`, `selectedAttack` (boss fields) | EnemyAISystem.ts:44-58       |
| `faceTargetHorizontally()` called at `EnemyAISystem.ts:134`              | Actual call site is line 262; line 134 is a doc-comment                                                                  | EnemyAISystem.ts:134 vs :262 |
| `RealtimeBattleSnapshot` cited at `types.ts:96-113`                      | That range is `RealtimeBattleEntity`; `RealtimeBattleSnapshot` actually starts line 146                                  | types.ts:90-149              |
| `ENEMY_TEMPLATES` map cited at `stageConfig.ts:78`                       | Line 78 is `ELITE_STAT_MULTIPLIER`; `ENEMY_TEMPLATES` actually at line 267                                               | stageConfig.ts:75-130, 267   |
| `brains: Map<string, EnemyBrain>` cited at `RealtimeBattleRuntime.ts:74` | Actual declaration at line 90                                                                                            | RealtimeBattleRuntime.ts:90  |

All other citations checked clean (telegraph state machine `:210-218`/`:220-229`, knockdown/getUp mirror `:150-153,245-252`, hit-stun `:156-161`, boss phase block `:163-207`, `attacks.ts:60,68,253-254,296-303`, `stageConfig.ts:64,66,107-126`, `types.ts:30,101,113`, file sizes 339/837) — all match reality exactly. Substance claims (telegraph is its own state, knockdown/getUp shipped, boss phase-transition shipped, tier fields shipped) all verified true in code. Root cause: file kept evolving (boss fields added) after the doc's line numbers were written — contract's own "Stay-current note" already flags this needs a revision pass; my findings pin down exactly which numbers rotted.

**System state:** Healthy — done-criteria tests exist (837 lines) and directly cover the scars (idle→chase stuck states, arena-clamp desync, brain-not-persisted). Open gap: ground-marker telegraph VFX rendering has no owning file yet (correctly out of my scope). Contract text itself is stale on line numbers per above — worth a doc-only fix pass but not urgent (doesn't block dispatches, contracts route by scope not line number).

**Questions:**

1. Should I open a small doc-fix PR now for the 5 stale citations, or fold it into the "Stay-current note"'s already-flagged revision pass whenever that's scheduled?
2. `EnemyAISystem.ts` line 189 has a `ponytail:` comment flagging phase-transition borrowing `EntityState: 'skill'` as a stopgap — is upgrading that to its own render-distinguishable state tracked anywhere, or is it mine to raise when the VFX rendering system gets contracted?

---

## 10-elite-mini-boss-tier-system

_sid `3fc1c724-98a8-40c5-bdea-c50d818729a4`_

Confirmed clean — data table only, no hardcode. Studied enough of the worksite. Reporting.

**Seat summary**
I own the Elite tier (stat-multiplier + knockdown-eligibility flag) and the mini-boss stage type (Elite-tier encounter, no phase-transition). No own source file — I hold `ELITE_STAT_MULTIPLIER` + `tier`/`combatTier` fields living inside `stageConfig.ts`/`createRealtimeBattle.ts`, plus `EliteTierSystem.test.ts`. I never touch the Boss phase-transition state machine (§3.6.9, system 11), `EnemyAISystem.ts`'s AI core, `attacks.ts`, CC-as-status, summon AI, or PvP hit-reaction mapping. QC gate: `QC seat` (opus·xhigh), spawned per dispatch — bounces come back to me with full findings, I fix, never the gate.

**BLUEPRINT CHECK** — 14 file:line/claims verified against current code:

| Contract says                                                                    | Reality                                                                             | Verdict                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| `EnemyTier` type at `types.ts:33`                                                | line 33, exact                                                                      | ✓ match                       |
| `RealtimeEnemyTemplate.tier` at `stageConfig.ts:64`                              | line 64, exact                                                                      | ✓ match                       |
| `ELITE_STAT_MULTIPLIER` at `stageConfig.ts:78-82`                                | lines 78-82, exact                                                                  | ✓ match                       |
| `BattleWaveDefinition.enemies[]` at `stageConfig.ts:161-163`                     | lines 161-163, exact                                                                | ✓ match                       |
| `MiniBossStageParams.templateId` at `stageConfig.ts:192-195`                     | lines 192-195, exact                                                                | ✓ match                       |
| `trial-08`, `stageConfig.ts:754-755`                                             | key at line 728, but 754-755 does hold `stageType: 'mini-boss'` + `miniBoss: {...}` | ✓ close enough                |
| `RealtimeBattleEntity.tier`/`combatTier` at `types.ts:101,113`                   | 101=combatTier, 113=tier, exact                                                     | ✓ match                       |
| `EntityState` incl. knockdown/getUp at `types.ts:29-30`                          | exact                                                                               | ✓ match                       |
| `isKnockdownEligible` in `DamageSystem.ts`, one shared gate                      | confirmed, checks `tier==='elite' \|\| entityType==='boss'`                         | ✓ match                       |
| `EliteTierSystem.test.ts` Done-criterion 1 block at line 77+                     | line 77 exact                                                                       | ✓ match                       |
| Test file length 373 lines                                                       | wc -l = 373                                                                         | ✓ match                       |
| `EnemyAISystem.ts` 339 lines                                                     | wc -l = 339                                                                         | ✓ match                       |
| "จะกลายเป็นระบบเดินชุดที่สองที่กฎไม่ตรงกัน" quote at **`EnemyAISystem.ts:9-11`** | quote actually at **lines 16-18**; lines 9-11 are an import + blank line            | ✗ **citation off by 7 lines** |
| Done-criterion 5 (data-driven multiplier, no hardcode)                           | confirmed — only 3 files reference `ELITE_STAT_MULTIPLIER`, all read from the table | ✓ match                       |

14 claims checked, 1 minor citation-line discrepancy (harmless — the quoted rationale is real, just cited at the wrong line number), everything else exact.

**System state**: Fully shipped and passing per contract (PR #58, TASKS.md rows #17/DF17 graduated 100%). All 5 done-criteria have pinned tests. The one open item is external, not mine — §3.8.7 PvP hit-reaction tier mapping, deferred to P12, not yet dispatched.

**Questions**

1. Should I fix the `EnemyAISystem.ts:9-11` → should-be-`16-18` citation now (docs-only, zero code risk), or hold it for a batched docs pass?
2. My contract is fully graduated with no open code work — is there a specific incoming dispatch, or do I just stay dormant until routed?

---

## 11-boss-system

_sid `eb1a30c8-f824-4fea-a7ad-3eeaca9a4991`_

## Onboarding เสร็จ — Boss System (#11) System owner

**(1) Seat summary**
ถือ: HP-threshold phase-transition state machine เฉพาะ boss tier — `telegraph`/`phase-transition` state ใน `EnemyAISystem.ts` (host file ของ #9) + `BOSS_TEMPLATES`/`BossAttackRow`/`BossPhaseTemplate` ใน `stageConfig.ts` (host file ของ #16).
ไม่แตะ: generic enemy AI loop (#9), Elite/Mini-boss tier (#10, ไม่มี phase-transition), per-move schema (#5), knockdown eligibility (#6), stage/wave placement (#16/#17).
Gate: opus·xhigh QC ต่อ dispatch (2/dispatch, ไม่ split — no own source file).
Memory: `MEMORY/11-boss-system.md` — ยังไม่มี สร้างตอน dispatch แรก.

**(2) BLUEPRINT CHECK** — verified 19 claims, 4 discrepancies (ทุกอันเป็น citation drift, ไม่ใช่ผิดข้อเท็จจริง)

| Contract claims                                                                                    | Reality                                                 | Evidence     |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------ |
| `EnemyAISystem.ts:17` — Telegraph extends union here                                               | Union อยู่ line 31-42, line 17 เป็น comment             | อ่านไฟล์จริง |
| `stageConfig.ts:6-9` — header comment ห้าม hardcode (cited 2 จุด: Scope + Low-maintenance section) | Comment จริงอยู่ line 14-15; 6-9 เป็น import statements | อ่านไฟล์จริง |
| `MASTER_BLUEPRINT_v3.0.md:217` — "Boss/enemy attacks additionally define..."                       | บรรทัดจริงคือ 218                                       | อ่านไฟล์จริง |
| `MASTER_BLUEPRINT_v3.0.md:270` — Heavy 3D telegraph VFX excluded                                   | บรรทัดจริงคือ 271                                       | อ่านไฟล์จริง |

ที่เหลือ verified clean: `types.ts` (EntityType:47, RealtimeBattleEntity:67-119, invulnerableUntilMs:96, ground-marker:130), `EnemyAISystem.ts` (union:31-42, boss block:163-207, pool line:266), `HitboxSystem.ts` (invuln check:105,146), `EnemyAISystem.test.ts` (describe block:321), `stageConfig.ts` (BossAttackRow-BOSS_TEMPLATES:92-154, entry:132-154), `TASKS.md` DF16 (PR #57, 🟢100%, 4 scars ตรงกับ contract เป๊ะ), `bossStageIntegration.test.ts` มีจริง.

**(3) System state**
Graduated 100% (DF16, PR #57, 2026-08-08) — 5 done-criteria + 4 scars ครอบใน `EnemyAISystem.test.ts:321` block. โค้ดตรงกับ contract แทบทุกจุด ยกเว้น line-citation คลาดเคลื่อนเล็กน้อยตามตาราง. ไม่มี open work ค้างที่เห็นบน system นี้ตอนนี้.

**(4) Questions**

1. 4 citation drift ในตาราง — แก้ทันทีตอน dispatch แรก (aside เล็ก) หรือรอ dedicated docs-audit pass?
2. "Stay-current note" บอก shader-based telegraph VFX รอ R3F/WebGPU pipeline โต — ตอนนี้ยังถือเป็น CUT ตาม §3.6.10 เต็มที่ใช่ไหม หรือมีสัญญาณให้เริ่มประเมินแล้ว?

---

## 12-hero-kit-archetype-system

_sid `9097cce7-9552-4375-a7fa-6541d532191a`_

**Seat summary**
Own: `docs/agent-blueprint/12-hero-kit-archetype-system.md` — hero moveset data (basic combo + S1/S2/S3/ult) + archetype targeting/effect rules via `AttackDefinition`/`RealtimeSkillKit`. Files: `src/game/heroes/kits/*`, `src/game/heroes/heroProductionBatch.ts`, `src/game/realtimeBattle/attacks.ts`+`skills.ts` (data side).
Never touch: enemy AI state machine (§3.6.8, system 09), gacha/star-ascension math, PvP matchmaking, skill-button UI. Kits/ boundary split with system 04: I own data VALUES, 04 owns lifecycle SEMANTICS.
Gate: a spawned QC seat (opus·xhigh) per dispatch. Batch dispatch (5+ kits at once) fires §2c split → per-hero makers+QC, me as joiner.

**BLUEPRINT CHECK**

| Contract claim | file:line | Reality | Verdict                           |
| -------------- | --------- | ------- | --------------------------------- |
| (none found)   | —         | —       | verified clean, 13 claims checked |

Checked: 5-hero batch list, kits/index.ts aggregation+re-export chain, `RealtimeSkillKit`/`RealtimeSkillDefinition` shape, `AttackDefinition` field list (49-82), single-source-of-truth header comment, `MONKEY_GOLDEN_FURY` damageMultiplier=1.1/strikeCount=4, `SkillProgressionSystem` heroLevel/skillLevels, `rankedNormalization.toRankedHeroSnapshot`, `DamageSystem.calcDamage` formula, `HitboxSystem.test.ts` existence, Done-criteria #2/#3/#5 tests (all exist, assert exactly what contract says).

**System state**
5 heroes shipped (Fighter/Heavy/Ranged/Control/Summoner), Support archetype still zero code. Done-criteria #1-#5 all appear satisfied in code+tests already — contract looks near-graduated, not a fresh build. `hitShape` union still only `horizontal`|`radial` (no drift from §3.8.2's data-not-architecture rule).

**Questions**

1. Contract's Done-criteria read as already met — is my first dispatch new work (e.g. Support archetype build-out) or a graduation/verification pass?
2. `targetLock: 'nearest'` also appears on celestialArcher/nezhaWarden/pigWarrior kits, not just Monkey King (contract's Done-criteria #3 test only covers Monkey King) — worth a follow-up test sweep, or out of scope till flagged?

---

## 13-hero-collection-system

_sid `c2f95ce0-f32c-47b6-80a7-be9fe20073ef`_

**(1) Seat summary**

System owner of System #13 Hero Collection: own `ROSTER` (`characters.ts`) + `grantCharacter` write-path (both impls) + `OwnedCharacter` shape it seeds. Never touch: gacha RNG/pity (#23), progression/star math (#14/#15), combat kit files (#12). Gate = spawned QC (opus·xhigh) per dispatch; sensitive edge (grantCharacter/Supabase write) → no delegate-down, opus flip on RLS/RPC touches. Memory file `MEMORY/13-hero-collection-system.md` doesn't exist yet — creates on first dispatch. Contract paused (P10 held behind P9 Gacha/Star per HetCreep).

**(2) BLUEPRINT CHECK** — verified 15 claims, 12 discrepancies found:

| Contract says                                                                  | Reality                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ROSTER` at `characters.ts:59-117`                                             | actual `70-197`                                                                                                                                                                                                                                                                                   | file refactored (ModelSpec fields cut), lines shifted +11                                                                                           |
| `getCharacter()` at `:119-122`                                                 | actual `199-202`                                                                                                                                                                                                                                                                                  | same shift                                                                                                                                          |
| `Character` interface at `:36-52`                                              | actual `42-63`                                                                                                                                                                                                                                                                                    | same shift                                                                                                                                          |
| `Rarity` union at `:11`                                                        | actual `:17`                                                                                                                                                                                                                                                                                      | same shift                                                                                                                                          |
| `CharacterGrantResult` at `accountRepository.shared.ts:65-66`                  | actual `74-75`                                                                                                                                                                                                                                                                                    | file grew                                                                                                                                           |
| `grantCharacter` (local) at `accountRepository.ts:813-849`                     | actual `753-783`                                                                                                                                                                                                                                                                                  | file shrank/moved                                                                                                                                   |
| `grantCharacter` (supabase) at `accountRepository.supabase.ts:313`             | actual `682-701`                                                                                                                                                                                                                                                                                  | +369 lines — comment at 687-688 says an admin-check bug ("call RPC via devtools, get any hero free") got fixed since, file grew a lot               |
| `OwnedCharacter` at `player.ts:12-18`                                          | lines 12-18 are `SkillProgress`, not `OwnedCharacter`; real interface starts `:26`                                                                                                                                                                                                                | content mismatch, not just drift                                                                                                                    |
| System #13 entry at `AGENT_BLUEPRINT.md:61`                                    | actual `:83`                                                                                                                                                                                                                                                                                      | drift                                                                                                                                               |
| wiring at `App.tsx:35,58`                                                      | `grantCharacter` actually at `:40` (import), `:182` (prop)                                                                                                                                                                                                                                        | drift                                                                                                                                               |
| wiring at `useAuth.ts:184-226`                                                 | actual `:70,273,375`                                                                                                                                                                                                                                                                              | drift                                                                                                                                               |
| **Gacha "not built," must call `grantCharacter` when it ships (Dependencies)** | **Gacha (#23) shipped since — `TASKS.md` row 22, 90% CI-green, prod migration applied. `perform_gacha_pull` RPC does its OWN `insert into owned_characters` (`supabase/migrations/20260809073000_p9_gacha_server_authority.sql:254-263`), bypassing `grant_character`/`grantCharacter` entirely** | real architecture violation, not doc rot — a second write path exists, just at the SQL layer where done-criterion 5's `src/`-only grep can't see it |

Clean: `heroCollection.test.ts` line citations (`:41-76`, `:78-97`, `:100-112`) all exact. Role/archetype distinctness (6 roles, all unique) confirmed. `TASKS.md` row 24 (100% graduated) and `MASTER_BLUEPRINT_v3.0.md:550` P10 reference both check out.

**(3) System state**: Code healthy, tests pass all 5 done-criteria for the JS-level path. But the last finding above is real and unflagged anywhere: gacha now grants heroes through a path this system's contract explicitly says shouldn't exist.

**(4) Questions**

1. Is the gacha-RPC-bypasses-`grant_character` finding already known/accepted by HetCreep, or should I flag it as a fresh contract violation on first dispatch?
2. Should I refresh all the stale file:line citations in the contract doc myself (mechanical, safe), or is that out of my system owner scope until seam/QC assigns it?

---

## 14-progression-system

_sid `bddfcf82-76bc-42a3-9ba4-2bcad4f03977`_

**(1) Seat summary**
เป็น system owner system 14 — Progression System. Owns: Hero Level EXP curve (`RewardSystem.ts` legacy path + `progressionService.applyHeroExp`/`heroExpService.ts` current path), Skill Level (data model + level-up flow), Talent/Awakening (un-deferred, fully built, UI hidden). Never touch: Star Ascension (#15), reward/EXP generation (#18), stage/difficulty tuning (#16), Equipment/Loot, PvP normalization logic (#20 — only expose read shape). Gate: spawned QC (opus·xhigh) per dispatch, no delegate-down on sensitive edge (progression persistence/0008 migration).

**(2) BLUEPRINT CHECK** — 15 claims verified

| #   | Claim                                                                   | Contract says               | Reality                                                                                                             | Verdict                |
| --- | ----------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 3   | `SkillProgressionSystem.ts` location                                    | `src/game/progression/`     | actually `src/game/realtimeBattle/SkillProgressionSystem.ts` (79 lines)                                             | **STALE — wrong path** |
| 11  | `PLACEHOLDER_HERO_EXP_TABLE` + `10n²+10n+100` location                  | implied `heroExpService.ts` | both live in `progressionConfig.ts` (table L29, formula L52); `heroExpService.ts` only has `applyHeroExpToProgress` | **STALE — wrong path** |
| 1   | `applyBattleExp` at RewardSystem.ts:96-128                              | L96-128                     | L127-149 (logic all confirmed correct: curve, guard<20, teamSlots.find)                                             | minor drift            |
| 2   | lead-hero resolve line ~109                                             | L109                        | L130                                                                                                                | minor drift            |
| 5   | `SKILL_PROGRESSION_FIXTURES` L63-146                                    | L63 start                   | L77 start                                                                                                           | minor drift            |
| 7   | 0008 migration persists `skill_levels`/`talent_state`/`awakening_state` | implies all 3 added by 0008 | 0008 only adds `talent_state`+`awakening_state`; `skill_levels` predates it                                         | minor imprecision      |
| 8   | accountRepository.supabase.ts L454-456,593-595                          | —                           | L454-456 confirmed, second block at L598-600 not 593-595                                                            | minor drift            |

Rest (4,6,9,10,12,13,14,15) verified TRUE, no discrepancy. 15 claims checked, 2 real (path) errors, 5 cosmetic line-drift.

**(3) System state**
Graduated 🟢 100% (TASKS.md row 21 + DF21, 2026-08-08), 1,868 lines in `src/game/progression/`. Recent Ring-0 balance lock (2026-08-09) fixed a non-monotonic Lv10/11 EXP seam. #20 (PvP normalization) reads this system but has zero production callers yet — normal, waiting on #19's P13 build.

**(4) Questions**

1. Contract's file:line citations for `SkillProgressionSystem.ts` and the hero-exp-table location are wrong (point to `progression/` when code sits in `realtimeBattle/`/`progressionConfig.ts`) — แก้ contract เลยไหม ตอน dispatch แรก, หรือรอ owner สั่ง?
2. #18 (Reward System) contract ก็ claim ownership `RewardSystem.ts:96-128` เดียวกัน (per the seat rEGISTRY.md row 18 "CONTRACT CONFLICT") — ยัง unresolved. ผมงดแตะจนกว่า owner ตัดสิน ใช่ไหม?

---

## 15-star-ascension-system

_sid `7044b01a-8336-41e9-986c-10202136c927`_

Verified enough. Study done, staying read-only.

**(1) Seat summary**

- Own: `docs/agent-blueprint/15-star-ascension-system.md`'s scope — star tier (★1–6), duplicate/shard-consumption rule, per-star stat-multiplier table, `statsAtStar()`, the `ascend_character_star` RPC and its persistence.
- Never touch: gacha pull mechanic/rates (system 23), Hero/Skill Level progression (system 14), combat damage math (systems 2/6), PvP match setup/normalization (system 19/20) — I only feed the unnormalized stat delta.
- Gated by: spawned QC (opus·xhigh) per the seat roster — SENSITIVE THROUGHOUT, no delegate-down ever, opus floor on RPC/migration touches, security lens mandatory.

**(2) BLUEPRINT CHECK** — 6 claims checked, 1 discrepancy:

| Contract says                                                      | Reality                                                         | Evidence                                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Duplicate-shard grant lives at `src/game/gacha/gachaService.ts:90` | File doesn't exist — grant is server-side SQL, not a TS service | `supabase/migrations/20260809073000_p9_gacha_server_authority.sql:262` `set shards = shards + 1` |

Everything else checked clean: migration columns/constraints (`20260808204905_p9_star_ascension_server_authority.sql:4-21`), `OwnedCharacter.star?/shards?` (`src/types/player.ts:44-49`), `Character`/`CharacterStats` no star field (`src/game/characters.ts:34-63`), `statsAtStar()` (`src/game/heroes/starScaling.ts:18-29`).

**(3) System state**
`ascend_character_star` RPC is fully built server-side (idempotent, `for update` locked, history table + RLS) with a matching client-preview (`StarAscensionSystem.ts`). But grep across `src/components` and `src/` for any caller of that RPC/preview/`canAscendStar` turns up nothing outside `accountRepository.supabase.ts` and tests — no UI ever calls it. Registry's "Known open: UI caller missing" note is confirmed accurate, not stale.

**(4) Questions**

1. Should I file/claim the UI-caller gap as my own next dispatch (own-scope), or does it wait on someone else building the ascension screen first?
2. Contract's gacha-shard citation is stale (points at a file that never existed) — fix it myself next dispatch, or flag to main since editing another system's cited evidence touches shared doc?

---

## 16-stage-adventure-system

_sid `59e6f6c7-6eec-43a3-b298-64f7e5755296`_

Good — that claim holds. Wrapping up study now; sufficient sample verified (11 claims checked, most stale).

**Seat summary** — OWNER of system 16 (stage/adventure). Own: `REALTIME_STAGES` data catalog + `RealtimeBattleStage`/`BossTemplate`/`ELITE_STAT_MULTIPLIER` symbols hosted in `stageConfig.ts`, chapter/gating logic (`isStageUnlocked`, `getOrderedStages`, `getAdventureChapters`), `adventure/` energy system. Never touch: in-battle combat resolution (Movement/AI/Combat), stage-type behavioral variation (`StageVariationSystem.ts`, system #17), reward computation (`RewardSystem.ts`, system #18) — those are sibling consumers of the same host file, seam edits near their symbols route to main. Gated by a spawned QC (opus·xhigh) per dispatch, per `the seat roster` row 16.

**BLUEPRINT CHECK** (11 claims checked against live code):

| Contract claim                                                                 | file:line cited                   | Reality                                                                                                                                                     | Evidence                              |
| ------------------------------------------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| "no Chapter type exists... flat Record, 2 entries, no chapterId, no gating"    | Scope §, `stageConfig.ts:140-186` | FALSE — chapterId/order/isBoss fields exist, 15 stage entries, gating implemented                                                                           | `stageConfig.ts:236-240,396-819`      |
| `RealtimeBattleStage` struct                                                   | cited `stageConfig.ts:61-186`     | Interface actually at `:219-265`; `REALTIME_STAGES` at `:396-819`                                                                                           | direct read                           |
| Done-criteria #1 chapter grouping + boss tag                                   | —                                 | ALREADY MET — `trial-10`/`p5-boss-arena` both `isBoss: true`                                                                                                | `stageConfig.ts:546,813`              |
| Done-criteria #2 stage-select surface, "lobby hardcodes LOBBY_BATTLE_STAGE_ID" | `LobbyBattleSession.tsx:20`       | FALSE — that constant no longer exists; `StageSelect.tsx` component reads `isStageUnlocked`                                                                 | grep, no match                        |
| Done-criteria #3 gating predicate, unit-testable                               | —                                 | ALREADY MET — `isStageUnlocked` pure fn, tested in `stageConfig.test.ts`                                                                                    | `stageConfig.ts:872-881`              |
| Scope: stage-type variation "System #17... not yet implemented"                | —                                 | FALSE — `StageVariationSystem.ts` exists (126+386 lines per registry), `StageType`/params fully wired into the interface                                    | `stageConfig.ts:172-265`, file exists |
| `createRealtimeBattle.ts` consumes stage via `getRealtimeStage`                | `:117`                            | Call now at `:253`                                                                                                                                          | grep                                  |
| Stay-current note: stamina/energy gating "OPEN pending owner call"             | —                                 | Partially stale — `adventure/energySystem.ts` + `consumeStageEnergy` already wired into `LobbyBattleSession.tsx:122`, `energyCost` field live in stage data | direct read                           |
| Done-criteria #4 pinned tests green                                            | `battleAssets.test.ts:64`         | HOLDS — line 64 does iterate `Object.values(REALTIME_STAGES)`                                                                                               | `battleAssets.test.ts:64`             |
| RewardSystem sibling-consumer, imports only `getEnemyTemplate`                 | —                                 | HOLDS                                                                                                                                                       | `RewardSystem.ts:4`                   |
| Host-file sharing (#10/#11 symbols in `stageConfig.ts`)                        | —                                 | HOLDS — `BOSS_TEMPLATES`/`ELITE_STAT_MULTIPLIER` present                                                                                                    | `stageConfig.ts:78-158`               |

**System state**: Far ahead of its own contract — chapter/gating/stage-select/energy work the contract calls "gap"/"open" all shipped already (10 trial stages + 4 P5 test arenas, 2 boss-tagged). Contract itself is now the stale artifact, not the code.

**Questions**:

1. Contract predates most of what's built — should I draft a revision (scope/done-criteria refresh) now, or wait for first real dispatch?
2. `p5-*` arenas carry `chapterId: 'dungeon-p5-test'` and bypass `StageVariationSystem.ts` (own dungeon-orchestrator schema per code comment `:452-457`) — is that dungeon slice still mine, or does it belong to a system not yet in the registry?

---

## 17-stage-variation-system

_sid `4dbfb7cf-eb24-4c9c-98a6-e56cca48403f`_

Confirmed, my file will be `MEMORY/17-stage-variation-system.md`, lazy-born at first dispatch (correctly not created now — this run stays read-only per instructions).

**(1) Seat summary**
System owner of system 17, stage variation. I own `StageVariationSystem.ts` (win/lose per `stageType`) and its param types on `stageConfig.ts`'s `RealtimeBattleStage`. Never touch: `EnemyAISystem.ts` AI behavior, `RewardSystem.ts` payout math, inter-stage gating/stamina (open, HetCreep call), numeric difficulty tuning. Gated by a spawned QC per dispatch (opus·xhigh); seam edits into other systems' files route through main, which I in turn gate when it touches my files.

**(2) BLUEPRINT CHECK** — 11 claims checked, 4 discrepancies found:

| Contract says                                                           | Reality                                                                                                                                                                    | Evidence                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `stageConfig.ts:61-76` = `RealtimeBattleStage` interface                | Interface actually at lines 219–265; 61–76 is inside `RealtimeEnemyTemplate`                                                                                               | `stageConfig.ts:219-265` vs `:61-76`                        |
| `stageConfig.ts:8` = "ห้าม hard-code..." rule                           | Same text actually at line 14                                                                                                                                              | `stageConfig.ts:14`                                         |
| `RewardSystem.ts:51-54` = `calculateBattleReward` signature             | Function signature actually at lines 57–61                                                                                                                                 | `RewardSystem.ts:57-61`                                     |
| "`REALTIME_STAGES` now has stage entries spanning all 7 non-wave types" | Only 6 of 7 non-wave types have real entries — `custom` has zero stages anywhere in `stageConfig.ts` (it exists only in the win-condition dispatch and test/dungeon files) | grep for `stageType: 'custom'` in `stageConfig.ts`: no hits |

All other checked claims held exactly: 8 win-condition functions dispatched on `stageType` ✓, 24 tests (`grep -c "it("` = 24) ✓, `checkBattleEnd()` calls `resolveStageOutcome()` with zero `stageType` branching ✓, `flow/types.ts:1-18` fully commented out ✓, `EnemyAISystem.ts:31-42` `EnemyAIState` union matches verbatim ✓, `StageVariationSystem.test.ts:260-267` mini-boss/`entityType` isolation test ✓, TASKS.md row 17/DF19 graduated 100%, PR #60 ✓.

**(3) System state** — Shipped and graduated (TASKS.md DF19, 2026-08-08). All 7 stage types have a dispatchable win-condition; 6 of 7 have real playable stage data (`custom` is defined but unused — falls back to wave-clear logic, no stage exercises it). Done-criterion #5 (2–5 min / 5–8 min playtest timing) is explicitly still unverified — no playtest data exists per TASKS.md.

**(4) Questions**

1. Should `custom` stageType get a real stage entry, or is it deliberately dormant until a concrete need proves the shape (per the file's own "premature abstraction" comment on `resolveCustomOutcome`)? Affects whether I should flag/fix the blueprint's "spans all 7 types" claim, or leave `custom` as-is.
2. Line citations in this contract have drifted by a consistent handful of lines across `stageConfig.ts` and `RewardSystem.ts` (comments added since blueprint authoring pushed content down) — worth a quick contract refresh pass, or is that noise you'd rather I not spend a dispatch on?

---

## 18-reward-system

_sid `9d07b40c-4f46-4b6e-8a52-50614cdef2c8`_

**(1) Seat summary**
Own: pure reward calc for real-time PvE battles (`RewardSystem.ts` — gold/EXP/materials, account+lead-hero EXP apply) plus `src/game/reward/` (stage table, pipeline, resolver). Never touch: persistence/ledger (`accountRepository.ts earnGold/grantItem`), gear/affix drops, PvP rewards, save-order orchestration outside `lobbyBattleRewardPipeline.ts`. Gated by a spawned QC seat (opus·xhigh) per dispatch; seam edits into other systems' files route through main.

**(2) BLUEPRINT CHECK** — verified 23 file:line claims.

| Contract says                                                                                                                                                                                                                                                                                                                        | Reality                                                          | Evidence                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------- |
| `RewardSystem.ts:11` — file-purity comment                                                                                                                                                                                                                                                                                           | Off by 1, comment is line 12                                     | cosmetic                                      |
| defeat-always-zero at `RewardSystem.ts:55-57`                                                                                                                                                                                                                                                                                        | Actual check is lines 62-64; 55-57 is now the function signature | doc drifted after docstring/options additions |
| read-only `.find`/iteration at `RewardSystem.ts:62-67`                                                                                                                                                                                                                                                                               | Actual `.find` loop is lines 77-78                               | same drift                                    |
| `TEMPLATE_REWARD (RewardSystem.ts:28-32)` / `DISCIPLINE-CHECK`'s `25-32`                                                                                                                                                                                                                                                             | Actual `29-33`                                                   | off by ~1-4 lines throughout                  |
| test pin `RewardSystem.test.ts:34-41`                                                                                                                                                                                                                                                                                                | Actual test body ~36-44                                          | minor drift                                   |
| Everything else checked (scope 14-128, applyBattleExp 127-149, delegate 67-72, pipeline calls line 163/182, `LobbyBattleSession.tsx:69,100,134-172,136-137,141`, `accountRepository.ts:578,703`, `stageRewardConfig.ts:7-179`, trial-01..10 full coverage, done-criteria 5/6 tests, dependency claim "no combat/pvp/social callers") | Matches exactly                                                  | verified live                                 |

23 claims checked; only line-number drift (few lines, mechanical edits since the doc was written), no claim is substantively false.

**(3) System state**: Healthy — pure, deterministic, no `Math.random`/`Date.now`. Done-criterion 6 and both cited FEH-scar shapes have dedicated tests already (`LobbyBattleSession.test.tsx:416,461,550`). Per-enemy-template branch is confirmed dead code (all 10 trial stages have `STAGE_REWARD_DEFINITIONS` entries) — flagged in contract as expected, not a bug.

**(4) Questions**

1. Registry row 18 flags "CONTRACT CONFLICT: #14 vs #18 both claim `RewardSystem.ts:96-128`" — actual `applyBattleExp` is 127-149, `applyAccountExp` 106-120 (system-14's territory per its own note). Who resolves this before first dispatch, and does system 14 actually own `applyAccountExp` too?
2. `finalizeLobbyBattleRewards` merges `heroExp`/`accountExp` into one `earnedExp` that `applyBattleExp` applies to BOTH account and lead hero identically — is that intentional double-crediting or should stage-table `heroExp` route only to the hero? Not in my contract's done-criteria; flagging for owner call.

---

## 19-pvp-ranked-system

_sid `679e1a43-29c4-4708-950e-e9a427716060`_

Just a UI disclaimer label, not real logic — confirms no queue/MMR code exists. Line counts (83+109) match exactly. Study done.

**(1) Seat summary**
Own: ranked 1v1 PvP loop — hero select, matchmaking queue, MMR/rank-band matching, match resolution, rank/MMR update. Currently docs/design only, zero queue/rank code exists yet.
Never touch: combat tick/damage engine (`realtimeBattle/*`), hero/star math, account/currency persistence pattern, PvE stage content, and `#20`'s normalization delivery (I consume it, don't own it) or `#21`'s private-room netcode (`PvPAuthorityEngine/Service`, `pvpRoomRepository.supabase.ts`).
Gated by: spawned QC (opus·xhigh) per dispatch; at P13 build, expected split into 3 makers+3 QC+joiner per §2c (heterogeneous server/client/rank-math kinds).

**(2) BLUEPRINT CHECK** — verified 5 claims, 1 confirmed wrong:

| #   | Contract says                                                                                  | Reality                                                 | Evidence                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Contract §19 line 7: `#21`'s prototype "never calls `rankedNormalization.ts`"                  | FALSE — it does call it                                 | `supabase/functions/pvp-authority/index.ts:10,195-196` imports and calls `createRankedPlayerEntity` from `rankedNormalization.ts` |
| 2   | the seat roster row 20: "Shipped-but-uncalled: first real caller arrives with #19's P13 build" | Same error — already has a real caller today            | same lines above                                                                                                                  |
| 3   | rankedNormalization.ts 83 lines + test 109                                                     | Correct                                                 | `wc -l` = 83 + 109                                                                                                                |
| 4   | "never persists rank/MMR" (contract §19 line 7)                                                | Correct — verified                                      | no MMR/rank write in `pvp-authority/index.ts`                                                                                     |
| 5   | "no queue/rank-band/MMR/Elo persistence code exists under src/"                                | Correct — only a UI disclaimer string matched, no logic | `PvPRoomModal.tsx:210` is just a footer label                                                                                     |

The "never encroaches" framing needs a caveat: the prototype doesn't persist rank/MMR (true, scope intact for the queue/rank slice), but it does already consume `#20`'s normalization output in production edge-function code — contract and registry both currently misstate this as zero-caller.

**(3) System state**: pure docs/design, zero PvP-19 code shipped (queue/band/MMR/rank-update all unbuilt, P13). `#20` (normalization) and `#21` (private-room netcode, gated `PVP_BACKEND_DEPLOYED=false`) both have real shipped code my future work depends on/must not touch.

**(4) Questions**

1. Should I file the caller-count discrepancy (finding #1/#2 above) as an edit request now, or hold it until my first real dispatch since this run is read-only?
2. `MEMORY/19-pvp-ranked-system.md` doesn't exist yet — confirm I create it on first dispatch, not this onboarding run?

---

## 20-pvp-power-normalization

_sid `ddd47918-11a9-4f96-95bc-75b6cb6d01fe`_

Untracked, unedited by me — clean.

**(1) Seat summary**
Own: `src/game/pvp/rankedNormalization.ts` + its test — the pure `toRankedHeroSnapshot`/`createRankedPlayerEntity` swap that clamps level/skillLevel to `RANKED_BASELINE` for ranked PvP, star passed through untouched.
Never touch: matchmaking/MMR/rank-band (#19/P13), `DamageSystem.ts` combat math, star/level formulas themselves (owned by #14/#15), `createPlayerEntity()`'s PvE call path, and the seam wiring that will one day call my function from #21's engine — that wiring is main work.
Gated by: a spawned QC seat (opus·xhigh) per dispatch, per the seat roster.

**(2) BLUEPRINT CHECK** — 8 claims verified.

| Contract says                                                                                     | Reality                                                                                                                                                                                                                          | Evidence                                                                     |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `player.ts:37,47` = skillLevels/star                                                              | matches                                                                                                                                                                                                                          | `src/types/player.ts:37,47`                                                  |
| `createRealtimeBattle.ts:94-95` level+star stat wiring                                            | matches                                                                                                                                                                                                                          | file:94-95 exactly as cited                                                  |
| `calcDamage` never touches level/skillLevel/star                                                  | matches                                                                                                                                                                                                                          | `DamageSystem.ts:54-69`, only atk/def/hp                                     |
| "no pvp/ranked/mmr/elo code found... tracked separately as #19" (Dependencies section)            | **stale** — real PvP code exists: `PvPAuthorityEngine.ts`, `PvPAuthorityService.ts`, `PvPReconciler.ts`, `pvpRoomRepository.supabase.ts`, `usePvPRoom.ts`, `PvPRoomModal.tsx` (all non-test, same-day commit 2026-08-09)         | `Glob src/game/pvp/**`, `src/hooks/usePvPRoom.ts`, `src/components/PvPRoom/` |
| "Shipped-but-uncalled: first real caller arrives with #19's P13 build" (registry row 20)          | accurate — every caller of `createRankedPlayerEntity`/`toRankedHeroSnapshot` is a `*.test.ts`/`*.test.tsx` file; zero production imports anywhere                                                                                | repo-wide grep, both `src/game/pvp` and full `src`                           |
| TASKS.md row 26: "#21 authority session now constructs both combatants through #20 normalization" | true only of the **test suite** (`PvPAuthorityEngine.test.ts`, `PvPAuthorityService.test.ts`) — `PvPAuthorityEngine.ts`/`PvPAuthorityService.ts` production code takes a pre-built `entity` as input and never imports my module | grep on `.ts` prod files: no match                                           |
| Done-criterion #3 (130% cap, end-to-end)                                                          | test exists and asserts it                                                                                                                                                                                                       | `rankedNormalization.test.ts:99-108`                                         |
| Done-criterion #4 (no mutation)                                                                   | test exists                                                                                                                                                                                                                      | `rankedNormalization.test.ts:87-97`                                          |

**(3) System state**: Function + tests complete, all 5 done-criteria appear satisfied on paper (TASKS.md row 26/DF23, 90%, "verification"). Genuinely uncalled from any production path — normal for this stage, not a bug. Blocked on #19/#21's real wiring + prod migration/Edge Function deploy before graduation.

**(4) Questions**

1. My contract's own Dependencies section is stale about #19/#21's existence (says "does not exist in src/ yet") — should I fix that prose myself at first real dispatch, or is contract-editing Ring-0-only per §6 of the local workflow doc (fence, not suggestion)?
2. When #21's engine eventually wires `createRankedPlayerEntity` in for real — is that seam edit (inside `PvPAuthorityEngine.ts`, a file I don't own) something I get dispatched to review/gate since it calls into my file, or purely main's?

---

## 21-netcode-networking-system

_sid `e5d9a21e-858a-47ee-ad00-42b8f607a2f4`_

Good, that satisfies the "two-client simulation is implemented and tested" claim. I've checked enough load-bearing citations. Time to report back.

**Seat summary** — System owner of system 21 (netcode/networking). I own: input transport, state reconciliation/desync detection, private invite-session lifecycle, disconnect/forfeit handling, and §3.8.7's hit-reaction-tier call — all inside `src/game/pvp/*` + `pvp-authority` Edge Function + its migration. I never touch: combat sim itself (`realtimeBattle/*` systems 01-11), matchmaking/MMR/rewards (P13, system 19), currency, PvE AI. Cross-slice dispatch = 8 seats (3 makers: engine TS / server Deno+SQL / client React, each own QC, + joiner + Unit Gate); single-slice = 2. Unit Gate (opus·xhigh) gates assembly+stream-fit; server slice QC carries a security lens, opus floor, no delegate-down.

**BLUEPRINT CHECK** — 11 claims checked, all held up:

| Claim                                           | file:line cited                   | Reality                                                                     | Verdict                            |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `EntityType` incl. `'pvp-player'`               | types.ts:47                       | matches exactly                                                             | clean                              |
| `controllerId?` field                           | types.ts:105                      | field is actually line 106 (comment on 105)                                 | trivial 1-line drift, non-material |
| `prepareCombatant` sets entityType/controllerId | PvPAuthorityEngine.ts:138-139     | matches exactly                                                             | clean                              |
| `combatTier:'elite'`                            | PvPAuthorityEngine.ts:145         | matches exactly                                                             | clean                              |
| Test asserts elite tier                         | PvPAuthorityEngine.test.ts:93-101 | matches exactly                                                             | clean                              |
| `RealtimeBattleResult` PvE-shaped               | types.ts:179-191                  | matches exactly, no matchId/opponent field                                  | clean                              |
| `RealtimePvPResult` exists in pvp module        | pvpTypes.ts                       | confirmed                                                                   | clean                              |
| 1s liveness timeout / 10s reconnect grace       | —                                 | `PVP_LIVENESS_TIMEOUT_MS=1_000`, `PVP_RECONNECT_GRACE_MS=10_000`            | clean                              |
| Migration + Edge Function exist                 | —                                 | both present (`20260809064000_p12_private_pvp_rooms.sql`, `pvp-authority/`) | clean                              |
| `PVP_BACKEND_DEPLOYED=false` (registry)         | featureFlags.ts:18                | confirmed false                                                             | clean                              |
| Two-client sim tested                           | —                                 | `PvPAuthorityEngine.test.ts` covers it                                      | clean                              |

Verified clean, 11 claims checked. No fabricated citations found.

**System state** — Prototype complete and tested locally (PGLite + Deno-checked Edge function); prod graduation blocked only on applying the migration/function to the real Supabase project and re-running live two-client verification there. `PVP_BACKEND_DEPLOYED=false` gate confirms it's not live yet. No open bugs surfaced — the two "known scars" sections (SFV clock drift, Skullgirls rollback input drop) are test-recommendations, not yet built into a test harness (§Done-criteria #2's ~150ms latency harness — haven't confirmed it exists; flagging as unchecked, not broken).

**Questions**

1. Has the ~150ms-latency + packet-loss integration test (Done-criteria #2) actually been written, or is it still owed before P12 can graduate?
2. Production deploy of the migration/Edge Function to real Supabase — is that scheduled, or waiting on an explicit owner go-ahead?

---

## 22-currency-system

_sid `91c9a0a1-c677-4f8c-a478-e719720aae23`_

**(1) Seat summary**
Own: `PlayerCurrency{gold,gem}` + `CurrencyTransaction[]` audit trail, `appendTransaction` choke point, `earnGold`/`topUpGold`/`topUpGems`/`redeemCoupon`/`getTransactions`, coupon anti-replay/quota. `createNewPlayer` starting-balance = only accepted exception (no transaction logged).
Never touch: reward amount calc (#18), item inventory/`grantItem`, real payment gateway, gacha spend RPC (#23, exists now — `perform_gacha_pull`).
Gate: spawned QC per dispatch (opus·xhigh), mandatory `resilience-audit`+`drift-canary`+security lens. Sensitive throughout, opus floor on ledger/RPC/migration, no delegate-down. CoalBoard consent gate on schema/RPC/source-rule changes.

**(2) BLUEPRINT CHECK**

| Contract claim                                                                                                   | Reality                                                                                                                           | Evidence                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `appendTransaction`/choke-point comment at `accountRepository.ts:214`                                            | line 244                                                                                                                          | comment text matches exact, line drifted +30                                                                          |
| `createNewPlayer` at `:387`, exception comment `:384-386`                                                        | func at 329, comment at 339                                                                                                       | content matches exact, drift ~50 lines                                                                                |
| earnGold/topUpGold/topUpGems/redeemCoupon/getTransactions cited at `:631-746`                                    | actual span `578-693`                                                                                                             | grep exports                                                                                                          |
| `redeemCoupon` duplicate/maxRedemptions check cited at `:711-727`                                                | actual `658-674`                                                                                                                  | Read                                                                                                                  |
| supabase RPC comment/topUp-stub cited `:34,37,266`                                                               | actual `41,44,502` (topUpGold func, not 266)                                                                                      | grep                                                                                                                  |
| Dependencies note: archive-pattern landing "paired design-fork finding" still open, whether it "actually landed" | **CLOSED** — built, applied prod, verified 2026-08-09 (today), design-fork 1.a picked, TASKS.md row 9/10 confirm, MEMORY item 179 | `.agents/rules/currency-ledger-retention.md` status header + migration `20260809090000_p_currency_ledger_archive.sql` |
| Done-criteria bullet: "archive pattern lands in same PR" framed as future condition                              | already fired-and-resolved, contract dated 2026-08-07 not re-synced                                                               | same as above                                                                                                         |

Verified clean otherwise (11 claims checked: `PlayerCurrency` shape, gold/gem 500/20 starting values, `earnGold` reject-amount lines `584-586` exact match, App.tsx:169 exact, lobbyBattleRewardPipeline.ts:163 exact, migration filename exact, gacha RPC source='gacha' negative-amount constraint confirmed, MEMORY/22-currency-system.md not-yet-created confirmed).

**(3) System state**
TASKS.md row 10: graduated 100%, but real gap stands — 22 unit tests hit dormant localStorage `accountRepository.ts`, not live `accountRepository.supabase.ts` (production path). Archive/retention work fully shipped today. Open structural gap (blueprint's own "Low-maintenance-cost" section): no `satisfies`/shared-type check catching export drift between the two backend files.

**(4) Questions**

1. Contract's stale line numbers (6 citations off by 7–50 lines) — should I refresh them on next dispatch, or leave since content/mechanism still verifies?
2. Untested production gap (Supabase RPC path has no test suite of its own, per contract's own Done-criteria note + TASKS.md row 9) — is that MY first dispatch, or blocked on #25 backend system owner?

---

## 23-gacha-system

_sid `7bbe291c-938b-4c34-987f-175c24725efb`_

All checks confirm. Blueprint matches reality — no discrepancies found.

## (1) Seat summary

OWNER of system 23 (gacha). Own: `gacha_banners`/`gacha_banner_pool`/`gacha_pity` config + `perform_gacha_pull` RPC logic, `GachaModal.tsx`, `accountRepository.supabase.ts::pullGacha`, gacha test suite. Never touch: currency ledger mutation internals (`accountRepository.ts` §8), hero stat/kit data (`characters.ts`), star-ascension math (system 15), shop/purchase UI (system 24). SENSITIVE seat — no delegate-down, opus floor on RPC/migration touches. Gated by QC seat (opus·xhigh), mandatory statistical suite + security lens on any RPC touch.

## (2) BLUEPRINT CHECK

| Contract claim (file:line) | Reality                                                                                                                                                                                                                                                                                                                                                                      | Verdict |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| all                        | verified clean — 9 claims checked (RPC migration exists w/ correct rates/pity/cost, row locks, `for update`; `gachaEngine.ts`/`gachaService.ts` deleted; `GachaPullResult` at accountRepository.shared.ts; `pullGacha` wired to RPC; MainNavigation summon nav wired; GachaModal.tsx exists; integration+component test files exist; currency source-check migration exists) | matches |

Empty table — no discrepancies found.

## (3) System state

Shipped, server-authoritative, live since P9 (production-verified per contract 2026-08-10). Standard Banner config confirmed live in migration: 5 heroes, 5%/25%/70% rarity, pity 30, cost 100/900 gem. No open bugs surfaced this pass — read-only study only, didn't run test suite.

## (4) Questions

1. `MEMORY/23-gacha-system.md` ยังไม่มี — สร้างตอน dispatch แรกใช่ไหม (ตาม the local workflow doc lazy-row rule)?
2. Known scars ข้อ 2 (double-grant dedup) บอกว่า "future server-authority phase" — ตอนนี้ server-authority shipped แล้ว (P9) dedup ผ่าน `request_id` idempotency ใน RPC จริงไหม ต้อง verify เพิ่มไหม หรือถือว่าปิดเคสแล้ว?

---

## 24-monetization-shop-system

_sid `3281438e-3903-4176-8f7c-5aeebad617f6`_

MEMORY/ has no system-24 file yet, confirms this is the first dispatch. No TASKS.md row for monetization currently claimed. Study done — reporting back.

**Seat summary**
System owner of system 24 (monetization/shop). Own: `CurrencyShopModal.tsx`, `GOLD_PACKAGES`/`GEM_PACKAGES` catalog in `accountRepository.shared.ts`, and the `topUpGold`/`topUpGems` call path wired at `TopBar.tsx:114-120`. Never touch: currency ledger/`earnGold`/`redeemCoupon` (system 22), gacha mechanics (23), or a real payment gateway/new SKU-pricing — those are owner+legal only, agent work is a red line. Gated by a spawned `QC seat` seat (opus·xhigh) per dispatch; standing headcount is 2 (system owner + QC), no split.

**BLUEPRINT CHECK** — 8 claims checked, 2 discrepancies found:

| Contract says                                                                                            | Reality                                                                                                 | Evidence                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `CurrencyResult` type at `accountRepository.shared.ts:57-58`                                             | Actually at lines 66-67                                                                                 | Read confirmed content matches (`{ok:true; player; amount} \| {ok:false; error}`) but line numbers drifted ~8-9 lines     |
| §7 lock ("Secondary... TBD", "must not sell power directly") cited as `MASTER_BLUEPRINT_v3.0.md:471-472` | That range is actually §6.1 PvP ranked-mode lock, unrelated. Real monetization lock is at lines 493-494 | Read lines 465-479 (PvP content) vs grep hit at 493-494 (the actual "Secondary (later)... Must not sell best power" text) |

Everything else checked clean: `GOLD_PACKAGES`/`GEM_PACKAGES` (44-62, content matches), `CurrencyShopModalProps` (16-21, exact), `TopBar.tsx:114-120` wiring (exact), Supabase stub `accountRepository.supabase.ts:501-507` (exact, confirmed always-fail), local demo backend `accountRepository.ts:600-642` (exact, confirmed unconditional credit, no payment check).

**System state**
Shop UI is a working demo shell — package catalog + modal + local backend credit path all function, but zero real money ever moves: Supabase (prod) stub always fails, local backend credits unconditionally with no verification. No payment gateway decided (fork issue #19 open). No TASKS.md row or MEMORY/24-*.md file exists yet — this dispatch would be the first real claim on this system.

**Questions**

1. The two blueprint line-citation drifts above — worth a quick doc-fix dispatch now, or defer until real work lands on this file?
2. Any signal yet on which payment gateway/distribution channel (web vs. app-store) fork issue #19 is leaning toward, or is that still fully open?

---

## 25-backend-server-authority-system

_sid `56ad0a85-fd98-4122-b95b-f227ba368eb1`_

Onboarding done. Study complete, no edits made.

**(1) Seat summary**
System owner of system 25 — backend/server-authority: auth+session, profile+child records (currency, characters, team slots, inventory, friends, battle history), and the server-authority boundary (RPC vs client-write) for currency/item/character grants. Two repos: `accountRepository.ts` (localStorage, dormant per its own header comment — `useAuth.ts` no longer imports it) and `accountRepository.supabase.ts` (live path). Do NOT own: combat resolution, PvP MMR/netcode, gacha roll math (owned by #23, I only host its RPC call site), payment gateway, hero stat formulas. SENSITIVE THROUGHOUT — no delegate-down, opus floor on auth/RLS/migration touches, CoalBoard gate on RLS/policy changes, `SECURITY.md` same-commit. Gated by spawned QC (QC seat), never self-gate. Host file `accountRepository.supabase.ts` carries 5+ other systems' wrappers — edits near foreign symbols route to main as seam.

**(2) BLUEPRINT CHECK** — 11 claims checked

| Contract says                                                                                | Reality                                                                                                                                                                                                       | Evidence                                                                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Done-criterion #4: shared interface "still the right fix," framed as open/future deliverable | Already shipped. `accountRepository.shared.ts:156` defines `AccountRepositorySubset`; both files satisfy it via `assertion:` blocks, `importSave`/`exportSave` explicitly excluded per the file's own comment | `accountRepository.shared.ts:151-177`, `accountRepository.ts:786`, `accountRepository.supabase.ts:769` |
| `importSave` at `accountRepository.ts:548`                                                   | Actual line 497                                                                                                                                                                                               | grep confirmed                                                                                         |
| `exportSave` stub at `accountRepository.supabase.ts:333-334`                                 | Actual lines 761-765 (file grew ~430 lines since citation written)                                                                                                                                            | Read confirmed                                                                                         |
| (not mentioned in contract) system state                                                     | TASKS.md shows DF9 already GRADUATED 100%, 2026-08-09, PR #76 — contract's "gap is coverage" framing predates this                                                                                            | `TASKS.md:48`                                                                                          |

Clean (exact match, no drift): `useAuth.ts:2` imports `.supabase` ✓ · `pullGacha`/`perform_gacha_pull` at `accountRepository.supabase.ts:161-192` ✓ exact · `topUpGold`/`topUpGems` stub at `502-507` ✓ exact · `currency_source_match` CHECK at `0001_init.sql:76-80` ✓ exact · no INSERT policy on `currency_transactions`, `0001_init.sql:91-115` ✓ exact · all named migration/test files exist (`0001_init.sql`, `0002_grant_character_rpc.sql`, `20260809073000_p9_gacha_server_authority.sql`, `accountRepository.test.ts`, `accountRepository.supabase.test.ts`, `chatStorage.test.ts`, 4 `*.integration.test.ts` files).

**(3) System state**
Graduated 100% (DF9, PR #76) — 6 PGLite integration tests + 20 Supabase repo tests, 3 PoE scars covered (retry idempotency, concurrent serialization, atomic bounded grants). Open real gap: `accountRepository.ts` vs `.supabase.ts` still don't export the same function set (`importSave` local-only, `exportSave` supabase-only stub) — contract is right that this is unresolved, just wrong on where the line numbers sit and wrong that the interface work is still pending.

**(4) Questions**

1. Contract's done-criterion #4 reads stale (describes shipped work as a future deliverable) — should I correct the contract doc myself, or flag it to you and wait, given contract edits are "security-grade" per the local workflow doc §6?
2. `MEMORY/25-backend-server-authority-system.md` doesn't exist yet (expected, lazy-born) — confirm the exact filename convention before I create it on first dispatch (registry says `MEMORY/NN-<system>.md`, contract's own filename is `25-backend-server-authority-system.md` — same slug, just checking no shorthand preferred)?

---

## 26-control-input-system

_sid `c999be6c-9120-441d-bcb5-e1611a0cf206`_

ยืนยันครบแล้ว ไม่แก้ไฟล์ไหนเลย ตามที่สั่ง read-only.

**(1) Seat summary**
ผม = system owner system 26 (control-input) — เก็บ `InputSystem.ts`, `playerInput.ts`, `joystickMath.ts`, `combatUILayout.ts` เท่านั้น. ไม่แตะ: HUD render (ใช้ `layoutCssVars()` แต่ไม่ own มัน), combat resolution (`RealtimeBattleRuntime.ts`), `combatFacing.ts` derivation, `useExploration.ts` (dead code — ไม่เกี่ยว). Gate ผม = spawned QC (opus/xhigh) ต่อ dispatch, ไม่ใช่ main. Seam (call site คนอื่นแตะไฟล์ผม) — main ทำ แต่ผมเป็น gate ให้ seam นั้น. MEMORY/26-control-input-system.md ยังไม่มี (สร้างตอน dispatch แรกจริง).

**(2) BLUEPRINT CHECK**

| Claim (contract)                                                                                               | File:line cited        | Reality                                                                                                                                                                   | Verdict                                                           |
| -------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `getMoveVector()`/`getMovementInput()` dead-zone/normalize/joystick-precedence — cited `InputSystem.ts:95-109` | 95-109                 | จริงคือ 95-97=`setMovementInput`, 99-101=`getMovementInput`, 103-117=`getMoveVector` (joystick-check บรรทัด104-106, held-key loop ถึง117) — range ตัดจบก่อนฟังก์ชันจบจริง | discrepancy เล็ก, ไม่กระทบ behavior claim, แค่ line-range ไม่เป๊ะ |
| `useRealtimeBattle.ts:132-135` consumer contract                                                               | 132-135                | ตรงเป๊ะ: `created?.setMoveInput(input.getMoveVector())` → `consumeAttack()`→`consumeSkill()`→`runtime.step()`                                                             | ✅ ตรง                                                            |
| `skills.ts:10` SkillSlot type                                                                                  | 10                     | ตรงเป๊ะ                                                                                                                                                                   | ✅ ตรง                                                            |
| `joystickMath.ts:7-16` dead-zone clamp                                                                         | 7-16                   | ตรงเป๊ะ (`applyJoystickDeadZone`)                                                                                                                                         | ✅ ตรง                                                            |
| `useExploration.ts` dead-code claim + line 152-153 (blur comment) vs 51-53 (Set comment)                       | 51-53, 152-153         | ตรงเป๊ะทั้งคู่ — คอมเมนต์คนละเรื่องจริง                                                                                                                                   | ✅ ตรง                                                            |
| Done-criterion 4 FIFO test "commit 2f417fc"                                                                    | —                      | เทสต์มีจริง ("Done-criterion 4" ในไฟล์), ไม่ verify commit hash (นอก scope read-only เร็ว)                                                                                | ⚠️ unverified (hash เดียว, ไม่กระทบ)                              |
| Registry: "~550 lines one kind"                                                                                | the seat roster row 55 | รวมจริง 145+42+26+250 = 463 บรรทัด (ไม่รวมเทสต์ 209)                                                                                                                      | ใกล้เคียง, ประมาณการหลวม ไม่ใช่ error                             |

Checked 7 claims — 5 ตรงเป๊ะ, 1 line-range คลาดเคลื่อนเล็กน้อยไม่กระทบสาระ, 1 ตัวเลขบรรทัดประมาณการหลวม. ไม่มี discrepancy ระดับกระทบงาน.

**(3) System state**
Done-criteria 1-4 มีเทสต์ยืนยันครบ (`InputSystem.test.ts` 209 บรรทัด รวม Scar 1-3 tests). §3.3 keybind/geometry lock ยังไม่เจอ diff แปลกปลอม. Open: Scar 2/3's Celeste source citation ยัง `⚠️ unverified` (celestegame.com เข้าไม่ได้) — ไม่ใช่ bug แค่ sourcing gap.

**(4) Questions**

1. Line-range เล็ก ๆ ใน contract (`InputSystem.ts:95-109`) แก้เลยตอน dispatch แรกไหม หรือปล่อยไว้เพราะไม่กระทบสาระ?
2. Registry บอก headcount "2 — system owner + QC ไม่ split" — ยืนยันว่าผมทำงานคนเดียว+QC สปอนใหม่ทุก dispatch ไม่มี sub-pipeline ภายในระบบนี้ ใช่ไหม?

---

## 27-error-observability-system

_sid `0ada56c7-1c10-441f-a270-747631a12740`_

Studied contract, registry row, the workflow doc, and cross-checked every file:line claim against actual source (`codes.ts`, `reportError.ts`, `globalErrorHandlers.ts`, `ErrorBoundary.tsx`, `GlobalErrorBanner.tsx`, `main.tsx`, `.oxlintrc.json`, `package.json`, `useDeployWatcher.ts`, `accountRepository.ts`, `observability.md`). No edits made.

**(1) Seat summary**
ผมคือ system owner ระบบ 27 (error/observability) — คุมทะเบียน `ErrorCode` (`codes.ts`), จุดรวม log/report เดียว (`reportError()`), pub/sub visible-error relay, สองจอที่โชว์ error ให้ผู้เล่นเห็น (`ErrorBoundary`, `GlobalErrorBanner`), และตาข่ายจับ exception นอก React (`globalErrorHandlers.ts`). ไม่แตะ: external telemetry/APM (ปฏิเสธแล้ว), WebGL/WebGPU recovery logic เอง, toast ที่ไม่ใช่ error, retry/fallback ของแต่ละ caller. งาน seam (call site ในไฟล์ระบบอื่น) เป็นของ main แต่ผม gate ส่วน seam ที่แตะไฟล์ผม. Gate ผม = spawned QC (opus·xhigh) เสมอ, ไม่ใช่ main.

**(2) BLUEPRINT CHECK**

| Contract claim                                                                                                                                                                                                                           | File:line | Reality                               | Verdict                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------- | ------------------------------------------ |
| ทุกอย่างที่ตรวจ (codes.ts registry ranges, reportError.ts mechanism, ErrorBoundary buttons/backup, GlobalErrorBanner OWNED_BY_ANOTHER_SCREEN, main.tsx:11 wiring, oxlint no-console+deny-warnings, observability.md:42-45/70 stale-flag) | multiple  | ตรงทั้งหมด                            | ✅ clean                                   |
| "economy/save codes at `codes.ts:40-54`" includes `SAVE_IMPORT_PARSE_FAIL`                                                                                                                                                               | codes.ts  | ตัวจริงอยู่บรรทัด 58 (นอกช่วงที่อ้าง) | ⚠️ minor line-range drift, ไม่กระทบเนื้อหา |

**Verified clean, 19 claims checked** — จุดเดียวที่หลุดคือ line-range เล็กน้อย ไม่ใช่ fact ผิด.

**(3) System state**
โค้ดสอดคล้อง contract เกือบสมบูรณ์แบบ (done-criteria 1-6 ตรงจริงหมด รวมถึงจุดที่ contract เตือนว่า `observability.md:70` ล้าสมัยแล้ว — ตรวจแล้วล้าสมัยจริง ทั้ง `useDeployWatcher.ts`/`accountRepository.ts` route ผ่าน `reportError` ครบแล้ว). ไม่มี bare `console.*` หลุดนอกโฟลเดอร์ที่ยกเว้น. Test files (`GlobalErrorBanner.test.tsx`, `ErrorBoundary.test.tsx`) มีจริง.

**(4) Questions**

1. `.agents/rules/ecc/web/observability.md:70` ยังพูดถึง useDeployWatcher/accountRepository เป็น "exception ที่เหลือ" ทั้งที่แก้แล้ว — ผมแก้ doc บรรทัดนี้ได้เลยไหม (mechanical doc-sync, ไม่ใช่ code) หรือรอ dispatch แยก?
2. Codes.ts:40-54 citation drift (ข้อ 2 ในตาราง) เล็กน้อยพอจะเมิน หรืออยาก log ไว้ให้แก้ blueprint file รอบหน้า?

---

## 28-social-communication-system

_sid `3254203a-5eb9-43c8-bf31-6c64bd40f9b3`_

No MEMORY/28-*.md yet — confirms not yet created, as expected (born at first dispatch).

**(1) Seat summary**
System owner of system 28 — social/communication. Own: World Chat (Supabase-backed global text, Realtime, admin command grammar in `commands.ts`/`WorldChat.tsx`) and Friends (UID lookup, one-way snapshot add, `AddFriendModal`/`AddFriendPanel`). Never touch: guild/private chat (stubbed, unbuilt), reciprocal friend-request flow, report/takedown moderation — none exist. Seam edits into my files from other systems (`characters.ts` for `/givecharacter`, `accountRepository`) get gated by me even when main makes them. Gated by: spawned QC (opus·xhigh) per dispatch, per the seat roster.

**(2) BLUEPRINT CHECK**

| Contract claim                                                                                                                 | File:line cited | Reality                                                                                                         | Verdict |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| All file:line citations (message schema, RLS, rate limit, FriendCandidate type, handleAdd, friends `.map()`, no cross-imports) | multiple        | Every citation checked matches source exactly or within 1 line (harmless drift, e.g. `47-71` vs actual `47-72`) | clean   |

Verified clean — 11 claims checked (message table+RPC shape, 10/min rate limit, RLS policies, `friends` table lines 55-60/112-113, `FriendCandidate` type lines 62-67, `onPlayerChange`/`handleAdd` signatures, `friends: .map()` at line 117, `commands.ts` import/function lines, admin-gate test presence, zero cross-imports outside `LobbyPage.tsx`). No stale claims found.

**(3) System state**
World Chat and Friends are both live and server-authoritative (Realtime wired, RLS closed, rate limiter active). Guild/private chat tabs are inert placeholders ("เร็ว ๆ นี้"). Open scar per contract: friend-add's two-outcome toast (success/generic-error) can't distinguish a real capacity/limit failure from plain persistence failure — not yet tested.

**(4) Questions**

1. Should I write the pinned "capacity-vs-persistence-failure" test from the Guardian Tales scar now, or wait for an actual dispatch?
2. Any near-term plan to build reciprocal friend requests or guild chat that I should watch `TASKS.md` for, or is this system dormant until then?

---

## Main resolution note (post-collection, 2026-08-09)

System owners 19 and 20 CONTRADICT each other on whether rankedNormalization has a production caller.
Main verified directly: **19 is right, 20 is wrong** - supabase/functions/pvp-authority/index.ts:10,195-196
imports and calls createRankedPlayerEntity. 20 grepped src/ only and missed the Deno Edge Function tree.
Consequence: contract 19 line 7, the seat roster, and TASKS.md row 26 all carry the same stale claim - HELD with the rest.
