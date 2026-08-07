import type { AttackDefinition } from './attacks'
import { horizontalKnockbackVector } from './combatFacing'
import { directionVector } from './HitboxSystem'
import type { RealtimeBattleEntity } from './types'
import { ARMOR_MITIGATION, DAMAGE_VARIANCE, MINIMUM_DAMAGE } from '../battle/formulas'

/**
 * สูตรดาเมจของระบบเรียลไทม์ — แยกขาดจาก Turn Engine เดิม (§16)
 *
 * ── ทำไมต้องรับ RNG จากข้างนอก ──────────────────────────────
 * `src/game/battle/formulas.ts` ของระบบเทิร์นฝัง `Math.random()` ไว้กลางสูตร ทำให้
 * เขียนเทสต์ดาเมจไม่ได้เลย (audit ตอนเริ่ม migration บันทึกไว้เป็นข้อสังเกตข้อ 5)
 * ระบบใหม่จึงรับฟังก์ชันสุ่มเข้ามา เทสต์ป้อนค่าคงที่แล้วตรวจตัวเลขได้ตรง ๆ
 * ส่วนเกมจริงป้อน Math.random เข้าไปตามปกติ
 * ────────────────────────────────────────────────────────────
 */

export type RandomFn = () => number

/** โอกาสคริติคอลและตัวคูณ */
const CRITICAL_CHANCE = 0.12
const CRITICAL_MULTIPLIER = 1.6

/** เวลาที่เป้าหมายขยับไม่ได้หลังโดนตี */
const HIT_STUN_MS = 180

/** เวลาที่เป้าหมายอยู่ยงคงกระพันหลังโดนตี — กันโดนรัวจนขยับไม่ได้เลย */
const HIT_INVULNERABLE_MS = 120

/**
 * Knockdown/GetUp (§3.6.8/§3.6.12, §3.8.4) — ค่าเริ่มต้น เล่นทดสอบแล้วปรับ (ตามธรรมเนียมไฟล์นี้)
 *
 * KNOCKDOWN_DURATION_MS  : เวลานอนพื้นก่อนเริ่มลุก — สเปกไม่ได้ล็อกตัวเลข ใช้ค่าเริ่มต้นที่นี่
 * GET_UP_IFRAME_MS       : "getUp i-frames" — ล็อกไว้ที่ 200ms (§3.6.12 line 304)
 *
 * ผู้เล่นได้ invulnerable ตลอดสองช่วงนี้ต่อกันตั้งแต่โดนตี (ตั้งค่าเดียวจบใน applyDamage
 * ไม่ต้องมีจุดที่สองใน EnemyAISystem มาคอยแก้ invulnerableUntilMs ซ้ำ — one shared gate)
 */
export const KNOCKDOWN_DURATION_MS = 700
export const GET_UP_IFRAME_MS = 200

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
  /** เป้าหมายตายจากหมัดนี้ */
  defeated: boolean
}

export interface DamageContext {
  attacker: RealtimeBattleEntity
  target: RealtimeBattleEntity
  attack: AttackDefinition
  elapsedMs: number
  random: RandomFn
}

/** คำนวณดาเมจอย่างเดียว ไม่แก้ค่าใน entity — แยกไว้เพื่อให้เทสต์ตรวจตัวเลขได้ */
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

/**
 * ลงดาเมจจริงกับเป้าหมาย — แก้ค่าใน entity โดยตรง
 *
 * ผลข้างเคียงที่เกิดพร้อมกันเสมอ: เลือดลด → เซ (hit stun) → อยู่ยงชั่วครู่ → ถูกกระเด็น
 * → ถ้าเลือดหมดก็เปลี่ยนเป็นตาย ทั้งหมดอยู่ที่เดียวเพื่อไม่ให้มีเส้นทางที่ลืมทำบางข้อ
 */
export function applyDamage(context: DamageContext): DamageOutcome {
  const { attacker, target, attack, elapsedMs } = context
  const outcome = calcDamage(context)

  target.hp = Math.max(0, target.hp - outcome.amount)

  if (target.hp <= 0) {
    target.state = 'dead'
    target.velocity = { x: 0, y: 0 }
    return { ...outcome, defeated: true }
  }

  // ท่านี้ทำ knockdown ได้และเป้าหมาย eligible (elite/boss) = ล้มแทนที่จะแค่เซ (§3.6.8/§3.8.4)
  const knockedDown = Boolean(attack.knockdown) && isKnockdownEligible(target)

  target.state = knockedDown ? 'knockdown' : 'hit'
  target.hitStunRemainingMs = knockedDown ? KNOCKDOWN_DURATION_MS : HIT_STUN_MS
  target.invulnerableUntilMs = knockedDown
    ? elapsedMs + KNOCKDOWN_DURATION_MS + GET_UP_IFRAME_MS
    : elapsedMs + HIT_INVULNERABLE_MS

  // กระเด็นแนวนอนตาม combatFacing สำหรับ basic attack (P2) — radial ยังใช้ทิศ facing เดิม
  const push =
    attack.hitShape === 'horizontal'
      ? horizontalKnockbackVector(attacker.combatFacing)
      : directionVector(attacker.facing)
  target.position = {
    x: target.position.x + push.x * attack.knockback,
    y: target.position.y + push.y * attack.knockback,
  }

  return { ...outcome, defeated: false }
}
