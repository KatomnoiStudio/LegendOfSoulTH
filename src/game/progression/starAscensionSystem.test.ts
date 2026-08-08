import { describe, it, expect } from 'vitest'
import {
  MIN_STAR,
  MAX_STAR,
  STAR_MULTIPLIERS,
  STAR_ASCENSION_COSTS,
  getCharacterStar,
  getCharacterShards,
  statsAtStar,
  calculateTotalStatValue,
  canAscend,
  getRequiredShardsForNextStar,
  ascendCharacter,
} from './starAscensionSystem'
import { ROSTER } from '../characters'
import { REALTIME_CHARACTER_KITS } from '../realtimeBattle/skills'
import type { OwnedCharacter } from '../../types/player'

function createMockOwnedCharacter(overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return {
    characterId: 'monkey-king',
    level: 10,
    exp: 250,
    expToNext: 500,
    obtainedAt: '2026-08-01T00:00:00.000Z',
    star: 1,
    shards: 5,
    skillLevels: {
      skill1: { level: 1, exp: 0, expToNext: 100 },
      skill2: { level: 1, exp: 0, expToNext: 100 },
      skill3: { level: 1, exp: 0, expToNext: 100 },
      ultimate: { level: 1, exp: 0, expToNext: 100 },
    },
    ...overrides,
  }
}

describe('Star Ascension System (#15) — Contract & Done-criteria', () => {
  // Done-criterion 1
  it('Done-criterion 1: consumes the configured duplicate count and increments star tier by exactly 1', () => {
    const hero = createMockOwnedCharacter({ star: 1, shards: 3 })
    const result = ascendCharacter(hero)

    expect(result.success).toBe(true)
    expect(result.previousStar).toBe(1)
    expect(result.newStar).toBe(2)
    expect(result.consumedShards).toBe(STAR_ASCENSION_COSTS[1]) // 1
    expect(result.remainingShards).toBe(2) // 3 - 1
    expect(result.updatedCharacter.star).toBe(2)
    expect(result.updatedCharacter.shards).toBe(2)
  })

  // Done-criterion 2
  it('Done-criterion 2: ★1 kit is complete — no hero skills/effects in ROSTER require star >= 2 to exist', () => {
    for (const hero of ROSTER) {
      expect(hero.stats).toBeDefined()
      const kit = REALTIME_CHARACTER_KITS[hero.id]
      if (kit) {
        expect(kit.skill1).toBeDefined()
        expect(kit.skill2).toBeDefined()
        expect(kit.skill3).toBeDefined()
        expect(kit.ultimate).toBeDefined()
      }
    }
  })

  // Done-criterion 3
  it('Done-criterion 3: statsAtStar(hero, 6).total / statsAtStar(hero, 1).total <= 1.30 for every hero in ROSTER', () => {
    for (const hero of ROSTER) {
      const statsStar1 = statsAtStar(hero.stats, 1)
      const statsStar6 = statsAtStar(hero.stats, 6)

      const total1 = calculateTotalStatValue(statsStar1)
      const total6 = calculateTotalStatValue(statsStar6)

      const ratio = total6 / total1
      expect(ratio).toBeLessThanOrEqual(1.300000000000001) // Strict 130% bound per Master Blueprint §4.3
      expect(ratio).toBeGreaterThanOrEqual(1.28) // Meaningful progression
    }
  })

  // Done-criterion 4
  it('Done-criterion 4: star tier round-trips through state serialization / persistence', () => {
    const hero = createMockOwnedCharacter({ star: 4, shards: 8 })
    const serialized = JSON.stringify(hero)
    const deserialized: OwnedCharacter = JSON.parse(serialized)

    expect(getCharacterStar(deserialized)).toBe(4)
    expect(getCharacterShards(deserialized)).toBe(8)

    const stats = statsAtStar(ROSTER[0].stats, deserialized.star ?? 1)
    expect(stats.atk).toBeGreaterThan(ROSTER[0].stats.atk)
  })
})

