import { describe, expect, test } from 'vitest'
import type { OwnedCharacter, Player } from '../../types/player'
import { statsAtStar } from '../heroes/starScaling'
import { resolveFinalCombatStats } from '../progression/heroStatsResolver'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import { createPlayerEntity } from '../realtimeBattle/createRealtimeBattle'
import {
  RANKED_BASELINE,
  createRankedPlayerEntity,
  toRankedHeroSnapshot,
} from './rankedNormalization'

function owned(overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return {
    characterId: 'monkey-king',
    level: 1,
    exp: 0,
    expToNext: 100,
    obtainedAt: '2026-08-09T00:00:00.000Z',
    skillLevels: createDefaultSkillLevels(),
    star: 1,
    shards: 0,
    ...overrides,
  }
}

function player(character: OwnedCharacter): Player {
  return {
    id: 'profile-1',
    uid: 'LOS-0000-0001',
    name: 'ผู้เล่นหนึ่ง',
    title: 'ผู้ทดสอบ',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [character],
    inventory: [],
    friends: [],
    teamSlots: [character.characterId, null, null, null],
    frameId: 'default',
    progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
  }
}

describe('PvP ranked power normalization (§3.8.5)', () => {
  test('different account progression resolves to the same ranked level and skill caps', () => {
    const fresh = toRankedHeroSnapshot(owned())
    const invested = toRankedHeroSnapshot(
      owned({
        level: 59,
        skillLevels: {
          skill1: { level: 4, exp: 99, expToNext: 500 },
          skill2: { level: 3, exp: 10, expToNext: 300 },
          skill3: { level: 2, exp: 5, expToNext: 250 },
          ultimate: { level: 2, exp: 1, expToNext: 400 },
        },
      }),
    )

    expect(fresh.level).toBe(RANKED_BASELINE.heroLevel)
    expect(invested.level).toBe(RANKED_BASELINE.heroLevel)
    expect(fresh.skillLevels).toEqual(invested.skillLevels)
    expect(fresh.skillLevels).toEqual({ skill1: 5, skill2: 5, skill3: 5, ultimate: 3 })
  })

  test('star passes through unchanged as the only ranked progression gap', () => {
    expect(toRankedHeroSnapshot(owned({ star: 1 })).star).toBe(1)
    expect(toRankedHeroSnapshot(owned({ star: 6 })).star).toBe(6)
  })

  test('ranked entity uses existing combat stat resolver at max level and preserves star scaling', () => {
    const source = player(owned({ level: 7, star: 4 }))
    const entity = createRankedPlayerEntity(source)
    const levelStats = resolveFinalCombatStats({
      heroId: 'monkey-king',
      level: RANKED_BASELINE.heroLevel,
    })

    expect(entity).not.toBeNull()
    expect(levelStats).not.toBeNull()
    expect(entity?.maxHp).toBe(statsAtStar(levelStats!, 4).hp)
    expect(entity?.atk).toBe(statsAtStar(levelStats!, 4).atk)
    expect(entity?.def).toBe(statsAtStar(levelStats!, 4).def)
  })

  test('ranked projection never mutates account or PvE entity construction', () => {
    const source = player(owned({ level: 7, star: 2 }))
    const before = structuredClone(source)
    const pveBefore = createPlayerEntity(source)

    createRankedPlayerEntity(source)

    expect(source).toEqual(before)
    expect(createPlayerEntity(source)).toEqual(pveBefore)
    expect(pveBefore?.maxHp).not.toBe(createRankedPlayerEntity(source)?.maxHp)
  })

  test('★6 remains within the existing 130% cap after ranked normalization', () => {
    const oneStar = createRankedPlayerEntity(player(owned({ star: 1 })))
    const sixStar = createRankedPlayerEntity(player(owned({ star: 6 })))

    expect(oneStar).not.toBeNull()
    expect(sixStar).not.toBeNull()
    expect(sixStar!.hp / oneStar!.hp).toBeLessThanOrEqual(1.3)
    expect(sixStar!.atk / oneStar!.atk).toBeLessThanOrEqual(1.3)
    expect(sixStar!.def / oneStar!.def).toBeLessThanOrEqual(1.3)
  })
})
