import {
  PLACEHOLDER_HERO_EXP_TABLE,
  progressionConfig,
  SKILL_PROGRESSION_FIXTURES,
  TALENT_NODE_FIXTURES,
} from './progressionConfig'

export function validateProgressionConfig(): string[] {
  const errors: string[] = []

  if (progressionConfig.maxHeroLevel < 1) {
    errors.push('maxHeroLevel must be >= 1')
  }

  for (const entry of PLACEHOLDER_HERO_EXP_TABLE) {
    if (entry.expToNext <= 0) errors.push(`invalid expToNext at level ${entry.level}`)
  }

  for (const [heroId, slots] of Object.entries(SKILL_PROGRESSION_FIXTURES)) {
    for (const [slot, definition] of Object.entries(slots)) {
      if (!definition) continue
      if (definition.maxLevel < 1) {
        errors.push(`${heroId}.${slot} maxLevel invalid`)
      }
      if (definition.upgradeCosts.length !== definition.maxLevel - 1) {
        errors.push(`${heroId}.${slot} upgradeCosts length mismatch`)
      }
      for (const mod of definition.levelModifiers) {
        if (mod.damageScale !== undefined && mod.damageScale < 0) {
          errors.push(`${heroId}.${slot} negative damage multiplier`)
        }
      }
    }
  }

  const talentIds = new Set<string>()
  for (const node of TALENT_NODE_FIXTURES) {
    if (talentIds.has(node.id)) errors.push(`duplicate talent id ${node.id}`)
    talentIds.add(node.id)
    for (const prereq of node.prerequisites ?? []) {
      if (!TALENT_NODE_FIXTURES.some((entry) => entry.id === prereq)) {
        errors.push(`talent ${node.id} missing prerequisite ${prereq}`)
      }
    }
  }

  return errors
}
