import type { Player } from '../../types/player'
import type {
  AwakeningAdvanceResult,
  HeroExpResult,
  ProgressionEvent,
  SkillSlotId,
  SkillUpgradeResult,
  TalentUnlockResult,
} from './progressionSchema'
import { applyHeroExpToProgress } from './heroExpService'
import {
  createInitialOwnedCharacterProgress,
  getSkillSlotLevel,
  migrateOwnedCharacters,
  sanitizeOwnedCharacter,
} from './progressionMigration'
import {
  AWAKENING_TIER_FIXTURE_COSTS,
  progressionConfig,
  TALENT_NODE_FIXTURES,
  type SkillUpgradeCost,
} from './progressionConfig'
import { getSkillProgressionDefinition, getSkillUpgradeCost } from './skillProgressionResolver'

function spendCost(player: Player, cost: SkillUpgradeCost): Player | null {
  let next = player
  if (cost.gold) {
    if (next.currency.gold < cost.gold) return null
    next = {
      ...next,
      currency: { ...next.currency, gold: next.currency.gold - cost.gold },
    }
  }
  for (const material of cost.materials ?? []) {
    const slot = next.inventory.find((item) => item.itemId === material.itemId)
    if (!slot || slot.quantity < material.quantity) return null
    next = {
      ...next,
      inventory: next.inventory.map((item) =>
        item.itemId === material.itemId
          ? { ...item, quantity: item.quantity - material.quantity }
          : item,
      ),
    }
  }
  return next
}

function updateOwnedCharacter(
  player: Player,
  heroId: string,
  updater: (
    owned: (typeof player.ownedCharacters)[number],
  ) => (typeof player.ownedCharacters)[number],
): Player {
  return {
    ...player,
    ownedCharacters: player.ownedCharacters.map((owned) =>
      owned.characterId === heroId ? updater(owned) : owned,
    ),
  }
}

export function normalizePlayerProgression(player: Player): Player {
  return {
    ...player,
    ownedCharacters: migrateOwnedCharacters(player.ownedCharacters ?? []),
  }
}

export function applyHeroExp(
  player: Player,
  heroId: string,
  amount: number,
): { player: Player; result: HeroExpResult; events: ProgressionEvent[] } {
  const owned = player.ownedCharacters.find((entry) => entry.characterId === heroId)
  if (!owned) {
    throw new Error(`Unknown hero: ${heroId}`)
  }

  const sanitized = sanitizeOwnedCharacter(owned)
  const result = applyHeroExpToProgress({
    heroId,
    level: sanitized.level,
    currentExp: sanitized.exp,
    amount,
  })

  const nextPlayer = updateOwnedCharacter(player, heroId, () => ({
    ...sanitized,
    level: result.newLevel,
    exp: result.newExp,
    expToNext: result.expToNext,
  }))

  const events: ProgressionEvent[] = [{ type: 'HeroExpChanged', heroId, result }]
  if (result.levelsGained > 0) {
    events.push({ type: 'HeroLevelUp', heroId, result })
  }

  return { player: nextPlayer, result, events }
}

export function applyHeroExpToLeadHero(
  player: Player,
  amount: number,
): { player: Player; result: HeroExpResult | null; events: ProgressionEvent[] } {
  const leadId = player.teamSlots.find((id): id is string => id !== null) ?? null
  if (!leadId) return { player, result: null, events: [] }
  const applied = applyHeroExp(player, leadId, amount)
  return applied
}

export function upgradeSkill(
  player: Player,
  heroId: string,
  skillSlot: SkillSlotId,
): { player: Player; result: SkillUpgradeResult; events: ProgressionEvent[] } {
  const owned = player.ownedCharacters.find((entry) => entry.characterId === heroId)
  if (!owned) {
    return {
      player,
      result: {
        success: false,
        heroId,
        skillSlot,
        previousLevel: 0,
        newLevel: 0,
        error: 'Hero not owned',
      },
      events: [],
    }
  }

  const sanitized = sanitizeOwnedCharacter(owned)
  const definition = getSkillProgressionDefinition(heroId, skillSlot)
  if (!definition) {
    return {
      player,
      result: {
        success: false,
        heroId,
        skillSlot,
        previousLevel: getSkillSlotLevel(sanitized, skillSlot),
        newLevel: getSkillSlotLevel(sanitized, skillSlot),
        error: 'Skill progression not configured',
      },
      events: [],
    }
  }

  const currentLevel = getSkillSlotLevel(sanitized, skillSlot)
  if (currentLevel >= definition.maxLevel) {
    return {
      player,
      result: {
        success: false,
        heroId,
        skillSlot,
        previousLevel: currentLevel,
        newLevel: currentLevel,
        error: 'Skill at max level',
      },
      events: [],
    }
  }

  const cost = getSkillUpgradeCost(definition, currentLevel)
  if (!cost) {
    return {
      player,
      result: {
        success: false,
        heroId,
        skillSlot,
        previousLevel: currentLevel,
        newLevel: currentLevel,
        error: 'Missing upgrade cost config',
      },
      events: [],
    }
  }

  const afterSpend = spendCost(player, cost)
  if (!afterSpend) {
    return {
      player,
      result: {
        success: false,
        heroId,
        skillSlot,
        previousLevel: currentLevel,
        newLevel: currentLevel,
        error: 'Insufficient resources',
      },
      events: [],
    }
  }

  const newLevel = currentLevel + 1
  const nextPlayer = updateOwnedCharacter(afterSpend, heroId, (entry) => {
    const base = sanitizeOwnedCharacter(entry)
    return {
      ...base,
      skillLevels: {
        ...base.skillLevels,
        [skillSlot]: { ...base.skillLevels[skillSlot], level: newLevel },
      },
    }
  })

  const result: SkillUpgradeResult = {
    success: true,
    heroId,
    skillSlot,
    previousLevel: currentLevel,
    newLevel,
  }

  return {
    player: nextPlayer,
    result,
    events: [{ type: 'SkillUpgraded', heroId, result }],
  }
}

