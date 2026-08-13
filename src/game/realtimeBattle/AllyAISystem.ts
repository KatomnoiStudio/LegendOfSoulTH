import { faceTargetHorizontally } from './combatFacing'
import { ENEMY_ATTACK_MELEE } from './attacks'
import { applyCombatReaction } from './combatReaction'
import { findHitTargets } from './HitboxSystem'
import { clampToArena, stepMovement } from './MovementSystem'
import { findNearestLivingEnemy } from './softTarget'
import type { RealtimeBattleEntity, Vec2 } from './types'
import type { RealtimeBattleStage } from './stageConfig'

const ALLY_ATTACK_RANGE = 105

/**
 * AI ขั้นต่ำสำหรับ summon (§3.8.3) — **decision loop ของตัวเอง แต่ใช้กฎการต่อสู้ร่วมกับทุกคน**
 *
 * เดิมคอมเมนต์บรรทัดนี้เขียนว่า "ใช้ state machine เดียวกับศัตรู" ซึ่งไม่จริงมาตลอด: ที่นี่มี 3 state
 * (idle/walk/attack) ส่วน EnemyAISystem มี 6 และที่นี่ไม่มี telegraph เลยสักจุด — summon ที่เงื้อ
 * ก่อนฟันทุกครั้งจะช้าจนไม่มีประโยชน์ในฐานะตัวช่วย ความต่างนี้ตั้งใจ ไม่ใช่ของค้าง
 *
 * สิ่งที่ **ต้อง** ใช้ร่วม คือทุกกฎที่ diverge แล้วเกมจะแตกเป็นสองชุด — การเคลื่อนที่ ขอบสนาม
 * การหา hit target การรับดาเมจ การหันหน้า และท่าโจมตี ทั้งหมด import มาจากบ้านเดียวกับที่ศัตรูและ
 * ผู้เล่นใช้ ไม่ได้คัดลอกมา (`allyAiSharedPrimitives.test.ts` เป็นตัวบังคับข้อนี้)
 *
 * ตัดสินเป็น design-lock ข้อ 4.a (2026-08-13): การซ้ำที่เป็นปัญหาคือซ้ำ *กฎ* ไม่ใช่ *การตัดสินใจ*
 * ดู `docs/agent-blueprint/07-effects-system-non-damage.md` สำหรับที่มาและ exemplar
 */
export function stepAllyAI(
  ally: RealtimeBattleEntity,
  enemies: RealtimeBattleEntity[],
  stage: RealtimeBattleStage,
  deltaMs: number,
  elapsedMs: number,
  onHit: (target: RealtimeBattleEntity, amount: number) => void,
): void {
  if (ally.state === 'dead' || ally.hp <= 0) return

  const target = findNearestLivingEnemy(ally.position, enemies)
  if (!target) {
    ally.state = 'idle'
    ally.velocity = { x: 0, y: 0 }
    return
  }

  const dx = target.position.x - ally.position.x
  const distance = Math.abs(dx)

  if (distance > ALLY_ATTACK_RANGE) {
    const direction: Vec2 = { x: dx > 0 ? 1 : -1, y: 0 }
    stepMovement(ally, direction, deltaMs, { stage, blockers: enemies })
    ally.state = 'walk'
    faceTargetHorizontally(ally, target.position)
    return
  }

  ally.state = 'attack'
  ally.velocity = { x: 0, y: 0 }
  faceTargetHorizontally(ally, target.position)

  if (ally.attackCooldownRemainingMs > 0) {
    ally.attackCooldownRemainingMs = Math.max(0, ally.attackCooldownRemainingMs - deltaMs)
    return
  }

  const hits = findHitTargets([target], {
    attacker: ally,
    attack: ENEMY_ATTACK_MELEE,
    alreadyHit: new Set(),
    elapsedMs,
  })

  if (hits.length === 0) return

  const outcome = applyCombatReaction({
    attacker: ally,
    target,
    attack: ENEMY_ATTACK_MELEE,
    elapsedMs,
    random: () => 0.5,
  })
  target.position = clampToArena(target.position, target.collisionRadius, stage)
  onHit(target, outcome.amount)
  ally.attackCooldownRemainingMs = ENEMY_ATTACK_MELEE.recoveryMs + ENEMY_ATTACK_MELEE.startupMs
}
