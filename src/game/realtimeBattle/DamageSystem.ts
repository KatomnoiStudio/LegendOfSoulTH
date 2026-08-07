import type { AttackDefinition } from './attacks'
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

  target.state = 'hit'
  target.hitStunRemainingMs = HIT_STUN_MS
  target.invulnerableUntilMs = elapsedMs + HIT_INVULNERABLE_MS

  // กระเด็นตามทิศที่ผู้โจมตีหันอยู่ ไม่ใช่ทิศจากผู้โจมตีไปเป้าหมาย
  // (ไม่งั้นตอนยืนซ้อนกันสนิทจะไม่มีทิศให้กระเด็น)
  const push = directionVector(attacker.facing)
  target.position = {
    x: target.position.x + push.x * attack.knockback,
    y: target.position.y + push.y * attack.knockback,
  }

  return { ...outcome, defeated: false }
}
