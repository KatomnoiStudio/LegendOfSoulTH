import { describe, expect, it } from 'vitest'
import { resolveLobbyStageReward } from './stageRewardResolver'
import { STAGE_REWARD_DEFINITIONS } from './stageRewardConfig'

describe('stageRewardConfig — Chapter 1 tables (P11)', () => {
  it('defines rewards for all 10 trial stages', () => {
    for (let i = 1; i <= 10; i += 1) {
      const id = `trial-${String(i).padStart(2, '0')}`
      expect(STAGE_REWARD_DEFINITIONS[id]).toBeDefined()
    }
  })

  it('resolveLobbyStageReward is deterministic and scales with waves cleared', () => {
    const a = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: false,
    })
    const b = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: false,
    })
    expect(a).toEqual(b)
    expect(a?.earnedGold).toBe(55) // 40 base + 15 wave
    expect(a?.earnedExp).toBe(95) // 70 base + 25 wave
  })

  it('first-clear conditional adds bonus gold and items', () => {
    const repeat = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: false,
    })
    const first = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: true,
    })
    expect(first!.earnedGold).toBeGreaterThan(repeat!.earnedGold)
    expect(first!.droppedItems).toEqual(
      expect.arrayContaining([
        { itemId: 'iron-essence', quantity: 1 },
        { itemId: 'healing-peach', quantity: 1 },
      ]),
    )
  })

  it('boss stage trial-10 grants higher base rewards than trial-01', () => {
    const early = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: false,
    })
    const boss = resolveLobbyStageReward({
      stageId: 'trial-10',
      wavesCleared: 1,
      isFirstClear: false,
    })
    expect(boss!.earnedGold).toBeGreaterThan(early!.earnedGold)
    expect(boss!.earnedExp).toBeGreaterThan(early!.earnedExp)
  })
})
