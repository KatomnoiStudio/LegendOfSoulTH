import type { SkillSlotId, SkillLevelModifier, SkillUpgradePreview } from './progressionSchema'
import {
  SKILL_PROGRESSION_FIXTURES,
  type SkillProgressionDefinition,
  type SkillUpgradeCost,
} from './progressionConfig'
import { REALTIME_CHARACTER_KITS } from '../realtimeBattle/skills'

export function getSkillProgressionDefinition(
  heroId: string,
  slot: SkillSlotId,
): SkillProgressionDefinition | null {
  return SKILL_PROGRESSION_FIXTURES[heroId]?.[slot] ?? null
}

export function getSkillModifierAtLevel(
  definition: SkillProgressionDefinition,
  level: number,
): SkillLevelModifier | undefined {
  return definition.levelModifiers.find((entry) => entry.level === level)
}

export function getSkillUpgradeCost(
  definition: SkillProgressionDefinition,
  currentLevel: number,
): SkillUpgradeCost | null {
  if (currentLevel >= definition.maxLevel) return null
  return definition.upgradeCosts[currentLevel - 1] ?? null
}

export function formatUpgradeCost(cost: SkillUpgradeCost | null): string {
  if (!cost) return '—'
  const parts: string[] = []
  if (cost.gold) parts.push(`ทอง ${cost.gold}`)
  for (const mat of cost.materials ?? []) {
    parts.push(`${mat.itemId} ×${mat.quantity}`)
  }
  return parts.length > 0 ? parts.join(', ') : 'ฟรี'
}

export function getSkillUpgradePreview(
  heroId: string,
  slot: SkillSlotId,
  currentLevel: number,
  canAfford: boolean,
  blockReason?: string,
): SkillUpgradePreview | null {
  const definition = getSkillProgressionDefinition(heroId, slot)
  const kit = REALTIME_CHARACTER_KITS[heroId]
  const skillDef = kit?.[slot]
  if (!definition || !skillDef) return null

  const atMax = currentLevel >= definition.maxLevel
  const cost = getSkillUpgradeCost(definition, currentLevel)
  const nextLevel = atMax ? null : currentLevel + 1

  return {
    skillSlot: slot,
    skillName: skillDef.name,
    currentLevel,
    nextLevel,
    maxLevel: definition.maxLevel,
    costLabel: atMax ? 'MAX' : formatUpgradeCost(cost),
    canUpgrade: !atMax && canAfford && !blockReason,
    reason: blockReason ?? (atMax ? 'MAX' : undefined),
    modifiers: {
      current: getSkillModifierAtLevel(definition, currentLevel),
      next: nextLevel ? getSkillModifierAtLevel(definition, nextLevel) : undefined,
    },
  }
}

export function resolveSkillDamageMultiplier(
  heroId: string,
  slot: SkillSlotId,
  skillLevel: number,
): number {
  const definition = getSkillProgressionDefinition(heroId, slot)
  if (!definition) return 1
  return getSkillModifierAtLevel(definition, skillLevel)?.damageMultiplier ?? 1
}
