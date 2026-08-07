import type { CombatFacing, Direction8, Vec2 } from './types'

/**
 * ทิศโจมตีซ้าย/ขวา (Blueprint v3 P2) — แยกจากทิศเดิน 8 ทาง
 *
 * Movement ยังใช้ Direction8 สำหรับสไปรต์เดิน
 * Basic attack / melee hitbox ใช้ combatFacing เท่านั้น
 */

export function combatFacingFromDirection(facing: Direction8): CombatFacing {
  switch (facing) {
    case 'left':
    case 'up-left':
    case 'down-left':
      return 'left'
    case 'right':
    case 'up-right':
    case 'down-right':
      return 'right'
    default:
      return 'right'
  }
}

/** อ่านทิศซ้าย/ขวาจากเวกเตอร์เดิน — ถ้าเดินแนวตั้งล้วน คง fallback */
export function combatFacingFromVector(vector: Vec2, fallback: CombatFacing): CombatFacing {
  if (vector.x < -0.12) return 'left'
  if (vector.x > 0.12) return 'right'
  return fallback
}

export function horizontalKnockbackVector(facing: CombatFacing): Vec2 {
  return facing === 'right' ? { x: 1, y: 0 } : { x: -1, y: 0 }
}

/** หันหน้าโจมตีไปทางเป้าหมายบนแกน X */
export function faceTargetHorizontally(
  attacker: { position: Vec2; combatFacing: CombatFacing; facing: Direction8 },
  target: Vec2,
): void {
  const facing: CombatFacing = target.x >= attacker.position.x ? 'right' : 'left'
  attacker.combatFacing = facing
  attacker.facing = facing
}

export function applyCombatFacingFromMovement(
  entity: { combatFacing: CombatFacing },
  direction: Vec2,
): void {
  entity.combatFacing = combatFacingFromVector(direction, entity.combatFacing)
}
