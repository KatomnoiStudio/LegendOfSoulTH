import type { OwnedCharacter, Player, SkillLevels } from '../../types/player'
import { progressionConfig } from '../progression/progressionConfig'
import { getSkillProgressionDefinition } from '../progression/skillProgressionResolver'
import { createPlayerEntity } from '../realtimeBattle/createRealtimeBattle'
import type { SkillSlotId } from '../realtimeBattle/SkillProgressionSystem'
import type { RealtimeBattleEntity } from '../realtimeBattle/types'

/** Ranked PvP fixes progression at its configured cap; star is intentionally preserved. */
export const RANKED_BASELINE = {
  heroLevel: progressionConfig.maxHeroLevel,
  defaultSkillLevel: progressionConfig.defaultSkillMaxLevel,
} as const

export interface RankedHeroSnapshot {
  characterId: string
  level: number
  skillLevels: Record<SkillSlotId, number>
  star: number
}

function rankedSkillLevel(characterId: string, slot: SkillSlotId): number {
  return (
    getSkillProgressionDefinition(characterId, slot)?.maxLevel ??
    RANKED_BASELINE.defaultSkillLevel
  )
}

/** Pure, match-scoped projection. Never persist this snapshot back to the account. */
export function toRankedHeroSnapshot(character: OwnedCharacter): RankedHeroSnapshot {
  return {
    characterId: character.characterId,
    level: RANKED_BASELINE.heroLevel,
    skillLevels: {
      skill1: rankedSkillLevel(character.characterId, 'skill1'),
      skill2: rankedSkillLevel(character.characterId, 'skill2'),
      skill3: rankedSkillLevel(character.characterId, 'skill3'),
      ultimate: rankedSkillLevel(character.characterId, 'ultimate'),
    },
    star: character.star ?? 1,
  }
}

function withRankedSkillLevels(
  source: SkillLevels,
  ranked: RankedHeroSnapshot['skillLevels'],
): SkillLevels {
  return {
    skill1: { ...source.skill1, level: ranked.skill1 },
    skill2: { ...source.skill2, level: ranked.skill2 },
    skill3: { ...source.skill3, level: ranked.skill3 },
    ultimate: { ...source.ultimate, level: ranked.ultimate },
  }
}

/**
 * Builds a combat entity through the existing PvE constructor after substituting only ranked
 * progression inputs. The account object and PvE path remain byte-for-byte untouched.
 */
export function createRankedPlayerEntity(player: Player): RealtimeBattleEntity | null {
  const leadId = player.teamSlots.find((id): id is string => id !== null)
  if (!leadId) return null

  const ownedIndex = player.ownedCharacters.findIndex((entry) => entry.characterId === leadId)
  const owned = player.ownedCharacters[ownedIndex]
  if (!owned) return null

  const ranked = toRankedHeroSnapshot(owned)
  const rankedOwned: OwnedCharacter = {
    ...owned,
    level: ranked.level,
    star: ranked.star,
    skillLevels: withRankedSkillLevels(owned.skillLevels, ranked.skillLevels),
  }

  const matchPlayer: Player = {
    ...player,
    ownedCharacters: player.ownedCharacters.map((entry, index) =>
      index === ownedIndex ? rankedOwned : entry,
    ),
  }

  return createPlayerEntity(matchPlayer)
}
