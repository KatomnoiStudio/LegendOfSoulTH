import { isActiveWindow, PLAYER_ATTACK, totalDurationMs, type AttackDefinition } from './attacks'
import type { RealtimeBattleEntity } from './types'

/**
 * สถานะท่าโจมตีของผู้เล่น
 *
 * เก็บแยกจาก entity เหมือน EnemyBrain เพราะ entity เป็นข้อมูลกลางที่ถูกคัดลอกลง snapshot
 * ทุกครั้งที่ publish — รายละเอียดภายในของท่าโจมตี (ใครโดนไปแล้วบ้าง) ไม่ควรไหลไปถึง React
 */
export interface PlayerCombatState {
  attack: AttackDefinition | null
  /** เวลาที่ผ่านไปนับจากเริ่มท่า */
  sinceStartMs: number
  /** id ของหน่วยที่โดนท่านี้ไปแล้ว — กัน hitbox เดียวกันโดนซ้ำ (§15) */
  hitTargets: Set<string>
}

export function createPlayerCombatState(): PlayerCombatState {
  return { attack: null, sinceStartMs: 0, hitTargets: new Set() }
}

/** กำลังอยู่ในท่าโจมตีอยู่หรือไม่ (ระบบเดินใช้ตรวจว่าควรลดความเร็วหรือหยุด) */
export function isAttacking(combat: PlayerCombatState): boolean {
  return combat.attack !== null
}

/**
 * เริ่มท่าโจมตี — คืน true ถ้าเริ่มได้จริง
 *
 * เริ่มไม่ได้เมื่อ: ตาย · กำลังเซจากการโดนตี · ยังอยู่ในท่าเดิม · ยังไม่พ้นคูลดาวน์
 * ทั้งหมดนี้คือเหตุผลที่กดรัวแล้วไม่ข้าม recovery (§14)
 */
export function startAttack(
  player: RealtimeBattleEntity,
  combat: PlayerCombatState,
): boolean {
  if (player.state === 'dead' || player.hitStunRemainingMs > 0) return false
  if (combat.attack !== null) return false
  if (player.attackCooldownRemainingMs > 0) return false

  combat.attack = PLAYER_ATTACK
  combat.sinceStartMs = 0
  combat.hitTargets.clear()

  player.state = 'attack'
  player.velocity = { x: 0, y: 0 }
  return true
}

export interface CombatTick {
  /** เฟรมนี้ hitbox มีผลจริงหรือไม่ */
  hitboxActive: boolean
  /** ท่าที่กำลังเล่นอยู่ (null = ไม่ได้อยู่ในท่าโจมตี) */
  attack: AttackDefinition | null
}

/**
 * เดินท่าโจมตีไปหนึ่ง tick
 *
 * จบท่าแล้วคืนผู้เล่นสู่สถานะ idle และตั้งคูลดาวน์ — ตัวคูลดาวน์นับถอยหลังโดย
 * `tickTimers` ของ runtime เหมือนหน่วยอื่นทุกตัว ไม่มีตัวจับเวลาแยกของตัวเอง (§8)
 */
export function stepPlayerCombat(
  player: RealtimeBattleEntity,
  combat: PlayerCombatState,
  deltaMs: number,
): CombatTick {
  if (!combat.attack) return { hitboxActive: false, attack: null }

  // โดนตีจนเซระหว่างเงื้อ = ท่าถูกยกเลิก
  if (player.hitStunRemainingMs > 0 || player.state === 'dead') {
    combat.attack = null
    combat.hitTargets.clear()
    return { hitboxActive: false, attack: null }
  }

  combat.sinceStartMs += deltaMs
  const attack = combat.attack

  if (combat.sinceStartMs >= totalDurationMs(attack)) {
    combat.attack = null
    combat.hitTargets.clear()
    player.state = 'idle'
    // คูลดาวน์สั้น ๆ หลังจบท่า กันกดรัวจนท่าติดกันเป็นพรืด
    player.attackCooldownRemainingMs = ATTACK_COOLDOWN_MS
    return { hitboxActive: false, attack: null }
  }

  player.state = 'attack'
  return { hitboxActive: isActiveWindow(attack, combat.sinceStartMs), attack }
}

/** ระยะพักหลังจบท่าก่อนกดใหม่ได้ */
const ATTACK_COOLDOWN_MS = 90