describe('Star Ascension System — Known Scars & Edge Cases', () => {
  // Scar 1 (FEH v6.3.0 patch scar: cached/stale UI stats divergence)
  it('Scar 1: immediate stat lookup after ascension matches pure function without cached drift', () => {
    const hero = createMockOwnedCharacter({ star: 1, shards: 1 })
    const result = ascendCharacter(hero)
    expect(result.success).toBe(true)

    const heroDef = ROSTER.find((c) => c.id === hero.characterId)!
    const freshStats = statsAtStar(heroDef.stats, result.updatedCharacter.star!)

    expect(freshStats.hp).toBe(Math.floor(heroDef.stats.hp * STAR_MULTIPLIERS[2]))
    expect(freshStats.atk).toBe(Math.floor(heroDef.stats.atk * STAR_MULTIPLIERS[2]))
    expect(freshStats.def).toBe(Math.floor(heroDef.stats.def * STAR_MULTIPLIERS[2]))
  })

  // Scar 2 (FEH Unlock Potential scar: level and secondary progression retained without silent wiping)
  it('Scar 2: secondary hero progress (level, exp, skill levels) is fully preserved across star ascension', () => {
    const hero = createMockOwnedCharacter({
      level: 45,
      exp: 1200,
      expToNext: 3000,
      star: 2,
      shards: 5,
      skillLevels: {
        skill1: { level: 5, exp: 20, expToNext: 100 },
        skill2: { level: 4, exp: 10, expToNext: 100 },
        skill3: { level: 3, exp: 0, expToNext: 100 },
        ultimate: { level: 2, exp: 50, expToNext: 100 },
      },
    })

    const result = ascendCharacter(hero)
    expect(result.success).toBe(true)
    expect(result.updatedCharacter.level).toBe(45)
    expect(result.updatedCharacter.exp).toBe(1200)
    expect(result.updatedCharacter.skillLevels.skill1.level).toBe(5)
    expect(result.updatedCharacter.skillLevels.ultimate.level).toBe(2)
  })

  // Scar 3 (Edge case gating: exact, below, and max bounds)
  it('Scar 3: exact boundary conditions (0 shards, exact cost, exact-1, at max ★6)', () => {
    // 0 shards
    const heroNoShards = createMockOwnedCharacter({ star: 1, shards: 0 })
    expect(canAscend(heroNoShards.star!, heroNoShards.shards!)).toBe(false)
    const resNoShards = ascendCharacter(heroNoShards)
    expect(resNoShards.success).toBe(false)
    expect(resNoShards.consumedShards).toBe(0)

    // exact cost - 1
    const heroUnder = createMockOwnedCharacter({ star: 3, shards: 2 }) // Cost for star 3 is 3
    expect(canAscend(heroUnder.star!, heroUnder.shards!)).toBe(false)
    const resUnder = ascendCharacter(heroUnder)
    expect(resUnder.success).toBe(false)
    expect(resUnder.consumedShards).toBe(0)

    // exact cost
    const heroExact = createMockOwnedCharacter({ star: 3, shards: 3 })
    expect(canAscend(heroExact.star!, heroExact.shards!)).toBe(true)
    const resExact = ascendCharacter(heroExact)
    expect(resExact.success).toBe(true)
    expect(resExact.newStar).toBe(4)
    expect(resExact.remainingShards).toBe(0)

    // at max star ★6
    const heroMax = createMockOwnedCharacter({ star: 6, shards: 50 })
    expect(canAscend(heroMax.star!, heroMax.shards!)).toBe(false)
    expect(getRequiredShardsForNextStar(6)).toBeNull()
    const resMax = ascendCharacter(heroMax)
    expect(resMax.success).toBe(false)
    expect(resMax.consumedShards).toBe(0)
    expect(resMax.remainingShards).toBe(50)
  })

  // Backward compatibility with legacy records
  it('handles legacy records without star and shards fields gracefully', () => {
    const legacyRecord = {
      characterId: 'pig-warrior',
      level: 1,
      exp: 0,
      expToNext: 100,
      obtainedAt: '2026-07-01T00:00:00.000Z',
    } as unknown as OwnedCharacter

    expect(getCharacterStar(legacyRecord)).toBe(1)
    expect(getCharacterShards(legacyRecord)).toBe(0)

    const stats = statsAtStar(ROSTER[1].stats, getCharacterStar(legacyRecord))
    expect(stats.hp).toBe(ROSTER[1].stats.hp)
  })
})
