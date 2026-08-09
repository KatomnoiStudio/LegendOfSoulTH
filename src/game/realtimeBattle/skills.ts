import { HERO_SKILL_KITS } from '../heroes/kits'
import type { AttackDefinition } from './attacks'

/**
 * ทะเบียนสกิลของห้องต่อสู้ real-time (Blueprint v3 P3)
 *
 * แต่ละฮีโร่มี 3 skills + 1 ultimate — แยกจากระบบเทิร์นเดิมโดยตั้งใจ
 */

export type SkillSlot = 'skill1' | 'skill2' | 'skill3' | 'ultimate'

export type TargetLockMode = 'none' | 'nearest'

export interface RealtimeSkillDefinition {
  id: string
  name: string
  slot: SkillSlot
  /** characterId ที่ใช้สกิลนี้ได้ (ดู src/game/characters.ts) */
  characterId: string
  attack: AttackDefinition
  cooldownMs: number
  invulnerableMs: number
  targetLock?: TargetLockMode
}

export interface RealtimeSkillKit {
  characterId: string
  skill1: RealtimeSkillDefinition
  skill2: RealtimeSkillDefinition
  skill3: RealtimeSkillDefinition
  ultimate: RealtimeSkillDefinition
}

export const REALTIME_CHARACTER_KITS: Record<string, RealtimeSkillKit> = HERO_SKILL_KITS

export function getRealtimeSkillKit(characterId: string | undefined): RealtimeSkillKit | undefined {
  if (!characterId) return undefined
  return REALTIME_CHARACTER_KITS[characterId]
}

export function getSkillFromKit(kit: RealtimeSkillKit, slot: SkillSlot): RealtimeSkillDefinition {
  return kit[slot]
}

/** @deprecated ใช้ getRealtimeSkillKit + getSkillFromKit แทน — คืน skill1 เพื่อ backward compat ในเทสต์เก่า */
export function getRealtimeSkillForCharacter(
  characterId: string | undefined,
): RealtimeSkillDefinition | undefined {
  const kit = getRealtimeSkillKit(characterId)
  return kit?.skill1
}
