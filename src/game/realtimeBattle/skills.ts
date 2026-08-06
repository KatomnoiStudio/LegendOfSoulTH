import { MONKEY_SPINNING_STAFF, SKILL_CONFIG, type AttackDefinition } from './attacks'

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

export const REALTIME_CHARACTER_SKILLS: Record<string, RealtimeSkillDefinition> = {
  'monkey-king': {
    id: 'spinning-golden-staff',
    name: 'กระบวนทองคำ',
    characterId: 'monkey-king',
    attack: MONKEY_SPINNING_STAFF,
    cooldownMs: SKILL_CONFIG.cooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  },
}

export function getRealtimeSkillForCharacter(
  characterId: string | undefined,
): RealtimeSkillDefinition | undefined {
  if (!characterId) return undefined
  return REALTIME_CHARACTER_SKILLS[characterId]
}
