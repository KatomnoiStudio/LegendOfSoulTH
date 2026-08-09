import { getCharacter } from '../characters'
import type { Player } from '../../types/player'
import type { HeroProgressionViewModel, SkillSlotId } from './progressionSchema'
import { progressionConfig, TALENT_NODE_FIXTURES } from './progressionConfig'
import { ownedCharacterToHeroProgress } from './progressionMigration'
import { resolveHeroLevelStats } from './heroStatsResolver'
import {
  formatUpgradeCost,
  getSkillProgressionDefinition,
  getSkillUpgradeCost,
  getSkillUpgradePreview,
} from './skillProgressionResolver'
import { AWAKENING_TIER_FIXTURE_COSTS } from './progressionConfig'

const SKILL_SLOTS: SkillSlotId[] = ['skill1', 'skill2', 'skill3', 'ultimate']

function canAffordCost(player: Player, gold = 0): boolean {
  return player.currency.gold >= gold
}

export function buildHeroProgressionViewModel(
  player: Player,
  heroId: string,
): HeroProgressionViewModel | null {
  const character = getCharacter(heroId)
  const owned = player.ownedCharacters.find((entry) => entry.characterId === heroId)
  if (!character || !owned) return null

  const progress = ownedCharacterToHeroProgress(owned)
  const stats = resolveHeroLevelStats(heroId, progress.level)
  if (!stats) return null

  const atMaxLevel = progress.level >= progressionConfig.maxHeroLevel
  const expProgressRatio =
    atMaxLevel || progress.expToNext <= 0 ? 1 : progress.currentExp / progress.expToNext

  const skills = SKILL_SLOTS.map((slot) => {
    const currentLevel = progress.skillLevels[slot] ?? 1
    const definition = getSkillProgressionDefinition(heroId, slot)
    if (!definition) return null
    const cost = getSkillUpgradeCost(definition, currentLevel)
    const costGold = cost?.gold ?? 0
    return getSkillUpgradePreview(heroId, slot, currentLevel, canAffordCost(player, costGold))
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const talentNodes = TALENT_NODE_FIXTURES.filter((node) => node.heroId === heroId).map((node) => {
    const unlocked = progress.talentState.unlockedNodes.includes(node.id)
    const prereqsMet = (node.prerequisites ?? []).every((id) =>
      progress.talentState.unlockedNodes.includes(id),
    )
    const costGold = node.cost?.gold ?? 0
    const canUnlock = !unlocked && prereqsMet && canAffordCost(player, costGold)
    return {
      id: node.id,
      name: node.name,
      unlocked,
      canUnlock,
      costLabel: formatUpgradeCost(node.cost ?? null),
      reason: unlocked ? 'Unlocked' : prereqsMet ? undefined : 'Prerequisites required',
    }
  })

  const awakeningTier = progress.awakeningState.tier
  const nextAwakeningCost = AWAKENING_TIER_FIXTURE_COSTS[awakeningTier + 1]

  return {
    heroId,
    heroName: character.name,
    level: progress.level,
    currentExp: progress.currentExp,
    expToNext: progress.expToNext,
    expProgressRatio,
    atMaxLevel,
    stats,
    skills,
    talentNodes,
    awakening: {
      tier: awakeningTier,
      maxTier: progressionConfig.maxAwakeningTier,
      canAdvance:
        awakeningTier < progressionConfig.maxAwakeningTier &&
        canAffordCost(player, nextAwakeningCost?.gold ?? 0),
      summary:
        awakeningTier >= progressionConfig.maxAwakeningTier
          ? 'MAX'
          : `Tier ${awakeningTier} → ${awakeningTier + 1}`,
    },
    nonProductionBalance: progressionConfig.nonProductionBalance,
  }
}
