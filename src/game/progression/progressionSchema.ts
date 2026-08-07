import type { SkillSlot } from '../realtimeBattle/skills'

export type SkillSlotId = SkillSlot

export interface TalentProgressState {
  unlockedNodes: string[]
}

export interface AwakeningProgressState {
  tier: number
  unlockedEffects?: string[]
}

/** Authoritative per-hero progression snapshot (maps to OwnedCharacter fields). */
export interface HeroProgress {
  heroId: string
  level: number
  currentExp: number
  expToNext: number
  skillLevels: Record<SkillSlotId, number>
  talentState: TalentProgressState
  awakeningState: AwakeningProgressState
  version: number
}

export interface HeroExpResult {
  heroId: string
  previousLevel: number
  newLevel: number
  previousExp: number
  newExp: number
  levelsGained: number
  expToNext: number
  atMaxLevel: boolean
}

export interface SkillUpgradeResult {
  success: boolean
  heroId: string
  skillSlot: SkillSlotId
  previousLevel: number
  newLevel: number
  error?: string
}

export interface TalentUnlockResult {
  success: boolean
  heroId: string
  nodeId: string
  error?: string
}

export interface AwakeningAdvanceResult {
  success: boolean
  heroId: string
  previousTier: number
  newTier: number
  error?: string
}

export interface ProgressionSaveData {
  schemaVersion: number
  heroes: Record<string, HeroProgress>
}

export interface HeroCombatStats {
  hp: number
  atk: number
  def: number
  spd: number
}

export interface SkillLevelModifier {
  level: number
  damageMultiplier?: number
  healMultiplier?: number
  cooldownOverride?: number
  effectOverrides?: Record<string, unknown>
}

export interface SkillUpgradePreview {
  skillSlot: SkillSlotId
  skillName: string
  currentLevel: number
  nextLevel: number | null
  maxLevel: number
  costLabel: string
  canUpgrade: boolean
  reason?: string
  modifiers?: {
    current?: SkillLevelModifier
    next?: SkillLevelModifier
  }
}

export interface HeroProgressionViewModel {
  heroId: string
  heroName: string
  level: number
  currentExp: number
  expToNext: number
  expProgressRatio: number
  atMaxLevel: boolean
  stats: HeroCombatStats
  skills: SkillUpgradePreview[]
  talentNodes: Array<{
    id: string
    name: string
    unlocked: boolean
    canUnlock: boolean
    costLabel: string
    reason?: string
  }>
  awakening: {
    tier: number
    maxTier: number
    canAdvance: boolean
    summary: string
  }
  nonProductionBalance: boolean
}

export type ProgressionEvent =
  | { type: 'HeroExpChanged'; heroId: string; result: HeroExpResult }
  | { type: 'HeroLevelUp'; heroId: string; result: HeroExpResult }
  | { type: 'SkillUpgraded'; heroId: string; result: SkillUpgradeResult }
  | { type: 'TalentUnlocked'; heroId: string; result: TalentUnlockResult }
  | { type: 'AwakeningChanged'; heroId: string; result: AwakeningAdvanceResult }
