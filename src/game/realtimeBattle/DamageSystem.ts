import type { AttackDefinition } from './attacks'
import { applyCombatReaction, type ReactionOutcome } from './combatReaction'
import { COMBAT_DEFAULTS } from './combatMoveSchema'
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

/**
 * Knockdown/GetUp (§3.6.8/§3.6.12, §3.8.4) — ค่าเริ่มต้น เล่นทดสอบแล้วปรับ (ตามธรรมเนียมไฟล์นี้)
 *
 * KNOCKDOWN_DURATION_MS  : เวลานอนพื้นก่อนเริ่มลุก — สเปกไม่ได้ล็อกตัวเลข ใช้ค่าเริ่มต้นที่นี่
 * GET_UP_IFRAME_MS       : "getUp i-frames" — ล็อกไว้ที่ 200ms (§3.6.12 line 304)
 *
 * ผู้เล่นได้ invulnerable ตลอดสองช่วงนี้ต่อกันตั้งแต่โดนตี (ตั้งค่าเดียวจบใน applyDamage
 * ไม่ต้องมีจุดที่สองใน EnemyAISystem มาคอยแก้ invulnerableUntilMs ซ้ำ — one shared gate)
 */
export const KNOCKDOWN_DURATION_MS = COMBAT_DEFAULTS.knockdownMs
export const GET_UP_IFRAME_MS = COMBAT_DEFAULTS.getUpInvulnerableMs

/**
 * เป้าหมายนี้โดน Knockdown ได้ไหม — ยืมกันระหว่าง elite และ boss ไม่มี branch แยกต่อ tier
 * (Done-criterion #1) เช็คแค่ tier/entityType ไม่เช็คตัวเลขสเตตัส (กันเคส data-entry ที่ค่า
 * flat ของ normal สูงกว่า elite แล้วดันมี knockdown ทั้งที่ไม่ควร — ดู "Related caveat" ในสเปก)
 */
export function isKnockdownEligible(entity: RealtimeBattleEntity): boolean {
  return entity.tier === 'elite' || entity.entityType === 'boss'
}

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
