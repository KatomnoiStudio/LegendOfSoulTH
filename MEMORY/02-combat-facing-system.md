# 02 — combat-facing-system (system-owner memory)

## Scope (from contract)

Own: `combatFacing.ts` (51 lines) — deriving/mutating `CombatFacing` (`'left'|'right'`, `types.ts:23`), separate from 8-way `Direction8` sprite facing (`types.ts:19-20,73`). Functions: `combatFacingFromDirection`, `combatFacingFromVector` (±0.12 deadzone), `horizontalKnockbackVector`, `faceTargetHorizontally`, `applyCombatFacingFromMovement`.
Never touch: hitbox shape/reach math (`HitboxSystem.ts`), sprite frame select (`EntitySprite.tsx`), knockback apply (`combatReaction.ts`), combo state (`ComboSystem.ts`), raw input capture (`RealtimeBattleRuntime.ts`).

## First work dispatch — 2026-08-10, citation-rot fix

Re-derived every file:line citation in `docs/agent-blueprint/02-combat-facing-system.md` against live tree (grep, not memory of onboarding notes). Corrected 8 stale citations, all pre-existing drift from refactors, none introduced by prior editors fabricating text:

- Scope: `types.ts:19-20,39,41` → `:19-20,73` (39/41 are `SkillCooldownSlot`/comment, unrelated to `Direction8`; `Direction8` only appears at def L19 and field L73 — `grep -n Direction8 types.ts`).
- Scope: `createRealtimeBattle.ts:47,96` → `:106,192,224` (L47=`PLAYER_BASE_SPEED`, L96=`statsAtStar(...)` call; real `combatFacing: 'right'/'left'` literals at 106/192/224 — matches what Dependencies section already had right).
- Scope + not-own: `EntitySprite.tsx:100` → `:120` (L100 = `group.current.visible = true`; `entity.facing` consumed at L120 inside `resolveBattleFrames(animation, entity.facing)`).
- Scope + Dependencies: `ComboSystem.ts:102` → `:100` (`player.facing = player.combatFacing` is at L100, both citations of it in the doc were off by 2).
- Scope: `RealtimeBattleRuntime.ts:162` → `:83,198` (L162 unrelated `this.playerSkill.definition &&`; `moveInput` field declared L83, `combatFacingFromVector(this.moveInput, ...)` call L198).
- Dependencies: `AGENT_BLUEPRINT.md:44` → `:55` (taxonomy entry 2 line, confirmed by grep).
- Dependencies: `MovementSystem.ts:131` → `:142` (`applyCombatFacingFromMovement(entity, direction)` call).
- Dependencies: `HitboxSystem.ts:48` → `:50` (`attacker.combatFacing === 'right' ? 1 : -1` is the actual facing consumption; L48 is the `dx` calc, off by 2).
- Done-criteria 2: `HitboxSystem.ts:51` → `:53` (the `dx * sign < -target.hurtboxRadius` guard line).

Untouched (verified correct, no edit needed): `types.ts:23,73,75`; `combatReaction.ts:68-81,73-76,75`; `EnemyAISystem.ts:262`; `AllyAISystem.ts:39,45`; `createRealtimeBattle.ts:106,192,224` (Dependencies copy was already right); `DamageSystem.ts` no `combatFacing.ts` import (delegates via `combatReaction.ts`); `combatFacingFromDirection` zero production callers repo-wide (grep confirms — only its own export line).

## Substance flag (NOT edited — citation-only dispatch, this is a design/content conflict for owner)

"Low-maintenance-cost design" section's grep claim is self-contradicting against the Scope section of the SAME doc: it states "`MovementSystem.ts`, `DamageSystem.ts`, and `EnemyAISystem.ts` each `import { fn } from './combatFacing'`" — but `grep -n "from './combatFacing'" DamageSystem.ts` returns nothing. `DamageSystem.ts` does NOT import from `combatFacing.ts` (only `MovementSystem.ts:1` and `EnemyAISystem.ts:8` do); this matches what the Scope section correctly says a few lines earlier ("`DamageSystem.ts` no longer imports from `combatFacing.ts` at all"). Flagging for owner design-lock, not editing — out of scope for a citation-accuracy pass.

## Lesson

Contract line-citations drift independently per section — the same real fact (e.g. `ComboSystem.ts` facing-lock line) was cited wrong in two different sections by the same offset, and one section's citation for `createRealtimeBattle.ts` was already correct while another section's was stale. Don't assume one correct citation elsewhere in the doc means all copies are correct — grep and check every occurrence separately.
