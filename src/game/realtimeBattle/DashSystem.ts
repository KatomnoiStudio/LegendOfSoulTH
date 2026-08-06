import { DASH_CONFIG } from './attacks'
import { directionVector } from './HitboxSystem'
import { clampToArena, normalizeVector } from './MovementSystem'
import type { RealtimeBattleStage } from './stageConfig'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * การพุ่งหลบ (§17)
 *
 * ระหว่างพุ่ง ผู้เล่นอยู่ยงคงกระพันช่วงสั้น ๆ — นี่คือกลไกหลักที่ทำให้เกมมีอะไรให้เล่น
 * มากกว่าการยืนตีสลับกัน: หลบให้ถูกจังหวะแล้วสวนกลับ
 *
 * i-frame สั้นกว่าเวลาพุ่งเล็กน้อย (170 จาก 220 ms) เพื่อไม่ให้พุ่งเข้าไปกลางวงศัตรู
 * แล้วรอดทุกครั้ง — ช่วงท้ายของการพุ่งยังโดนได้
 */

export interface DashState {
  /** เวลาที่ผ่านไปนับจากเริ่มพุ่ง (null = ไม่ได้พุ่งอยู่) */
  elapsedMs: number | null
  direction: Vec2
}

export function createDashState(): DashState {
  return { elapsedMs: null, direction: { x: 0, y: 0 } }
}

export function isDashing(dash: DashState): boolean {
  return dash.elapsedMs !== null
}

/**
 * เริ่มพุ่ง — คืน true ถ้าเริ่มได้จริง
 *
 * ทิศมาจากอินพุตที่กดอยู่ ถ้าไม่ได้กดอะไรใช้ทิศที่ตัวละครหันอยู่ (§17)
 */
export function startDash(
  player: RealtimeBattleEntity,
  dash: DashState,
  moveInput: Vec2,
  elapsedMs: number,
): boolean {
  if (player.state === 'dead') return false
  if (player.hitStunRemainingMs > 0) return false
  if (dash.elapsedMs !== null) return false
  if (player.dashCooldownRemainingMs > 0) return false

  const input = normalizeVector(moveInput)
  const direction =
    input.x === 0 && input.y === 0 ? directionVector(player.facing) : input

  dash.elapsedMs = 0
  dash.direction = direction

  player.state = 'dash'
  player.dashCooldownRemainingMs = DASH_CONFIG.cooldownMs
  player.invulnerableUntilMs = elapsedMs + DASH_CONFIG.invulnerableMs
  return true
}

/**
 * เดินการพุ่งไปหนึ่ง tick — ขยับตัวละครเองโดยไม่ผ่าน stepMovement
 *
 * ทำไมไม่ใช้ stepMovement: การพุ่งมีความเร็วคงที่ของตัวเองที่ไม่เกี่ยวกับ `speed` ของหน่วย
 * และต้อง **ทะลุตัวศัตรูไม่ได้แต่ไม่ถูกดันกลับ** — ยังคง clamp ขอบห้องเหมือนกันทุกกรณี
 * (§17 ห้าม dash ทะลุกำแพง)
 */
export function stepDash(
  player: RealtimeBattleEntity,
  dash: DashState,
  deltaMs: number,
  stage: RealtimeBattleStage,
): boolean {
  if (dash.elapsedMs === null) return false

  if (player.state === 'dead') {
    dash.elapsedMs = null
    return false
  }

  /*
    ก้าวสุดท้ายขยับเท่าเวลาที่เหลือจริง ไม่ใช่เต็ม deltaMs

    ก้าวคงที่ 60 Hz (16.67 ms) หารเวลาพุ่ง 220 ms ไม่ลงตัว ถ้าปล่อยให้ก้าวที่ล้นออกไป
    ถูกตัดทิ้งทั้งก้าว ระยะพุ่งจะสั้นกว่าที่ตั้งไว้และเปลี่ยนไปตามจังหวะที่เริ่มพุ่ง
    (วัดได้ 295 จาก 300 ตอนเขียนเทสต์) — ตัดเศษแบบนี้ทำให้ระยะคงที่เป๊ะทุกครั้ง
  */
  const remainingMs = Math.max(0, DASH_CONFIG.durationMs - dash.elapsedMs)
  const effectiveMs = Math.min(deltaMs, remainingMs)
  dash.elapsedMs += deltaMs

  if (effectiveMs > 0) {
    const speed = DASH_CONFIG.distance / (DASH_CONFIG.durationMs / 1000)
    const deltaSeconds = effectiveMs / 1000

    player.position = clampToArena(
      {
        x: player.position.x + dash.direction.x * speed * deltaSeconds,
        y: player.position.y + dash.direction.y * speed * deltaSeconds,
      },
      player.collisionRadius,
      stage,
    )
  }

  if (dash.elapsedMs >= DASH_CONFIG.durationMs) {
    dash.elapsedMs = null
    if (player.state === 'dash') player.state = 'idle'
    return false
  }

  player.state = 'dash'
  return true
}
