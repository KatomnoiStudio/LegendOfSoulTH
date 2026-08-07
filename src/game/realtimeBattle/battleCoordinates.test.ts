import { describe, expect, it } from 'vitest'
import { runtimeDepthNormalized, runtimeToWorldXZ } from './battleCoordinates'
import type { RealtimeBattleStage } from './stageConfig'

describe('battleCoordinates (P1 side-down 2.5D)', () => {
  const stage: RealtimeBattleStage = {
    id: 'test',
    name: 'test-arena',
    width: 1800,
    height: 1100,
    playerSpawn: { x: 900, y: 550 },
    enemySpawns: [],
    waves: [],
  }

  it('maps arena center to world origin on XZ', () => {
    const world = runtimeToWorldXZ({ x: stage.width / 2, y: stage.height / 2 }, stage)
    expect(world.x).toBeCloseTo(0, 5)
    expect(world.z).toBeCloseTo(0, 5)
  })

  it('maps runtime x to world X and runtime y to world Z', () => {
    const world = runtimeToWorldXZ({ x: 0, y: 0 }, stage)
    expect(world.x).toBeCloseTo(-9, 2)
    expect(world.z).toBeCloseTo(-5.5, 2)
  })

  it('normalizes depth 0 at top and 1 at bottom', () => {
    expect(runtimeDepthNormalized(0, stage)).toBe(0)
    expect(runtimeDepthNormalized(stage.height, stage)).toBe(1)
    expect(runtimeDepthNormalized(stage.height / 2, stage)).toBeCloseTo(0.5, 5)
  })
})
