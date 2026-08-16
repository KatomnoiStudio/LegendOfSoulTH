import { describe, expect, it } from 'vitest'
import { P5_TEST_DUNGEON } from '../dungeon/dungeonConfig'
import { computeDungeonProgressRatio, countExpectedEnemiesForStage } from './rewardProgress'

describe('rewardProgress', () => {
  it('counts survival stage enemies capped by totalWaves', () => {
    const stage1 = P5_TEST_DUNGEON.stages[0]
    expect(countExpectedEnemiesForStage(stage1)).toBe(5)
  })

  it('computes partial progress from enemies defeated on failed stage 1', () => {
    const ratio = computeDungeonProgressRatio(
      [
        {
          stageId: 'p5-stage-1-survival',
          stageType: 'survival',
          success: false,
          clearTimeMs: 12_000,
          enemiesDefeated: 2,
        },
      ],
      P5_TEST_DUNGEON.stages,
    )
    // 2 / 5 enemies on stage 1, 4 stages total → 0.1
    expect(ratio).toBeCloseTo(0.1, 5)
  })

  /**
   * The over-payment clamp, driven from the side that REFUSES.
   *
   * Written 2026-08-16: a gold-standard audit mutated `Math.min(1, defeated / enemyTotal)`
   * down to the bare division and the mutant survived all 1185 tests. The three tests above
   * all sit on the paying side — a partial ratio, a full clear, a wave count — so nothing
   * ever asked what happens when the numerator runs past the denominator. Per
   * `.agents/rules/mutation-verified-fix-law.md`, a guard on a money path ships with a test
   * that drives its rejecting branch.
   */
  it('clamps a failed stage at 1 when more enemies are defeated than the stage expects', () => {
    const ratio = computeDungeonProgressRatio(
      [
        {
          stageId: 'p5-stage-1-survival',
          stageType: 'survival',
          success: false,
          clearTimeMs: 12_000,
          // Stage 1 expects 5. A respawn, a double-count, or a wave-config change makes this
          // reachable; without the clamp it pays 20/5 = 4 stages' worth out of a 4-stage
          // dungeon — a full-clear reward for a failed run.
          enemiesDefeated: 20,
        },
      ],
      P5_TEST_DUNGEON.stages,
    )
    expect(ratio).toBeCloseTo(0.25, 5) // one stage of four, not four of four
    expect(ratio).toBeLessThanOrEqual(1)
  })

  it('returns 0 rather than dividing by zero when there are no stages', () => {
    expect(computeDungeonProgressRatio([], [])).toBe(0)
  })

  it('returns 1 when all stages cleared', () => {
    const ratio = computeDungeonProgressRatio(
      P5_TEST_DUNGEON.stages.map((s) => ({
        stageId: s.id,
        stageType: s.stageType,
        success: true,
        clearTimeMs: 1000,
      })),
      P5_TEST_DUNGEON.stages,
    )
    expect(ratio).toBe(1)
  })
})