export function unlockTalent(
  player: Player,
  heroId: string,
  nodeId: string,
): { player: Player; result: TalentUnlockResult; events: ProgressionEvent[] } {
  const node = TALENT_NODE_FIXTURES.find((entry) => entry.id === nodeId && entry.heroId === heroId)
  if (!node) {
    return {
      player,
      result: { success: false, heroId, nodeId, error: 'Unknown talent node' },
      events: [],
    }
  }

  const owned = player.ownedCharacters.find((entry) => entry.characterId === heroId)
  if (!owned) {
    return {
      player,
      result: { success: false, heroId, nodeId, error: 'Hero not owned' },
      events: [],
    }
  }

  const sanitized = sanitizeOwnedCharacter(owned)
  if (sanitized.talentState?.unlockedNodes.includes(nodeId)) {
    return {
      player,
      result: { success: false, heroId, nodeId, error: 'Already unlocked' },
      events: [],
    }
  }

  for (const prereq of node.prerequisites ?? []) {
    if (!sanitized.talentState?.unlockedNodes.includes(prereq)) {
      return {
        player,
        result: { success: false, heroId, nodeId, error: 'Prerequisites not met' },
        events: [],
      }
    }
  }

  const afterSpend = node.cost ? spendCost(player, node.cost) : player
  if (!afterSpend) {
    return {
      player,
      result: { success: false, heroId, nodeId, error: 'Insufficient resources' },
      events: [],
    }
  }

  const nextPlayer = updateOwnedCharacter(afterSpend, heroId, (entry) => ({
    ...sanitizeOwnedCharacter(entry),
    talentState: {
      unlockedNodes: [...(entry.talentState?.unlockedNodes ?? []), nodeId],
    },
  }))

  const result: TalentUnlockResult = { success: true, heroId, nodeId }
  return {
    player: nextPlayer,
    result,
    events: [{ type: 'TalentUnlocked', heroId, result }],
  }
}

export function advanceAwakening(
  player: Player,
  heroId: string,
): { player: Player; result: AwakeningAdvanceResult; events: ProgressionEvent[] } {
  const owned = player.ownedCharacters.find((entry) => entry.characterId === heroId)
  if (!owned) {
    return {
      player,
      result: { success: false, heroId, previousTier: 0, newTier: 0, error: 'Hero not owned' },
      events: [],
    }
  }

  const sanitized = sanitizeOwnedCharacter(owned)
  const currentTier = sanitized.awakeningState?.tier ?? 0
  if (currentTier >= progressionConfig.maxAwakeningTier) {
    return {
      player,
      result: {
        success: false,
        heroId,
        previousTier: currentTier,
        newTier: currentTier,
        error: 'Max awakening tier',
      },
      events: [],
    }
  }

  const nextTier = currentTier + 1
  const cost = AWAKENING_TIER_FIXTURE_COSTS[nextTier]
  const afterSpend = cost ? spendCost(player, cost) : player
  if (!afterSpend) {
    return {
      player,
      result: {
        success: false,
        heroId,
        previousTier: currentTier,
        newTier: currentTier,
        error: 'Insufficient resources',
      },
      events: [],
    }
  }

  const nextPlayer = updateOwnedCharacter(afterSpend, heroId, (entry) => ({
    ...sanitizeOwnedCharacter(entry),
    awakeningState: {
      tier: nextTier,
      unlockedEffects: [`awakening-tier-${nextTier}`],
    },
  }))

  const result: AwakeningAdvanceResult = {
    success: true,
    heroId,
    previousTier: currentTier,
    newTier: nextTier,
  }

  return {
    player: nextPlayer,
    result,
    events: [{ type: 'AwakeningChanged', heroId, result }],
  }
}
