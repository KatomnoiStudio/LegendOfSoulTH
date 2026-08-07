import type { HeroExpResult } from './progressionSchema'
import { getExpToNextForLevel, progressionConfig } from './progressionConfig'

export function applyHeroExpToProgress(input: {
  heroId: string
  level: number
  currentExp: number
  amount: number
}): HeroExpResult {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error(`Invalid hero EXP amount for ${input.heroId}`)
  }

  const previousLevel = input.level
  const previousExp = input.currentExp
  let level = input.level
  let exp = input.currentExp + input.amount
  let levelsGained = 0

  if (level >= progressionConfig.maxHeroLevel) {
    return {
      heroId: input.heroId,
      previousLevel,
      newLevel: progressionConfig.maxHeroLevel,
      previousExp,
      newExp: 0,
      levelsGained: 0,
      expToNext: 0,
      atMaxLevel: true,
    }
  }

  let guard = 0
  while (level < progressionConfig.maxHeroLevel && guard < 100) {
    const threshold = getExpToNextForLevel(level)
    if (exp < threshold) break
    exp -= threshold
    level += 1
    levelsGained += 1
    guard += 1
  }

  const atMaxLevel = level >= progressionConfig.maxHeroLevel
  if (atMaxLevel) {
    exp = 0
  }

  return {
    heroId: input.heroId,
    previousLevel,
    newLevel: level,
    previousExp,
    newExp: exp,
    levelsGained,
    expToNext: atMaxLevel ? 0 : getExpToNextForLevel(level),
    atMaxLevel,
  }
}
