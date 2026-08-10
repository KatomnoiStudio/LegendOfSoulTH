import { describe, expect, it } from 'vitest'
import {
  COMBAT_CAMERA_V082_BASELINE,
  COMBAT_CAMERA_VIEW_HEIGHT_BOOST,
  DEFAULT_COMBAT_CAMERA_CONFIG,
} from './combatCameraConfig'
import {
  clampLookTarget,
  computeCameraPose,
  computeCameraRigLimits,
  computeCombatSpan,
  computeDesiredZoom,
  computeEnemyGroupFocus,
  computeLookTarget,
  smoothToward,
  worldDistance2D,
  type CameraEnemySample,
  type WorldXZ,
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

  /*
     The nearest-K selection was rewritten from filter + toSorted + slice (five
     arrays and a full sort every rendered frame) to a single pass into a reused
     buffer. Pin the two things that must not drift: dead enemies stay excluded,
     and the chosen set is still exactly the K nearest in the same order —
     including ties, which a stable sort keeps in input order.
  */
  it('computeEnemyGroupFocus matches filter+sort+slice framing over randomised fleets', () => {
    // Deterministic LCG — no Math.random, so a failure reproduces exactly.
    let seed = 20260810
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }

    const referenceFocus = (fleet: CameraEnemySample[], viewer: WorldXZ) => {
      const living = fleet.filter((enemy) => enemy.hp > 0)
      if (living.length === 0) return null
      const relevant = [...living]
        .toSorted((a, b) => worldDistance2D(viewer, a.world) - worldDistance2D(viewer, b.world))
        .slice(0, config.maxRelevantEnemies)

      let sumX = 0
      let sumZ = 0
      let weightTotal = 0
      for (const enemy of relevant) {
        const dist = worldDistance2D(viewer, enemy.world)
        let weight = 1 / (1 + dist * 0.35)
        if (enemy.entityType === 'boss') weight *= config.bossFramingScale
        sumX += enemy.world.x * weight
        sumZ += enemy.world.z * weight
        weightTotal += weight
      }
      if (weightTotal <= 0) return relevant[0].world

      const focus = { x: sumX / weightTotal, z: sumZ / weightTotal }
      const boss = relevant.find((enemy) => enemy.entityType === 'boss')
      if (boss) {
        const blend = 0.28
        focus.x = focus.x * (1 - blend) + boss.world.x * blend
        focus.z = focus.z * (1 - blend) + boss.world.z * blend
      }
      return focus
    }

    let sawTie = false
    for (let round = 0; round < 200; round += 1) {
      const viewer = { x: random() * 12 - 6, z: random() * 8 - 4 }
      const fleet: CameraEnemySample[] = Array.from({ length: Math.floor(random() * 9) }, () => ({
        // Snapped coordinates so equal distances actually occur and tie order gets exercised.
        world: {
          x: Math.round((random() * 12 - 6) * 2) / 2,
          z: Math.round((random() * 8 - 4) * 2) / 2,
        },
        hp: random() < 0.35 ? 0 : Math.ceil(random() * 100),
        entityType: (random() < 0.2 ? 'boss' : 'enemy') as 'boss' | 'enemy',
      }))

      const distances = fleet
        .filter((enemy) => enemy.hp > 0)
        .map((enemy) => worldDistance2D(viewer, enemy.world))
      if (new Set(distances).size !== distances.length) sawTie = true

      const expected = referenceFocus(fleet, viewer)
      const actual = computeEnemyGroupFocus(viewer, fleet, config)

      if (expected === null) {
        expect(actual).toBeNull()
        continue
      }
      expect(actual).not.toBeNull()
      expect(actual!.x).toBeCloseTo(expected.x, 12)
      expect(actual!.z).toBeCloseTo(expected.z, 12)
    }
    expect(sawTie).toBe(true)
  })

  /*
     Tie order is only observable through the boss blend, which reads the FIRST
     boss of the selected set — so two equidistant bosses is the case that tells
     a stable selection apart from one that reorders equals.
  */
  it('computeEnemyGroupFocus keeps equal-distance enemies in input order', () => {
    const viewer = { x: 0, z: 0 }
    const bossNear = { world: { x: 3, z: 0 }, hp: 100, entityType: 'boss' as const }
    const bossTied = { world: { x: 0, z: 3 }, hp: 100, entityType: 'boss' as const }

    const firstListed = computeEnemyGroupFocus(viewer, [bossNear, bossTied], config)!
    const reversed = computeEnemyGroupFocus(viewer, [bossTied, bossNear], config)!

    // Same set, same centroid — only the blended-toward boss differs.
    expect(firstListed.x).toBeGreaterThan(firstListed.z)
    expect(reversed.z).toBeGreaterThan(reversed.x)
    expect(firstListed.x).toBeCloseTo(reversed.z, 12)
  })

  it('computeEnemyGroupFocus ignores dead enemies entirely', () => {
    const deadNearby = { world: { x: -3.1, z: 0.4 }, hp: 0, entityType: 'enemy' as const }
    const withCorpse = computeEnemyGroupFocus(player, [deadNearby, enemyA], config)
    const withoutCorpse = computeEnemyGroupFocus(player, [enemyA], config)

    expect(withCorpse).toEqual(withoutCorpse)
    expect(computeEnemyGroupFocus(player, [deadNearby], config)).toBeNull()
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

  it('raises camera view height +30% over v0.8.2 baseline without changing character reference size', () => {
    const baselineConfig = {
      ...DEFAULT_COMBAT_CAMERA_CONFIG,
      ...COMBAT_CAMERA_V082_BASELINE,
    }
    const look = { x: 0, z: 0 }
    const baselinePose = computeCameraPose(look, 1, baselineConfig)
    const currentPose = computeCameraPose(look, 1, DEFAULT_COMBAT_CAMERA_CONFIG)

    expect(DEFAULT_COMBAT_CAMERA_CONFIG.referenceCharacterHeight).toBe(1.6)
    expect(DEFAULT_COMBAT_CAMERA_CONFIG.pitchDeg).toBe(COMBAT_CAMERA_V082_BASELINE.pitchDeg)
    expect(currentPose.positionY).toBeCloseTo(
      baselinePose.positionY * COMBAT_CAMERA_VIEW_HEIGHT_BOOST,
      1,
    )
  })
})
