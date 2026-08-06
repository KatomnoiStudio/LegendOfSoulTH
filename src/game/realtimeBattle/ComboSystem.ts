import {
  COMBO_CONFIG,
  isActiveWindow,
  PLAYER_ATTACK_CHAIN,
  totalDurationMs,
  type AttackDefinition,
} from './attacks'
import type { RealtimeBattleEntity } from './types'

/**
 * คอมโบสามไม้ของผู้เล่น (§14)
 *
 * แทนที่ PlayerCombatSystem เดิมที่รองรับท่าเดียว — ตรรกะ "ท่าไหนกำลังเล่นอยู่ / โดนใครแล้ว"
 * ยังเหมือนเดิม สิ่งที่เพิ่มคือสามอย่างที่ทำให้กดแล้วรู้สึกดี:
 *
 *   1. Combo window  — กดภายในหน้าต่างนี้ต่อไม้ถัดไป กดช้าเกินไปเริ่มใหม่ที่ไม้แรก
 *   2. Input buffer  — กดก่อนท่าปัจจุบันจบนิดหน่อยก็ยังนับ ระบบจำไว้ยิงต่อให้
 *                      (ไม่มีตัวนี้ ผู้เล่นต้องกดตรงเป๊ะระดับเฟรม ซึ่งไม่มีใครทำได้)
 *   3. Hit stop      — หยุดเวลาแวบหนึ่งตอนหมัดเข้า ให้รู้สึกว่ามีน้ำหนัก
 *
 * กฎที่ต้องคงไว้: **กดรัวต้องไม่ข้าม recovery** — buffer ทำให้กด "ล่วงหน้า" ได้
 * แต่ไม่ได้ทำให้ท่าถัดไปเริ่มเร็วกว่าที่ท่าปัจจุบันจะจบ
 */

export interface ComboState {
  /** ไม้ที่กำลังเล่น (null = ไม่ได้อยู่ในท่าโจมตี) */
  attack: AttackDefinition | null
  /** ลำดับไม้ถัดไปในคอมโบ (0 = เริ่มใหม่) */
  chainIndex: number
  sinceStartMs: number
  /** เวลาที่ผ่านไปนับจากจบท่าล่าสุด — ใช้ตัดสินว่าคอมโบหมดอายุหรือยัง */
  sinceLastFinishMs: number
  /** อินพุตที่กดค้างไว้รอท่าปัจจุบันจบ */
  bufferedInputAgeMs: number | null
  hitTargets: Set<string>
  /** เวลาที่ยังต้องหยุดนิ่งจาก hit stop */
  hitStopRemainingMs: number
}

export function createComboState(): ComboState {
  return {
    attack: null,
    chainIndex: 0,
    sinceStartMs: 0,
    sinceLastFinishMs: Number.POSITIVE_INFINITY,
    bufferedInputAgeMs: null,
    hitTargets: new Set(),
    hitStopRemainingMs: 0,
  }
}

export function isAttacking(combo: ComboState): boolean {
  return combo.attack !== null
}

/** ยกเลิกคอมโบทันที — ใช้เมื่อเริ่มสกิลหรือสถานะอื่นที่ต้องขัดจังหวะท่าโจมตี */
export function cancelCombo(player: RealtimeBattleEntity, combo: ComboState): void {
  combo.attack = null
  combo.chainIndex = 0
  combo.sinceStartMs = 0
  combo.sinceLastFinishMs = Number.POSITIVE_INFINITY
  combo.bufferedInputAgeMs = null
  combo.hitTargets.clear()
  combo.hitStopRemainingMs = 0
  if (player.state === 'attack') player.state = 'idle'
  player.velocity = { x: 0, y: 0 }
}

/** ไม้ที่กำลังเล่นอยู่เป็นไม้ที่เท่าไหร่ของคอมโบ (1-based) — ใช้กับ UI/เทสต์ */
export function currentComboStep(combo: ComboState): number {
  return combo.attack ? combo.chainIndex : 0
}

