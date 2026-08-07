import type { AttackDefinition } from './attacks'
import type { Direction8, RealtimeBattleEntity, Vec2 } from './types'

/**
 * ตรวจว่าใครโดน hitbox ของท่าโจมตีบ้าง (§15)
 *
 * P2 (Blueprint v3): basic attack = แนวนอนซ้าย/ขวา + depth tolerance
 * สกิล radial ยังใช้กรวยรอบทิศ facing (legacy ชั่วคราวจน P3)
 *
 * ── สองข้อห้ามของสเปกที่ไฟล์นี้เคารพ ────────────────────────
 * 1. ห้ามใช้ DOM bounding box ตัดสินการต่อสู้
 * 2. ห้ามอิงขนาดภาพ PNG เป็น hurtbox
 * ────────────────────────────────────────────────────────────
 */

/** เวกเตอร์หนึ่งหน่วยของแต่ละทิศ — y ชี้ลงล่างของจอตามระบบพิกัด runtime */
const DIRECTION_VECTORS: Record<Direction8, Vec2> = {
  up: { x: 0, y: -1 },
  'up-right': { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  right: { x: 1, y: 0 },
  'down-right': { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  down: { x: 0, y: 1 },
  'down-left': { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  left: { x: -1, y: 0 },
  'up-left': { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
}

export function directionVector(facing: Direction8): Vec2 {
  return DIRECTION_VECTORS[facing]
}

export interface HitboxQuery {
  attacker: RealtimeBattleEntity
  attack: AttackDefinition
  /** หน่วยที่โดนไปแล้วในท่านี้ — กันโดนซ้ำจาก hitbox เดียวกัน (§15) */
  alreadyHit: ReadonlySet<string>
  /** เวลาปัจจุบันของ runtime ใช้ตรวจ invulnerability */
  elapsedMs: number
}

function hitsHorizontal(
  attacker: RealtimeBattleEntity,
  attack: AttackDefinition,
  target: RealtimeBattleEntity,
): boolean {
  const dx = target.position.x - attacker.position.x
  const dy = target.position.y - attacker.position.y
  const sign = attacker.combatFacing === 'right' ? 1 : -1

  // เป้าหมายต้องอยู่ด้านหน้า (ไม่โดนด้านหลัง)
  if (dx * sign < -target.hurtboxRadius) return false

  const horizontalReach = Math.abs(dx) - target.hurtboxRadius
  if (horizontalReach > attack.range) return false

  const depthGap = Math.abs(dy) - target.hurtboxRadius
  return depthGap <= attack.depthTolerance
}

function hitsRadial(
  attacker: RealtimeBattleEntity,
  attack: AttackDefinition,
  target: RealtimeBattleEntity,
): boolean {
  const facing = directionVector(attacker.facing)
  const halfArcCos = Math.cos((Math.min(360, attack.arcDegrees) / 2) * (Math.PI / 180))
  const isFullCircle = attack.arcDegrees >= 360

  const dx = target.position.x - attacker.position.x
  const dy = target.position.y - attacker.position.y
  const distance = Math.hypot(dx, dy)

  if (distance > attack.range + target.hurtboxRadius) return false
  if (isFullCircle) return true
  if (distance === 0) return true

  const cosAngle = (dx * facing.x + dy * facing.y) / distance
  return cosAngle >= halfArcCos
}

/**
 * คืนรายชื่อหน่วยที่โดนท่านี้ในเฟรมนี้
 */
export function findHitTargets(
  targets: RealtimeBattleEntity[],
  { attacker, attack, alreadyHit, elapsedMs }: HitboxQuery,
): RealtimeBattleEntity[] {
  return targets.filter((target) => {
    if (target.id === attacker.id) return false
    if (target.state === 'dead' || target.hp <= 0) return false
    if (alreadyHit.has(target.id)) return false
    if (target.invulnerableUntilMs > elapsedMs) return false

    if (attack.hitShape === 'horizontal') {
      return hitsHorizontal(attacker, attack, target)
    }

    return hitsRadial(attacker, attack, target)
  })
}
