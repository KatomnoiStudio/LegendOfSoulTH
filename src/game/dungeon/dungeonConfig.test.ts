import { describe, expect, it } from 'vitest'
import { P5_DATA_PROOF_STAGE, P5_TEST_DUNGEON } from './dungeonConfig'
import { getCurrentStage, getStageByIndex } from './dungeonRuntime'
import { createDungeonRun } from './dungeonRuntime'

describe('dungeonConfig', () => {
  it('P5_TEST_DUNGEON has 4 data-driven stages', () => {
    expect(P5_TEST_DUNGEON.stages).toHaveLength(4)
    expect(P5_TEST_DUNGEON.stages[0].stageType).toBe('survival')
    expect(P5_TEST_DUNGEON.stages[1].stageType).toBe('hazard')
    expect(P5_TEST_DUNGEON.stages[2].stageType).toBe('mini-boss')
    expect(P5_TEST_DUNGEON.stages[3].stageType).toBe('mini-boss')
  })

  it('stage ordering from data not hardcoded indices', () => {
    const run = createDungeonRun(P5_TEST_DUNGEON)
    const first = getCurrentStage(P5_TEST_DUNGEON, run)
    expect(first?.id).toBe('p5-stage-1-survival')
    expect(getStageByIndex(P5_TEST_DUNGEON, 3)?.id).toBe('p5-stage-4-boss')
  })

  it('data proof stage resolves via custom ruleset only', () => {
    expect(P5_DATA_PROOF_STAGE.stageType).toBe('custom')
    expect(P5_DATA_PROOF_STAGE.params).toEqual({ rulesetId: 'defeat-all' })
  })
})
