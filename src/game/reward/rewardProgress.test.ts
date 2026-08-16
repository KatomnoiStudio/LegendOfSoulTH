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

  it('returns 0 when the dungeon has no stages at all', () => {
    // This exercises the `totalStages <= 0` early return, NOT the enemyTotal guard below.
    // Renamed 2026-08-16: it was called "returns 0 rather than dividing by zero", which read
    // as covering both zero-guards while only reaching one — the same name-asserts-more-than-
    // it-measures defect corrected in the boss reward test the same day.
    expect(computeDungeonProgressRatio([], [])).toBe(0)
  })

  /*
    The OTHER zero-guard in this file — `enemyTotal > 0 ? … : 0` — has NO test, deliberately.

    Measured 2026-08-16: `countExpectedEnemiesForStage` cannot return 0 from any shipped
    data. With no waves it short-circuits to 1; with waves, all 14 arenas in REALTIME_STAGES
    have at least one enemy in every wave, so the sum is never 0. The guard is defence
    against a wave-config shape that does not currently exist.

    Two wrong ways to close this, both tried and reverted the same day:
      - Pointing a fabricated stage at a non-existent arenaId. That resolves to no arena,
        which takes the short-circuit and yields 1 — the guard is still never reached, while
        the test's name and comment claim it is. That is worse than no test, because the
        prose makes it read as verified.
      - Deleting the guard because nothing reaches it. Cheap defence against a future
        wave-config edit is not dead code, and removing it would put NaN into a reward ratio
        the first time an arena ships an empty wave.

    So: no test, and the reason is written here rather than left as an unexplained gap. It
    becomes testable the moment a zero-enemy wave is a legitimate config — at which point
    that config is the fixture, not an invented one.
  */

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
