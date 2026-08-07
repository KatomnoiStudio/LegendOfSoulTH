/**
 * NON-PRODUCTION BALANCE — placeholder progression numerics until Ring 0 locks P8/P9.
 */

import type { SkillSlotId, SkillLevelModifier } from './progressionSchema'

export const PROGRESSION_SCHEMA_VERSION = 1

/** Configurable cap — confirm with Ring 0 before treating 60 as production lock. */
export const progressionConfig = {
  maxHeroLevel: 60,
  defaultSkillMaxLevel: 5,
  maxAwakeningTier: 3,
  nonProductionBalance: true as const,
  /** At max hero level: retain EXP at 0 (overflow ignored). Reversible gap if Ring 0 wants conversion. */
  maxLevelExpBehavior: 'clamp_zero' as const,
}

export interface HeroExpTableEntry {
  level: number
  expToNext: number
}

/** Placeholder EXP table — levels 1–10 explicit, then formula fallback. */
export const PLACEHOLDER_HERO_EXP_TABLE: HeroExpTableEntry[] = [
  { level: 1, expToNext: 100 },
  { level: 2, expToNext: 150 },
  { level: 3, expToNext: 220 },
  { level: 4, expToNext: 300 },
  { level: 5, expToNext: 400 },
  { level: 6, expToNext: 520 },
  { level: 7, expToNext: 660 },
  { level: 8, expToNext: 820 },
  { level: 9, expToNext: 1000 },
  { level: 10, expToNext: 1200 },
]

export function getExpToNextForLevel(level: number): number {
  const entry = PLACEHOLDER_HERO_EXP_TABLE.find((row) => row.level === level)
  if (entry) return entry.expToNext
  return Math.max(100, Math.round(100 + level * 80))
}

/** Placeholder per-level stat growth — NON-PRODUCTION. */
export const PLACEHOLDER_LEVEL_STAT_GROWTH = {
  hp: 12,
  atk: 2,
  def: 1.5,
  spd: 0.5,
}

export interface SkillUpgradeCost {
  gold?: number
  materials?: Array<{ itemId: string; quantity: number }>
}

export interface SkillProgressionDefinition {
  skillId: string
  slot: SkillSlotId
  maxLevel: number
  upgradeCosts: SkillUpgradeCost[]
  levelModifiers: SkillLevelModifier[]
}

/** Test fixture skill progression — monkey-king only for P8 proof. */
export const SKILL_PROGRESSION_FIXTURES: Record<
  string,
  Partial<Record<SkillSlotId, SkillProgressionDefinition>>
> = {
  'monkey-king': {
    skill1: {
      skillId: 'spinning-golden-staff',
      slot: 'skill1',
      maxLevel: 5,
      upgradeCosts: [{ gold: 50 }, { gold: 80 }, { gold: 120 }, { gold: 180 }],
      levelModifiers: [
        { level: 1, damageMultiplier: 1 },
        { level: 2, damageMultiplier: 1.05 },
        { level: 3, damageMultiplier: 1.1 },
        { level: 4, damageMultiplier: 1.15 },
        { level: 5, damageMultiplier: 1.2 },
      ],
    },
    skill2: {
      skillId: 'staff-thrust',
      slot: 'skill2',
      maxLevel: 5,
      upgradeCosts: [{ gold: 40 }, { gold: 70 }, { gold: 100 }, { gold: 150 }],
      levelModifiers: [
        { level: 1, damageMultiplier: 1 },
        { level: 2, damageMultiplier: 1.04 },
        { level: 3, damageMultiplier: 1.08 },
        { level: 4, damageMultiplier: 1.12 },
        { level: 5, damageMultiplier: 1.16 },
      ],
    },
    skill3: {
      skillId: 'staff-sweep',
      slot: 'skill3',
      maxLevel: 5,
      upgradeCosts: [{ gold: 40 }, { gold: 70 }, { gold: 100 }, { gold: 150 }],
      levelModifiers: [
        { level: 1, damageMultiplier: 1 },
        { level: 2, damageMultiplier: 1.04 },
        { level: 3, damageMultiplier: 1.08 },
        { level: 4, damageMultiplier: 1.12 },
        { level: 5, damageMultiplier: 1.16 },
      ],
    },
    ultimate: {
      skillId: 'golden-fury',
      slot: 'ultimate',
      maxLevel: 3,
      upgradeCosts: [{ gold: 100 }, { gold: 200 }],
      levelModifiers: [
        { level: 1, damageMultiplier: 1 },
        { level: 2, damageMultiplier: 1.1 },
        { level: 3, damageMultiplier: 1.2 },
      ],
    },
  },
  'pig-warrior': {
    skill1: {
      skillId: 'pig-skill1',
      slot: 'skill1',
      maxLevel: 3,
      upgradeCosts: [{ gold: 45 }, { gold: 90 }],
      levelModifiers: [
        { level: 1, damageMultiplier: 1 },
        { level: 2, damageMultiplier: 1.08 },
        { level: 3, damageMultiplier: 1.15 },
      ],
    },
  },
}

export interface TalentNodeDefinition {
  id: string
  name: string
  heroId: string
  prerequisites?: string[]
  cost?: SkillUpgradeCost
}

export const TALENT_NODE_FIXTURES: TalentNodeDefinition[] = [
  {
    id: 'mk-talent-1',
    name: 'ท่าเบา (test)',
    heroId: 'monkey-king',
    cost: { gold: 30 },
  },
  {
    id: 'mk-talent-2',
    name: 'ท่าแรง (test)',
    heroId: 'monkey-king',
    prerequisites: ['mk-talent-1'],
    cost: { gold: 60 },
  },
]

export const AWAKENING_TIER_FIXTURE_COSTS: Record<number, SkillUpgradeCost> = {
  1: { gold: 200 },
  2: { gold: 400 },
  3: { gold: 800 },
}
