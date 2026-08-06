import { getEnemyTemplate, type RealtimeEnemyTemplate } from './stageConfig'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * สมองของศัตรู — ตัดสินใจอย่างเดียว ไม่ขยับตัวเอง
 *
 * เหตุผลที่แยกแบบนี้: ระบบเดินมีอยู่แล้วและถูกเทสต์ไว้แล้ว (MovementSystem) การให้ AI
 * ไปเขียนโค้ดขยับตำแหน่งเองจะกลายเป็นระบบเดินชุดที่สองที่กฎไม่ตรงกัน (ขอบห้อง การชนกัน)
 * AI จึงมีหน้าที่แค่ "อยากไปทางไหน" แล้วคืนเวกเตอร์ให้ผู้เรียกส่งต่อ stepMovement
 *
 * วงจรตามสเปกข้อ 19:
 *   Spawn → Idle → Detect Player → Chase → Attack → Recover → Chase → Dead
 */

export type EnemyAIState = 'idle' | 'chase' | 'attack' | 'recover' | 'hit' | 'dead'

/**
 * จังหวะของท่าโจมตีศัตรู (มิลลิวินาที)
 *
 * ค่าอยู่ที่เดียวทั้งหมด — ระบบดาเมจในงานถัดไปจะอ่านจากตรงนี้เพื่อรู้ว่า "ช่วงไหนคือ
 * active frame ที่ทำอันตรายได้จริง" ตามข้อห้ามของสเปกข้อ 13 ที่ว่าดาเมจต้องไม่เกิดทันที
 * ตอนเริ่มท่า
 */
export const ENEMY_ATTACK_TIMING = {
  startupMs: 320,
  activeMs: 140,
  recoveryMs: 420,
} as const

const ATTACK_TOTAL_MS =
  ENEMY_ATTACK_TIMING.startupMs + ENEMY_ATTACK_TIMING.activeMs + ENEMY_ATTACK_TIMING.recoveryMs

/** สถานะเฉพาะของศัตรูที่ไม่ได้อยู่ใน RealtimeBattleEntity (entity เป็นข้อมูลกลางของทุกฝ่าย) */
export interface EnemyBrain {
  state: EnemyAIState
  /**
   * เวลาที่อยู่ในสถานะปัจจุบันมาแล้ว
   *
   * ระบบดาเมจในงานถัดไปใช้ค่านี้คู่กับ ENEMY_ATTACK_TIMING เพื่อรู้ว่าอยู่ใน active frame
   * หรือยัง — ไม่ต้องเก็บ timestamp แยกอีกตัว
   */
  stateElapsedMs: number
  /**
   * ผู้เล่นที่โดนท่านี้ไปแล้ว — กัน hitbox เดียวกันโดนซ้ำในท่าเดียว (§15)
   *
   * ล้างเมื่อออกจากสถานะ attack ไม่ใช่ตอนเข้า เพราะ active frame กินหลายเฟรมจำลอง
   */
  hitTargets: Set<string>
}

export function createEnemyBrain(): EnemyBrain {
  return { state: 'idle', stateElapsedMs: 0, hitTargets: new Set() }
}

export interface EnemyDecision {
  /** ทิศที่อยากเดินไป — ศูนย์คือหยุดอยู่กับที่ */
  move: Vec2
}

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function toState(brain: EnemyBrain, next: EnemyAIState): void {
  if (brain.state === next) return
  brain.state = next
  brain.stateElapsedMs = 0
}

/**
 * เดินสมองของศัตรูหนึ่งตัวไปหนึ่ง tick
 *
 * แก้ `brain` และ `enemy.state` โดยตรง (mutable ตามสถาปัตยกรรมของ runtime)
 * แล้วคืนทิศที่อยากเดิน ให้ผู้เรียกเอาไปป้อน stepMovement
 */
export function stepEnemyAI(
  enemy: RealtimeBattleEntity,
  brain: EnemyBrain,
  player: RealtimeBattleEntity,
  deltaMs: number,
): EnemyDecision {
  brain.stateElapsedMs += deltaMs

  // ตายแล้วหยุดทุกอย่าง ไม่คิด ไม่เดิน ไม่โจมตี (§19)
  if (enemy.hp <= 0 || enemy.state === 'dead') {
    toState(brain, 'dead')
    enemy.state = 'dead'
    return { move: { x: 0, y: 0 } }
  }

  // โดนตีจนเซ = ขยับไม่ได้ และท่าโจมตีที่ค้างอยู่ถูกยกเลิก
  if (enemy.hitStunRemainingMs > 0) {
    toState(brain, 'hit')
    enemy.state = 'hit'
    return { move: { x: 0, y: 0 } }
  }

  const template = enemy.enemyId ? getEnemyTemplate(enemy.enemyId) : null
  const ranges = resolveRanges(template)
  const distance = distanceBetween(enemy.position, player.position)
  const playerAlive = player.hp > 0

  switch (brain.state) {
    case 'attack': {
      // อยู่ในท่าโจมตี: หยุดเดินจนกว่าจะจบท่า (§19 หยุดเดินขณะโจมตี)
      enemy.state = 'attack'
      if (brain.stateElapsedMs >= ATTACK_TOTAL_MS) toState(brain, 'recover')
      return { move: { x: 0, y: 0 } }
    }

    case 'recover': {
      enemy.state = 'idle'
      if (brain.stateElapsedMs >= RECOVER_MS) {
        toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'hit': {
      // พ้นอาการเซแล้วกลับไปไล่ต่อทันที
      toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      enemy.state = 'idle'
      return { move: { x: 0, y: 0 } }
    }

    case 'chase': {
      if (!playerAlive || distance > ranges.detect) {
        toState(brain, 'idle')
        enemy.state = 'idle'
        return { move: { x: 0, y: 0 } }
      }

      if (distance <= ranges.attack && enemy.attackCooldownRemainingMs <= 0) {
        toState(brain, 'attack')
        enemy.state = 'attack'
        enemy.attackCooldownRemainingMs = ranges.attackCooldownMs
        return { move: { x: 0, y: 0 } }
      }

      // เข้าใกล้พอแล้วแต่ยังคูลดาวน์อยู่ = ยืนรอ ไม่เบียดทับผู้เล่น
      if (distance <= ranges.attack) {
        enemy.state = 'idle'
        return { move: { x: 0, y: 0 } }
      }

      enemy.state = 'walk'
      return { move: directionTowards(enemy.position, player.position) }
    }

    case 'idle':
    case 'dead':
    default: {
      enemy.state = 'idle'
      if (playerAlive && distance <= ranges.detect) toState(brain, 'chase')
      return { move: { x: 0, y: 0 } }
    }
  }
}

/** เวลาพักหลังจบท่าโจมตี ก่อนกลับไปไล่ใหม่ */
const RECOVER_MS = 260

/** ค่าเริ่มต้นเมื่อไม่พบแม่แบบศัตรู — ยังเล่นต่อได้แทนที่จะพังทั้งห้อง */
const FALLBACK_RANGES = { detect: 500, attack: 80, attackCooldownMs: 1500 }

function resolveRanges(template: RealtimeEnemyTemplate | null) {
  if (!template) return FALLBACK_RANGES
  return {
    detect: template.detectRange,
    attack: template.attackRange,
    attackCooldownMs: template.attackCooldownMs,
  }
}

function directionTowards(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: 0, y: 0 }
  return { x: dx / length, y: dy / length }
}
