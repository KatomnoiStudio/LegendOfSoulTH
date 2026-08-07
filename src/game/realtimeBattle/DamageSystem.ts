import type { AttackDefinition } from './attacks'
import { applyCombatReaction, type ReactionOutcome } from './combatReaction'
import type { RealtimeBattleEntity } from './types'
import { ARMOR_MITIGATION, DAMAGE_VARIANCE, MINIMUM_DAMAGE } from '../battle/formulas'

/**
 * สูตรดาเมจของระบบเรียลไทม์ — แยกขาดจาก Turn Engine เดิม (§16)
 */

export type RandomFn = () => number

const CRITICAL_CHANCE = 0.12
const CRITICAL_MULTIPLIER = 1.6

/** Locked P4 hitstun baseline */
export const HIT_STUN_MS = 200

export interface DamageOutcome {
  amount: number
  critical: boolean
  defeated: boolean
}

export interface DamageContext {
  attacker: RealtimeBattleEntity
  target: RealtimeBattleEntity
  attack: AttackDefinition
  elapsedMs: number
  random: RandomFn
}

export function calcDamage({ attacker, target, attack, random }: DamageContext): DamageOutcome {
  const variance = 1 - DAMAGE_VARIANCE + random() * (DAMAGE_VARIANCE * 2)
  const critical = random() < CRITICAL_CHANCE

  const base = attacker.atk * attack.damageMultiplier * variance
  const mitigated = base - target.def * ARMOR_MITIGATION
  const withCritical = critical ? mitigated * CRITICAL_MULTIPLIER : mitigated

  const amount = Math.max(MINIMUM_DAMAGE, Math.floor(withCritical))

  return {
    amount,
    critical,
    defeated: target.hp - amount <= 0,
  }
}

/** Applies damage + combat reaction (hitstun/knockback/knockdown). */
export function applyDamage(context: DamageContext): DamageOutcome {
  const result: ReactionOutcome = applyCombatReaction(context)
  return {
    amount: result.amount,
    critical: result.critical,
    defeated: result.defeated,
  }
}
