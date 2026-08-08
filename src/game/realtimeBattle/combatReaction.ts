import type { AttackDefinition } from './attacks'
import { horizontalKnockbackVector } from './combatFacing'
import { COMBAT_DEFAULTS, resolveHitstunMs, resolveKnockdownMs } from './combatMoveSchema'
import { directionVector } from './HitboxSystem'
import type { CombatTier, RealtimeBattleEntity } from './types'
import type { DamageOutcome, RandomFn } from './DamageSystem'
import { calcDamage } from './DamageSystem'

export function resolveCombatTier(entity: RealtimeBattleEntity): CombatTier {
  if (entity.entityType === 'boss') return 'boss'
  return entity.combatTier
}

/** Normal mobs never knock down — only elite/boss when move allows. */
export function canApplyKnockdown(target: RealtimeBattleEntity, attack: AttackDefinition): boolean {
  if (!attack.knockdown) return false
  const tier = resolveCombatTier(target)
  return tier === 'elite' || tier === 'boss'
}

export interface ReactionContext {
  attacker: RealtimeBattleEntity
  target: RealtimeBattleEntity
  attack: AttackDefinition
  elapsedMs: number
  random: RandomFn
}

export interface ReactionOutcome extends DamageOutcome {
  knockedDown: boolean
}

/**
 * Damage + combat reaction — hitstun, knockback, optional knockdown/getUp lifecycle.
 * Authoritative: animation layers read entity.state only.
 */
export function applyCombatReaction(context: ReactionContext): ReactionOutcome {
  const { attacker, target, attack, elapsedMs } = context
  const outcome = calcDamage(context)

  target.hp = Math.max(0, target.hp - outcome.amount)

  if (target.hp <= 0) {
    target.state = 'dead'
    target.velocity = { x: 0, y: 0 }
    target.knockdownRemainingMs = 0
    target.getUpRemainingMs = 0
    return { ...outcome, defeated: true, knockedDown: false }
  }

  applyKnockback(attacker, target, attack)

  if (canApplyKnockdown(target, attack)) {
    target.state = 'knockdown'
    target.knockdownRemainingMs = resolveKnockdownMs(attack)
    target.getUpRemainingMs = 0
    target.hitStunRemainingMs = 0
    target.velocity = { x: 0, y: 0 }
    return { ...outcome, defeated: false, knockedDown: true }
  }

  target.state = 'hit'
  target.hitStunRemainingMs = resolveHitstunMs(attack)
  target.invulnerableUntilMs = elapsedMs + 120
  return { ...outcome, defeated: false, knockedDown: false }
}

function applyKnockback(
  attacker: RealtimeBattleEntity,
  target: RealtimeBattleEntity,
  attack: AttackDefinition,
): void {
  const push =
    attack.hitShape === 'horizontal'
      ? horizontalKnockbackVector(attacker.combatFacing)
      : directionVector(attacker.facing)
  target.position = {
    x: target.position.x + push.x * attack.knockback,
    y: target.position.y + push.y * attack.knockback,
  }
}

/** Tick knockdown → getUp → control restored. */
export function tickKnockdownState(
  entity: RealtimeBattleEntity,
  deltaMs: number,
  elapsedMs: number,
): void {
  if (entity.state === 'knockdown') {
    entity.knockdownRemainingMs = Math.max(0, entity.knockdownRemainingMs - deltaMs)
    if (entity.knockdownRemainingMs <= 0) {
      entity.state = 'getUp'
      entity.getUpRemainingMs = COMBAT_DEFAULTS.getUpMs
    }
    return
  }

  if (entity.state === 'getUp') {
    entity.getUpRemainingMs = Math.max(0, entity.getUpRemainingMs - deltaMs)
    if (entity.getUpRemainingMs <= 0) {
      entity.state = 'idle'
      entity.invulnerableUntilMs = elapsedMs + COMBAT_DEFAULTS.getUpInvulnerableMs
    }
  }
}

import { isCcLocked } from './statusEffects'

export function isControlLocked(entity: RealtimeBattleEntity): boolean {
  return (
    entity.hitStunRemainingMs > 0 ||
    entity.state === 'knockdown' ||
    entity.state === 'getUp' ||
    entity.state === 'dead' ||
    isCcLocked(entity)
  )
}
