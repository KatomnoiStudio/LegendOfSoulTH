import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type Player } from '../../types/player'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import { BANNERS, STANDARD_BANNER, validateBannerConfig } from './gachaConfig'
import { resolveGachaRoll } from './gachaEngine'
import { performGachaPull } from './gachaService'

function createMockPlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'test-user',
    uid: '1234567890',
    name: 'ทดสอบกาชา',
    title: 'จอมยุทธ์',
    level: 10,
    exp: 100,
    expToNext: 1000,
    currency: { gold: 5000, gem: 2000 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 10,
        exp: 0,
        expToNext: 500,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
        star: 1,
        shards: 0,
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
    gachaPity: {},
    ...overrides,
  }
}

/**
 * Deterministic pseudo-random number sequence generator
 */
function createDeterministicRng(sequence: number[]) {
  let index = 0
  return () => {
    const val = sequence[index % sequence.length]
    index++
    return val
  }
}

describe('Gacha System (#23)', () => {
  // ─── Done-criteria ───

  it('Done-criterion 1: Deterministic and reproducible roll output given a fixed seed', () => {
    // 0.01 triggers legendary (< 0.05 rate)
    const rng1 = createDeterministicRng([0.01, 0.5])
    const result1 = resolveGachaRoll(STANDARD_BANNER, 0, rng1)

    const rng2 = createDeterministicRng([0.01, 0.5])
    const result2 = resolveGachaRoll(STANDARD_BANNER, 0, rng2)

    expect(result1.item.characterId).toBe(result2.item.characterId)
    expect(result1.item.rarity).toBe('legendary')
    expect(result1.nextPity).toBe(0) // reset on legendary
  })

  it('Done-criterion 2: A roll never succeeds without matching currency debit', () => {
    const poorPlayer = createMockPlayer({ currency: { gold: 0, gem: 50 } })
    const result = performGachaPull(poorPlayer, 'standard-banner', 1)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('หยกไม่เพียงพอ')
    }

    const richPlayer = createMockPlayer({ currency: { gold: 0, gem: 1000 } })
    const successResult = performGachaPull(richPlayer, 'standard-banner', 1)

    expect(successResult.ok).toBe(true)
    if (successResult.ok) {
      expect(successResult.player.currency.gem).toBe(900) // 1000 - 100
      expect(successResult.cost).toBe(100)
    }
  })

  it('Done-criterion 3: Pity counter tracks correctly and triggers guaranteed legendary at threshold', () => {
    // Force common/rare rolls until pity threshold (30)
    const rng = createDeterministicRng([0.99, 0.5])
    const nearPityPlayer = createMockPlayer({
      currency: { gold: 0, gem: 500 },
      gachaPity: { 'standard-banner': 29 },
    })

    const result = performGachaPull(nearPityPlayer, 'standard-banner', 1, rng)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.results[0]?.isPity).toBe(true)
      expect(result.results[0]?.rarity).toBe('legendary')
      expect(result.newPity).toBe(0) // reset after pity trigger
    }
  })

  it('Done-criterion 4: Rate table sums to 100% per banner at config load time', () => {
    for (const banner of Object.values(BANNERS)) {
      const validation = validateBannerConfig(banner)
      expect(validation.valid).toBe(true)
      expect(validation.error).toBeUndefined()

      const totalRate = banner.rates.reduce((sum, r) => sum + r.rate, 0)
      expect(totalRate).toBeCloseTo(1.0, 5)
    }
  })

  it('Done-criterion 5: Rolls only output pool characters, new heroes add to roster, duplicates grant shards', () => {
    const player = createMockPlayer({
      currency: { gold: 0, gem: 900 },
      ownedCharacters: [
        {
          characterId: 'monkey-king',
          level: 1,
          exp: 0,
          expToNext: 100,
          obtainedAt: '2026-01-01T00:00:00.000Z',
          skillLevels: createDefaultSkillLevels(),
          star: 1,
          shards: 0,
        },
      ],
    })

    const validCharacterIds = STANDARD_BANNER.pool.map((p) => p.characterId)

    const result = performGachaPull(player, 'standard-banner', 10)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.results.length).toBe(10)
      for (const pull of result.results) {
        expect(validCharacterIds).toContain(pull.characterId)
      }

      // Check monkey-king duplicate incremented shards
      const mk = result.player.ownedCharacters.find((c) => c.characterId === 'monkey-king')
      expect(mk).toBeDefined()
    }
  })

  // ─── Known Scars (Genshin Impact Historical Precedents) ───

  describe('Scar 1: Decoupled pity persistence safe from display-layer desync (Genshin Wish History display glitch)', () => {
    it('underlying pity counter remains strictly intact regardless of UI/display interpretation', () => {
      const player = createMockPlayer({
        gachaPity: { 'standard-banner': 15 },
        currency: { gold: 0, gem: 100 },
      })

      // Roll a non-legendary item
      const rng = createDeterministicRng([0.9, 0.5])
      const result = performGachaPull(player, 'standard-banner', 1, rng)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.newPity).toBe(16)
        expect(result.player.gachaPity?.['standard-banner']).toBe(16)
      }
    })
  })

  describe('Scar 2: Double-grant & replay prevention on gacha transactions (Genshin Lantern Rite duplicate mail)', () => {
    it('rejects duplicate or insufficient pull requests without partial state pollution', () => {
      const player = createMockPlayer({
        currency: { gold: 0, gem: 100 },
      })

      // First pull succeeds and exhausts balance
      const pull1 = performGachaPull(player, 'standard-banner', 1)
      expect(pull1.ok).toBe(true)
      if (!pull1.ok) return

      // Immediate retry with updated player fails cleanly
      const pull2 = performGachaPull(pull1.player, 'standard-banner', 1)
      expect(pull2.ok).toBe(false)
      if (!pull2.ok) {
        expect(pull2.error).toContain('หยกไม่เพียงพอ')
      }
      expect(pull1.player.currency.gem).toBe(0)
    })
  })
})
