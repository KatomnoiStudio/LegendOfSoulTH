import {
  ERLANG_GOLDEN_LIGHTNING,
  MONKEY_SPINNING_STAFF,
  SKILL_CONFIG,
  type AttackDefinition,
} from './attacks'

/**
 * ทะเบียนสกิลของห้องต่อสู้ real-time (§18)
 *
 * แยกจากทะเบียนสกิลของระบบเทิร์นเดิมโดยตั้งใจ — สองระบบห้ามใช้ type ร่วมกัน
 * (ไฟล์ของระบบเทิร์นถูกลบไปพร้อมระบบนั้นแล้ว ดูของเดิมได้จากประวัติ git)
 * ไฟล์นี้เป็น Data Registry จุดเดียวสำหรับสกิลที่ผู้เล่นกดใช้ในห้องเรียลไทม์
 */

export interface RealtimeSkillDefinition {
  id: string
  name: string
  /** characterId ที่ใช้สกิลนี้ได้ (ดู src/game/characters.ts) */
  characterId: string
  attack: AttackDefinition
  cooldownMs: number
  invulnerableMs: number
}

export type SkillAnimationId = 'skill-1' | 'skill-2'

export const REALTIME_CHARACTER_SKILLS: Record<
  string,
  Partial<Record<SkillAnimationId, RealtimeSkillDefinition>>
> = {
  'spear-warrior': {
    'skill-1': {
      id: 'spinning-golden-staff',
      name: 'กระบวนทองคำ',
      characterId: 'spear-warrior',
      attack: MONKEY_SPINNING_STAFF,
      cooldownMs: SKILL_CONFIG.cooldownMs,
      invulnerableMs: SKILL_CONFIG.invulnerableMs,
    },
    'skill-2': {
      id: 'erlang-golden-lightning',
      name: 'อสนีทองคำ',
      characterId: 'spear-warrior',
      attack: ERLANG_GOLDEN_LIGHTNING,
      cooldownMs: SKILL_CONFIG.cooldownMs,
      invulnerableMs: SKILL_CONFIG.invulnerableMs,
    },
  },
}

export function getRealtimeSkillForCharacter(
  characterId: string | undefined,
  animationId: SkillAnimationId = 'skill-1',
): RealtimeSkillDefinition | undefined {
  if (!characterId) return undefined
  return REALTIME_CHARACTER_SKILLS[characterId]?.[animationId]
}
