import {
  MONKEY_GOLDEN_FURY,
  MONKEY_SPINNING_STAFF,
  MONKEY_STAFF_SWEEP,
  MONKEY_STAFF_THRUST,
  SKILL_CONFIG,
  type AttackDefinition,
} from './attacks'

/**
 * ทะเบียนสกิลของห้องต่อสู้ real-time (Blueprint v3 P3)
 *
 * แต่ละฮีโร่มี 3 skills + 1 ultimate — แยกจากระบบเทิร์นเดิมโดยตั้งใจ
 */

export type SkillSlot = 'skill1' | 'skill2' | 'skill3' | 'ultimate'

export interface RealtimeSkillDefinition {
  id: string
  name: string
  slot: SkillSlot
  /** characterId ที่ใช้สกิลนี้ได้ (ดู src/game/characters.ts) */
  characterId: string
  attack: AttackDefinition
  cooldownMs: number
  invulnerableMs: number
}

export interface RealtimeSkillKit {
  characterId: string
  skill1: RealtimeSkillDefinition
  skill2: RealtimeSkillDefinition
  skill3: RealtimeSkillDefinition
  ultimate: RealtimeSkillDefinition
}

export const REALTIME_CHARACTER_KITS: Record<string, RealtimeSkillKit> = {
  'monkey-king': {
    characterId: 'monkey-king',
    skill1: {
      id: 'spinning-golden-staff',
      name: 'กระบวนทองคำ',
      slot: 'skill1',
      characterId: 'monkey-king',
      attack: MONKEY_SPINNING_STAFF,
      cooldownMs: SKILL_CONFIG.skill1CooldownMs,
      invulnerableMs: SKILL_CONFIG.invulnerableMs,
    },
    skill2: {
      id: 'staff-thrust',
      name: 'แทงไม้เท้า',
      slot: 'skill2',
      characterId: 'monkey-king',
      attack: MONKEY_STAFF_THRUST,
      cooldownMs: SKILL_CONFIG.skill2CooldownMs,
      invulnerableMs: SKILL_CONFIG.invulnerableMs,
    },
    skill3: {
      id: 'staff-sweep',
      name: 'กวาดไม้กว้าง',
      slot: 'skill3',
      characterId: 'monkey-king',
      attack: MONKEY_STAFF_SWEEP,
      cooldownMs: SKILL_CONFIG.skill3CooldownMs,
      invulnerableMs: SKILL_CONFIG.invulnerableMs,
    },
    ultimate: {
      id: 'golden-fury',
      name: 'คลื่นทองคำ',
      slot: 'ultimate',
      characterId: 'monkey-king',
      attack: MONKEY_GOLDEN_FURY,
      cooldownMs: 0,
      invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
    },
  },
}

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
