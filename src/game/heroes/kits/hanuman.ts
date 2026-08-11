import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillDefinition,
  RealtimeSkillKit,
  SkillSlot,
} from '../../realtimeBattle/skills'

const CHARACTER_ID = 'hanuman'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: CHARACTER_ID }
}

/** หาวเป็นดาวเป็นเดือน — กายสิทธิ์ระยะไกล พ่นดาว/พระจันทร์เป็นเส้นตรงไปข้างหน้า */
const STAR_MOON_YAWN: AttackDefinition = {
  id: 'hanuman-star-moon-yawn',
  animationId: 'skill-1',
  startupMs: 300,
  activeMs: 200,
  recoveryMs: 420,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1.6,
  range: 340,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 100,
  knockback: 90,
}

/** ขยายกายทุบพิภพ — ขยายร่างยักษ์แล้วทุบพื้น คลื่นทองแผ่รอบตัว */
const GIANT_GROUND_SLAM: AttackDefinition = {
  id: 'hanuman-giant-ground-slam',
  animationId: 'skill-2',
  startupMs: 380,
  activeMs: 220,
  recoveryMs: 520,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1.85,
  range: 220,
  hitShape: 'radial',
  arcDegrees: 360,
  depthTolerance: 0,
  knockback: 220,
}

/** เหินฟาด — กระโดดขึ้นแล้วทิ่มตรีศูลลงมาใส่ศัตรูตรงหน้า (ยืมภาพ Attack 3) */
const JUMP_STRIKE: AttackDefinition = {
  id: 'hanuman-jump-strike',
  animationId: 'attack-3',
  startupMs: 240,
  activeMs: 140,
  recoveryMs: 380,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1.7,
  range: 200,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 100,
  knockback: 160,
}

/** เผาลงกา — อัลติเมท หางไฟลุกโชติช่วงระเบิดรอบตัว ดาเมจ/knockback สูงสุดของหนุมาน */
const BURNING_LANKA: AttackDefinition = {
  id: 'hanuman-burning-lanka',
  animationId: 'ultimate',
  startupMs: 260,
  activeMs: 480,
  recoveryMs: 600,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 2.3,
  range: 260,
  hitShape: 'radial',
  arcDegrees: 360,
  depthTolerance: 0,
  knockback: 260,
  targetLock: 'nearest',
}

export const HANUMAN_KIT: RealtimeSkillKit = {
  characterId: CHARACTER_ID,
  skill1: skill('skill1', {
    id: 'hanuman-star-moon-yawn',
    name: 'หาวเป็นดาวเป็นเดือน',
    attack: STAR_MOON_YAWN,
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill2: skill('skill2', {
    id: 'hanuman-giant-ground-slam',
    name: 'ขยายกายทุบพิภพ',
    attack: GIANT_GROUND_SLAM,
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill3: skill('skill3', {
    id: 'hanuman-jump-strike',
    name: 'เหินฟาด',
    attack: JUMP_STRIKE,
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  ultimate: skill('ultimate', {
    id: 'hanuman-burning-lanka',
    name: 'เผาลงกา',
    attack: BURNING_LANKA,
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
    targetLock: 'nearest',
  }),
}
