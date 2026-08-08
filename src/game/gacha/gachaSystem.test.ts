import { describe, it, expect } from 'vitest'
import {
  STANDARD_BANNER,
  validateBannerConfig,
  GACHA_DUPLICATE_SHARDS,
  type GachaBannerConfig,
} from './gachaConfig'
import { calculateEffectiveRates, rollSingleGacha, executeGachaSession } from './gachaEngine'
import type { Player, OwnedCharacter } from '../../types/player'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'

function createMockPlayer(gem: number = 3200, owned: string[] = []): Player {
  const ownedCharacters: OwnedCharacter[] = owned.map((id) => ({
    characterId: id,
    level: 10,
    exp: 0,
    expToNext: 200,
    obtainedAt: '2026-08-01T00:00:00.000Z',
    star: 1,
    shards: 0,
    skillLevels: createDefaultSkillLevels(),
  }))

  return {
    id: 'player-test-uid',
    name: 'จอมยุทธทดสอบ',
    title: 'ผู้กล้าปฐมบท',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 50000, gem },
    inventory: [],
    frameId: 'default',
    ownedCharacters,
    teamSlots: ['monkey-king', null, null],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
}

describe('Gacha System (#23) — Contract & Done-criteria', () => {
  // Done-criterion 1
  it('Done-criterion 1: deterministic roll output given fixed seed and pity counter', () => {
    // Seed returning 0.005 -> guaranteed SSR
    const mockRngSSR = () => 0.005
    const rollSSR = rollSingleGacha(STANDARD_BANNER, 0, mockRngSSR)
    expect(rollSSR.entry.rarity).toBe('SSR')
    expect(rollSSR.newPityCount).toBe(0) // Reset on SSR

    // Seed returning 0.05 -> SR
    const mockRngSR = () => 0.05
    const rollSR = rollSingleGacha(STANDARD_BANNER, 10, mockRngSR)
    expect(rollSR.entry.rarity).toBe('SR')
    expect(rollSR.newPityCount).toBe(11) // Pity advances
  })

  // Done-criterion 2
  it('Done-criterion 2: roll never succeeds without matching gem cost and deducts correctly', () => {
    const poorPlayer = createMockPlayer(100) // Needs 160
    const failRes = executeGachaSession(poorPlayer, STANDARD_BANNER, 1)
    expect(failRes.success).toBe(false)
    expect(failRes.error).toContain('หยกไม่เพียงพอ')

    const richPlayer = createMockPlayer(1600)
    const successRes = executeGachaSession(richPlayer, STANDARD_BANNER, 10)
    expect(successRes.success).toBe(true)
    expect(successRes.result?.totalCostGems).toBe(1600)
    expect(successRes.result?.remainingGems).toBe(0)
    expect(successRes.result?.results.length).toBe(10)
  })

  // Done-criterion 3
  it('Done-criterion 3: hard pity guarantees SSR at 90 pulls', () => {
    // At pity 89, next pull is 90 (hard pity)
    const ratesAt89 = calculateEffectiveRates(STANDARD_BANNER, 90)
    expect(ratesAt89.SSR).toBe(1.0)

    // Even if rng returns 0.999, hard pity forces SSR
    const rngUnlucky = () => 0.999
    const rollHardPity = rollSingleGacha(STANDARD_BANNER, 89, rngUnlucky)
    expect(rollHardPity.entry.rarity).toBe('SSR')
    expect(rollHardPity.newPityCount).toBe(0)
  })

  // Done-criterion 4
  it('Done-criterion 4: rate table sums to 100% per banner', () => {
    const valid = validateBannerConfig(STANDARD_BANNER)
    expect(valid.valid).toBe(true)

    const invalidBanner: GachaBannerConfig = {
      ...STANDARD_BANNER,
      baseRates: { SSR: 0.1, SR: 0.2, R: 0.3 }, // Sums to 60%, invalid!
    }
    const invalidRes = validateBannerConfig(invalidBanner)
    expect(invalidRes.valid).toBe(false)
    expect(invalidRes.error).toContain('100%')
  })

  // Done-criterion 5
  it('Done-criterion 5: rolls strictly stay inside configured banner pool and handle duplicates', () => {
    const player = createMockPlayer(1600, ['monkey-king']) // Already owns monkey-king
    const mockRngSSR = () => 0.001

    const session = executeGachaSession(player, STANDARD_BANNER, 1, 0, mockRngSSR)
    expect(session.success).toBe(true)

    const singleResult = session.result!.results[0]
    expect(singleResult.characterId).toBe('monkey-king')
    expect(singleResult.isNew).toBe(false)
    expect(singleResult.grantedShards).toBe(GACHA_DUPLICATE_SHARDS.SSR) // 30 shards granted

    // Updated owned list has incremented shards
    const updatedMonkey = session.result!.updatedOwnedCharacters.find(
      (c) => c.characterId === 'monkey-king',
    )!
    expect(updatedMonkey.shards).toBe(30)
  })
})

describe('Gacha System — Known Scars & Historical Edge Cases', () => {
  // Scar 1 (Genshin Dec 2022: Display vs Persisted Pity integrity)
  it('Scar 1: pity count state transitions deterministically and resets on SSR only', () => {
    let pity = 0
    const rngNonSSR = () => 0.5 // R roll

    for (let i = 1; i <= 50; i++) {
      const roll = rollSingleGacha(STANDARD_BANNER, pity, rngNonSSR)
      expect(roll.newPityCount).toBe(i)
      pity = roll.newPityCount
    }

    expect(pity).toBe(50)

    // Now roll SSR
    const rngSSR = () => 0.001
    const ssrRoll = rollSingleGacha(STANDARD_BANNER, pity, rngSSR)
    expect(ssrRoll.entry.rarity).toBe('SSR')
    expect(ssrRoll.newPityCount).toBe(0) // Clean reset
  })

  // Scar 2 (Double-grant / idempotent multi-pull transaction boundary)
  it('Scar 2: 10x multi-pull executes atomically with exact currency and character delta', () => {
    const player = createMockPlayer(1600, [])
    const session = executeGachaSession(player, STANDARD_BANNER, 10)

    expect(session.success).toBe(true)
    expect(session.result!.results.length).toBe(10)
    expect(session.result!.totalCostGems).toBe(1600)
    expect(session.result!.remainingGems).toBe(0)

    // Total characters + shards added equals pull count
    const totalGranted =
      session.result!.newCharacters.length + session.result!.results.filter((r) => !r.isNew).length
    expect(totalGranted).toBe(10)
  })
})
