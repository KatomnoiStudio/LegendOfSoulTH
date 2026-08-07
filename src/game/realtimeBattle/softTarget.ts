import { COMBAT_DEFAULTS } from './combatMoveSchema'
import { faceTargetHorizontally } from './combatFacing'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * Soft target assist — nearest relevant living enemy, no hard lock-on UI.
 * Used for facing nudge and skill/ultimate target selection.
 */

export function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function findLivingEnemies(enemies: RealtimeBattleEntity[]): RealtimeBattleEntity[] {
  return enemies.filter((enemy) => enemy.hp > 0 && enemy.state !== 'dead')
}

/** Nearest living enemy within optional max range. */
export function findNearestLivingEnemy(
  from: Vec2,
  enemies: RealtimeBattleEntity[],
  maxRange = Number.POSITIVE_INFINITY,
): RealtimeBattleEntity | null {
  let best: RealtimeBattleEntity | null = null
  let bestDist = maxRange

  for (const enemy of findLivingEnemies(enemies)) {
    const dist = distanceBetween(from, enemy.position)
    if (dist < bestDist) {
      bestDist = dist
      best = enemy
    }
  }

  return best
}

/**
 * Nudge combat facing toward nearest enemy in assist range before attacks/skills.
 * Does not move the player or hard-lock camera.
 */
export function assistCombatFacing(
  player: RealtimeBattleEntity,
  enemies: RealtimeBattleEntity[],
  maxRange = COMBAT_DEFAULTS.softTargetAssistRange,
): RealtimeBattleEntity | null {
  const nearest = findNearestLivingEnemy(player.position, enemies, maxRange)
  if (!nearest) return null
  faceTargetHorizontally(player, nearest.position)
  return nearest
}

/** Resolve locked target — drops dead/out-of-range targets. */
export function resolveLockedTarget(
  lockedId: string | null,
  enemies: RealtimeBattleEntity[],
): RealtimeBattleEntity | null {
  if (!lockedId) return null
  const target = enemies.find((enemy) => enemy.id === lockedId)
  if (!target || target.hp <= 0 || target.state === 'dead') return null
  return target
}
