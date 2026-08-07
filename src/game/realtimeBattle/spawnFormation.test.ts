import { describe, expect, it } from 'vitest'
import { DEFAULT_BATTLE_PRESENTATION } from './battlePresentation'
import {
  resolveEnemyFormation,
  resolvePlayerSpawn,
  runtimeToNormalized,
  separateSpawnPositions,
  startGapXNorm,
} from './spawnFormation'

const STAGE = { width: 1800, height: 1100 }

describe('spawnFormation', () => {
  it('places player on the left with mid-lower depth (Case A baseline)', () => {
    const pos = resolvePlayerSpawn(STAGE)
    const norm = runtimeToNormalized(pos, STAGE)

    expect(norm.xNorm).toBeGreaterThanOrEqual(0.18)
    expect(norm.xNorm).toBeLessThanOrEqual(0.26)
    expect(norm.depthNorm).toBeGreaterThanOrEqual(0.5)
    expect(norm.depthNorm).toBeLessThanOrEqual(0.65)
  })

  it('keeps start gap in the 45–55% presentation band', () => {
    expect(startGapXNorm()).toBeGreaterThanOrEqual(0.45)
    expect(startGapXNorm()).toBeLessThanOrEqual(0.58)
  })

  it('places enemies on the right without overlap (Case B — 3 enemies)', () => {
    const footprints = [{ collisionRadius: 34 }, { collisionRadius: 34 }, { collisionRadius: 34 }]
    const positions = resolveEnemyFormation(STAGE, footprints)

    expect(positions).toHaveLength(3)
    for (const pos of positions) {
      const norm = runtimeToNormalized(pos, STAGE)
      expect(norm.xNorm).toBeGreaterThan(0.65)
      expect(norm.xNorm).toBeLessThan(0.9)
    }

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = Math.hypot(positions[j].x - positions[i].x, positions[j].y - positions[i].y)
        expect(dist).toBeGreaterThanOrEqual(
          34 * 2 * DEFAULT_BATTLE_PRESENTATION.minSpawnSeparationMul - 1,
        )
      }
    }
  })

  it('keeps 5+ enemies separated (Case C)', () => {
    const footprints = Array.from({ length: 5 }, () => ({ collisionRadius: 34 }))
    const positions = resolveEnemyFormation(STAGE, footprints)

    expect(positions).toHaveLength(5)
    const unique = new Set(positions.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`))
    expect(unique.size).toBe(5)
  })

  it('gives larger enemies more spacing (Case D — elite footprint)', () => {
    const normal = resolveEnemyFormation(STAGE, [{ collisionRadius: 34 }, { collisionRadius: 34 }])
    const elite = resolveEnemyFormation(STAGE, [{ collisionRadius: 40 }, { collisionRadius: 40 }])

    const normalDist = Math.hypot(normal[1].x - normal[0].x, normal[1].y - normal[0].y)
    const eliteDist = Math.hypot(elite[1].x - elite[0].x, elite[1].y - elite[0].y)
    expect(eliteDist).toBeGreaterThanOrEqual(normalDist)
  })

  it('separateSpawnPositions resolves stacked points', () => {
    const separated = separateSpawnPositions(
      [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
      ],
      [34, 34],
      { minX: 0, minY: 0, maxX: 1800, maxY: 1100, minSeparationMul: 1 },
    )
    const dist = Math.hypot(separated[1].x - separated[0].x, separated[1].y - separated[0].y)
    expect(dist).toBeGreaterThanOrEqual(68)
  })
})