/** บันทึกว่าผู้เล่นกดปุ่มโจมตี — อาจเริ่มท่าทันที หรือถูกเก็บเข้า buffer */
export function pressAttack(player: RealtimeBattleEntity, combo: ComboState): void {
  if (player.state === 'dead' || player.hitStunRemainingMs > 0) return

  if (combo.attack === null) {
    beginNextAttack(player, combo)
    return
  }

  // อยู่ระหว่างท่า: เก็บไว้ก่อน แล้วยิงต่อให้เมื่อท่าปัจจุบันจบ
  combo.bufferedInputAgeMs = 0
}

function beginNextAttack(player: RealtimeBattleEntity, combo: ComboState): void {
  // ปล่อยนานเกินไป = คอมโบขาด กลับไปเริ่มไม้แรก
  if (combo.sinceLastFinishMs > COMBO_CONFIG.comboResetMs) combo.chainIndex = 0

  const attack = PLAYER_ATTACK_CHAIN[combo.chainIndex] ?? PLAYER_ATTACK_CHAIN[0]

  combo.attack = attack
  combo.sinceStartMs = 0
  combo.hitTargets.clear()
  combo.bufferedInputAgeMs = null
  // ไม้ถัดไปวนกลับไม้แรกเมื่อจบคอมโบ
  combo.chainIndex = (combo.chainIndex + 1) % PLAYER_ATTACK_CHAIN.length

  player.state = 'attack'
  player.velocity = { x: 0, y: 0 }
}

export interface ComboTick {
  hitboxActive: boolean
  attack: AttackDefinition | null
}

/**
 * เดินคอมโบไปหนึ่ง tick
 *
 * คืน `hitboxActive` เฉพาะช่วง active frame ของไม้ปัจจุบัน เหมือนเดิม
 */
export function stepCombo(
  player: RealtimeBattleEntity,
  combo: ComboState,
  deltaMs: number,
): ComboTick {
  // hit stop: เวลาในระบบต่อสู้หยุดชั่วขณะ แต่ไม่ได้หยุดทั้งเกม
  if (combo.hitStopRemainingMs > 0) {
    combo.hitStopRemainingMs = Math.max(0, combo.hitStopRemainingMs - deltaMs)
    return { hitboxActive: false, attack: combo.attack }
  }

  if (combo.bufferedInputAgeMs !== null) {
    combo.bufferedInputAgeMs += deltaMs
    // กดล่วงหน้านานเกินไปก็ทิ้ง ไม่ให้กลายเป็นโจมตีลอย ๆ ทีหลัง
    if (combo.bufferedInputAgeMs > COMBO_CONFIG.inputBufferMs) combo.bufferedInputAgeMs = null
  }

  if (!combo.attack) {
    combo.sinceLastFinishMs += deltaMs

    // มีอินพุตค้างอยู่และท่าเพิ่งจบ = ต่อคอมโบให้ทันที
    if (combo.bufferedInputAgeMs !== null && player.hitStunRemainingMs <= 0 && player.state !== 'dead') {
      beginNextAttack(player, combo)
      return { hitboxActive: false, attack: combo.attack }
    }
    return { hitboxActive: false, attack: null }
  }

  // โดนตีจนเซระหว่างท่า = ท่าถูกยกเลิกและคอมโบขาด
  if (player.hitStunRemainingMs > 0 || player.state === 'dead') {
    combo.attack = null
    combo.chainIndex = 0
    combo.hitTargets.clear()
    combo.bufferedInputAgeMs = null
    combo.sinceLastFinishMs = 0
    return { hitboxActive: false, attack: null }
  }

  combo.sinceStartMs += deltaMs
  const attack = combo.attack

  if (combo.sinceStartMs >= totalDurationMs(attack)) {
    combo.attack = null
    combo.hitTargets.clear()
    combo.sinceLastFinishMs = 0
    player.state = 'idle'

    if (combo.bufferedInputAgeMs !== null) beginNextAttack(player, combo)
    return { hitboxActive: false, attack: combo.attack }
  }

  player.state = 'attack'
  return { hitboxActive: isActiveWindow(attack, combo.sinceStartMs), attack }
}

/** เรียกเมื่อหมัดเข้าเป้า — ใส่ hit stop ให้รู้สึกถึงน้ำหนัก */
export function applyHitStop(combo: ComboState): void {
  combo.hitStopRemainingMs = COMBO_CONFIG.hitStopMs
}
