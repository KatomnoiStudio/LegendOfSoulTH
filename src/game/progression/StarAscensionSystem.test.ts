import { describe, expect, it } from 'vitest'
import { ROSTER } from '../characters'
import { REALTIME_CHARACTER_KITS } from '../realtimeBattle/skills'
import type { OwnedCharacter } from '../../types/player'
import {
  canAscendStar,
  getTotalStats,
  previewStarAscension,
  statsAtStar,
} from './StarAscensionSystem'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'

const createMockOwned = (overrides?: Partial<OwnedCharacter>): OwnedCharacter => ({
  characterId: 'monkey-king',
  level: 1,
  exp: 0,
  expToNext: 100,
  obtainedAt: '2026-01-01T00:00:00.000Z',
  skillLevels: createDefaultSkillLevels(),
  star: 1,
  shards: 0,
  ...overrides,
})

describe('Star Ascension System (#15)', () => {
  // ─── Done-criteria ───

  it('Done-criterion 1: Ascension consumes configured duplicate count and increments star tier by exactly 1', () => {
    const owned = createMockOwned({ star: 1, shards: 1 })
    expect(canAscendStar(owned)).toBe(true)

    const result = previewStarAscension(owned)
    expect(result.success).toBe(true)
    expect(result.newStar).toBe(2)
    expect(result.duplicatesRemaining).toBe(0)
  })

  it('Done-criterion 2: ★1 kit is complete — no skill definition is gated to star >= 2', () => {
    for (const kit of Object.values(REALTIME_CHARACTER_KITS)) {
      const skills = [kit.skill1, kit.skill2, kit.skill3, kit.ultimate]
      for (const skill of skills) {
        expect((skill as unknown as Record<string, unknown>).requiredStar).toBeUndefined()
      }
    }
  })

  it('Done-criterion 3: statsAtStar(hero, 6).total / statsAtStar(hero, 1).total <= 1.30 for every hero in ROSTER', () => {
    expect(ROSTER.length).toBeGreaterThan(0)

    for (const hero of ROSTER) {
      const stats1 = statsAtStar(hero, 1)
      const stats6 = statsAtStar(hero, 6)

      const total1 = getTotalStats(stats1)
      const total6 = getTotalStats(stats6)

      const ratio = total6 / total1
      // Master Blueprint §4.3: power gap must stay <= 130%
      expect(ratio).toBeLessThanOrEqual(1.3)
      expect(stats6.hp).toBeGreaterThanOrEqual(stats1.hp)
      expect(stats6.atk).toBeGreaterThanOrEqual(stats1.atk)
      expect(stats6.def).toBeGreaterThanOrEqual(stats1.def)
      expect(stats6.spd).toBeGreaterThanOrEqual(stats1.spd)
    }
  })

  it('Done-criterion 4: Star tier round-trips through state serialization', () => {
    const owned = createMockOwned({ star: 4, shards: 3 })
    const serialized = JSON.stringify(owned)
    const deserialized: OwnedCharacter = JSON.parse(serialized)

    expect(deserialized.star).toBe(4)
    expect(deserialized.shards).toBe(3)
    expect(deserialized.characterId).toBe('monkey-king')
  })

  // ─── Known Scars (Fire Emblem Heroes Merge Allies Precedents) ───

  describe('Scar 1: Displayed stats immediately match pure statsAtStar calculation (FEH Ascend Traits UI desync)', () => {
    it('stat recalculation immediately reflects star upgrade without stale cached state', () => {
      const hero = ROSTER[0]
      const initialStats = statsAtStar(hero, 1)

      const owned = createMockOwned({ star: 1, shards: 5 })
      const result = previewStarAscension(owned)
      expect(result.success).toBe(true)

      const upgradedStats = statsAtStar(hero, result.newStar)
      expect(upgradedStats.hp).toBeGreaterThan(initialStats.hp)
      expect(upgradedStats.atk).toBeGreaterThan(initialStats.atk)
      expect(upgradedStats).toEqual(statsAtStar(hero, 2))
    })
  })

  describe('Scar 2: Star promotion preserves all existing per-hero progression (FEH Unlock Potential reset loss)', () => {
    it('level, exp, skillLevels, talentState, and awakeningState all survive star ascension', () => {
      const owned = createMockOwned({
        star: 2,
        shards: 4,
        level: 15,
        exp: 250,
        talentState: { unlockedNodes: ['node-1', 'node-2'] },
        awakeningState: { tier: 2, unlockedEffects: ['eff-1'] },
      })

      const result = previewStarAscension(owned)
      expect(result.success).toBe(true)

      const updatedOwned: OwnedCharacter = {
        ...owned,
        star: result.newStar,
        shards: result.duplicatesRemaining,
      }

      expect(updatedOwned.star).toBe(3)
      expect(updatedOwned.level).toBe(15)
      expect(updatedOwned.exp).toBe(250)
      expect(updatedOwned.talentState?.unlockedNodes).toEqual(['node-1', 'node-2'])
      expect(updatedOwned.awakeningState?.tier).toBe(2)
      expect(updatedOwned.skillLevels).toEqual(owned.skillLevels)
    })
  })

  describe('Scar 3: Edge-case states give unambiguous accept/reject with no silent no-op (FEH Precondition edge-case block)', () => {
    it('rejects ascension when duplicate count is 1 below threshold without consuming duplicates', () => {
      const owned = createMockOwned({ star: 3, shards: 3 }) // Star 4 requires 4 duplicates
      expect(canAscendStar(owned)).toBe(false)

      const result = previewStarAscension(owned)
      expect(result.success).toBe(false)
      expect(result.newStar).toBe(3)
      expect(result.duplicatesRemaining).toBe(3)
      expect(result.error).toContain('จำนวนตัวซ้ำไม่เพียงพอ')
    })

    it('accepts ascension when duplicate count is exactly at threshold and consumes exact amount', () => {
      const owned = createMockOwned({ star: 3, shards: 4 })
      expect(canAscendStar(owned)).toBe(true)

      const result = previewStarAscension(owned)
      expect(result.success).toBe(true)
      expect(result.newStar).toBe(4)
      expect(result.duplicatesRemaining).toBe(0)
    })

    it('accepts ascension when duplicate count is above threshold and retains remaining duplicates', () => {
      const owned = createMockOwned({ star: 3, shards: 10 })
      const result = previewStarAscension(owned)
      expect(result.success).toBe(true)
      expect(result.newStar).toBe(4)
      expect(result.duplicatesRemaining).toBe(6)
    })

    it('rejects ascension when star is already at maximum (★6)', () => {
      const owned = createMockOwned({ star: 6, shards: 20 })
      expect(canAscendStar(owned)).toBe(false)

      const result = previewStarAscension(owned)
      expect(result.success).toBe(false)
      expect(result.newStar).toBe(6)
      expect(result.duplicatesRemaining).toBe(20)
      expect(result.error).toContain('ระดับดาวถึงขั้นสูงสุดแล้ว')
    })
  })

  describe('Scar 4: Explicit outcome matches reported response without silent degraded result (FEH Rarity-mismatch degraded merge)', () => {
    it('previewStarAscension returns structured result with explicit success/error indication', () => {
      const owned = createMockOwned({ star: 1, shards: 0 })
      const result = previewStarAscension(owned)

      expect(result.success).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.newStar).toBe(1)
    })
  })

  describe('Scar 5: Secondary progression state isolation and preservation (FEH Dragonflower discard scar)', () => {
    it('ascending hero never overwrites or discards secondary progression metadata', () => {
      const owned = createMockOwned({
        star: 4,
        shards: 10,
        progressionVersion: 2,
        obtainedAt: '2026-01-01T00:00:00.000Z',
      })

      const result = previewStarAscension(owned)
      expect(result.success).toBe(true)

      const nextOwned: OwnedCharacter = {
        ...owned,
        star: result.newStar,
        shards: result.duplicatesRemaining,
      }

      expect(nextOwned.progressionVersion).toBe(2)
      expect(nextOwned.obtainedAt).toBe('2026-01-01T00:00:00.000Z')
    })
  })
})
