import type { OwnedCharacter, SkillLevels } from '../../types/player'

/**
 * ระบบเลเวลสกิล (work contract #14 — Progression System, §4.2 "Hero Level → Star → Skill Level")
 *
 * แต่ละฮีโร่มี 4 ช่องสกิล (skill1-3 + ultimate ดู skills.ts) เลเวลอัพแยกช่องกัน ด้วยเส้นโค้ง
 * เดียวกับ Hero Level (*1.2 ต่อเลเวล ดู RewardSystem.ts:applyBattleExp) — ไม่มี RNG (deterministic)
 * ตัวเลขเริ่มต้น/ต้นทุนวัสดุจริงรอ P8 (AGENT_BLUEPRINT.md:81) จุดนี้แค่ทำให้ระบบมีอยู่จริง
 *
 * ตั้งใจ inline เส้นโค้งแยกจาก applyBattleExp แทนแชร์ helper — สองเส้นโค้งที่เกือบเหมือนกัน
 * ยังไม่คุ้มทำ abstraction จนกว่าจะมีเส้นที่ 3 หรือ diverge จริง (ดู Low-maintenance-cost design
 * ใน docs/agent-blueprint/14-progression-system.md)
 */

export type SkillSlotId = 'skill1' | 'skill2' | 'skill3' | 'ultimate'

/** EXP เริ่มต้นที่ต้องใช้ขึ้นเลเวล 2 ของสกิล — ตัวเลขจริงรอ P8 */
const DEFAULT_SKILL_EXP_TO_NEXT = 200

/**
 * สร้างค่าเริ่มต้นของเลเวลสกิลทั้ง 4 ช่อง — จุดเดียวที่ทั้ง accountRepository.ts และ
 * accountRepository.supabase.ts ต้องเรียกใช้ตอนสร้าง/เติม OwnedCharacter ใหม่ ป้องกัน shape
 * เพี้ยนระหว่างสอง backend (done-criterion #1)
 */
export function createDefaultSkillLevels(): SkillLevels {
  const progress = { level: 1, exp: 0, expToNext: DEFAULT_SKILL_EXP_TO_NEXT }
  return {
    skill1: { ...progress },
    skill2: { ...progress },
    skill3: { ...progress },
    ultimate: { ...progress },
  }
}

/** บวก EXP ให้สกิลช่องเดียว — คืน character เดิมถ้า earnedExp <= 0 (no-op, เหมือน applyBattleExp) */
export function applySkillExp(
  character: OwnedCharacter,
  slot: SkillSlotId,
  earnedExp: number,
): OwnedCharacter {
  if (earnedExp <= 0) return character

  let { level, exp, expToNext } = character.skillLevels[slot]
  exp += earnedExp
  let guard = 0
  while (exp >= expToNext && expToNext > 0 && guard < 20) {
    exp -= expToNext
    level += 1
    expToNext = Math.max(1, Math.round(expToNext * 1.2))
    guard += 1
  }

  return {
    ...character,
    skillLevels: { ...character.skillLevels, [slot]: { level, exp, expToNext } },
  }
}

/**
 * เลเวลที่ใช้จริงของฮีโร่ตัวนี้ (Hero Level + Skill Level ทั้ง 4 ช่อง) — shape อ่านล้วน ๆ
 * ที่ระบบ PvP Power Normalization (#20) จะมาอ่านต่อเพื่อ override เป็น ranked baseline
 * (การ override เป็นงานของ #20 เอง ที่นี่แค่เปิด read surface ให้ตามสัญญา done-criterion #5)
 */
export interface EffectiveLevels {
  heroLevel: number
  skillLevels: Record<SkillSlotId, number>
}

export function getEffectiveLevels(character: OwnedCharacter): EffectiveLevels {
  return {
    heroLevel: character.level,
    skillLevels: {
      skill1: character.skillLevels.skill1.level,
      skill2: character.skillLevels.skill2.level,
      skill3: character.skillLevels.skill3.level,
      ultimate: character.skillLevels.ultimate.level,
    },
  }
}
