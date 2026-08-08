import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * Explicit target-lock helpers for skills that opt into `targetLock: 'nearest'`.
 * Basic attacks never call this module to change facing (§3.3/§3.6.1).
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
