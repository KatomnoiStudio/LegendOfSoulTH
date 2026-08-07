import { describe, expect, it } from 'vitest'
import { DEFAULT_COMBAT_CAMERA_CONFIG } from './combatCameraConfig'
import {
  clampLookTarget,
  computeCameraPose,
  computeCameraRigLimits,
  computeCombatSpan,
  computeDesiredZoom,
  computeEnemyGroupFocus,
  computeLookTarget,
  smoothToward,
} from './combatCameraFraming'

describe('combatCameraFraming', () => {
  const config = DEFAULT_COMBAT_CAMERA_CONFIG
  const player = { x: -3.2, z: 0.4 }
  const enemyA = { world: { x: 2.8, z: 0.2 }, hp: 100, entityType: 'enemy' as const }
  const enemyB = { world: { x: 3.4, z: -0.6 }, hp: 80, entityType: 'enemy' as const }

  it('smoothToward eases toward target without overshooting in one frame', () => {
    const next = smoothToward(0, 1, 0.12, 1 / 60)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1)
  })

  it('computeEnemyGroupFocus prioritizes nearest living enemies', () => {
    const focus = computeEnemyGroupFocus(player, [enemyA, enemyB], config)
    expect(focus).not.toBeNull()
    expect(focus!.x).toBeGreaterThan(player.x)
  })

  it('computeLookTarget sits between player and enemy group', () => {
    const focus = computeEnemyGroupFocus(player, [enemyA], config)!
    const look = computeLookTarget(player, focus, config)
    expect(look.x).toBeGreaterThan(player.x)
    expect(look.x).toBeLessThan(focus.x)
  })

  it('computeDesiredZoom increases when combat span shrinks', () => {
    const closeZoom = computeDesiredZoom(2.5, 16 / 9, config, false)
    const farZoom = computeDesiredZoom(7.0, 16 / 9, config, false)
    expect(closeZoom).toBeGreaterThan(farZoom)
    expect(closeZoom).toBeLessThanOrEqual(config.maxZoom)
    expect(farZoom).toBeGreaterThanOrEqual(config.minZoom)
  })

  it('computeCombatSpan measures player-to-focus distance', () => {
    const focus = computeEnemyGroupFocus(player, [enemyA], config)!
    const span = computeCombatSpan(player, focus)
    expect(span).toBeGreaterThan(5)
  })

  it('computeCameraPose places camera behind look target on +Z', () => {
    const look = computeLookTarget(player, enemyA.world, config)
    const pose = computeCameraPose(look, 1, config)
    expect(pose.positionZ).toBeGreaterThan(pose.lookZ)
    expect(pose.positionY).toBeGreaterThan(0)
  })

  it('clampLookTarget respects arena limits', () => {
    const limits = computeCameraRigLimits(config, 16 / 9, 18, 10, 1)
    const clamped = clampLookTarget({ x: 99, z: 99 }, limits)
    expect(clamped.x).toBeLessThanOrEqual(limits.limitX)
    expect(clamped.z).toBeLessThanOrEqual(limits.limitZ)
  })
})
