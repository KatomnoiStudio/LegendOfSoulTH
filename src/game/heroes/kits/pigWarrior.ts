import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillKit,
  RealtimeSkillDefinition,
  SkillSlot,
} from '../../realtimeBattle/skills'

const CHARACTER_ID = 'pig-warrior'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: CHARACTER_ID }
}

function heavyAttack(id: string, overrides: Partial<AttackDefinition> = {}): AttackDefinition {
  return {
    id,
    animationId: 'skill-1',
    startupMs: 200,
    activeMs: 140,
    recoveryMs: 480,
    comboWindowStartMs: 0,
    comboWindowEndMs: 0,
    damageMultiplier: 1.4,
    range: 145,
    hitShape: 'horizontal',
    arcDegrees: 0,
    depthTolerance: 105,
    knockback: 180,
    hitstunMs: 240,
    lungeDistance: 40,
    ...overrides,
  }
}

export const PIG_WARRIOR_KIT: RealtimeSkillKit = {
  characterId: CHARACTER_ID,
  skill1: skill('skill1', {
    id: 'pig-ground-slam',
    name: 'ทุบพื้นสะท้าน',
    attack: heavyAttack('pig-ground-slam', {
      hitShape: 'radial',
      arcDegrees: 300,
      range: 155,
      damageMultiplier: 1.55,
      knockdown: true,
    }),
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill2: skill('skill2', {
    id: 'pig-charge',
    name: 'พุ่งชนทลาย',
    attack: heavyAttack('pig-charge', {
      damageMultiplier: 1.35,
      lungeDistance: 80,
      range: 130,
    }),
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill3: skill('skill3', {
    id: 'pig-iron-skin',
    name: 'ผิวเหล็ก',
    attack: heavyAttack('pig-iron-skin', {
      damageMultiplier: 0,
      range: 0,
      effects: [
        { kind: 'buff', target: 'self', buffType: 'def_up', magnitude: 0.25, durationMs: 6000 },
      ],
    }),
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  ultimate: skill('ultimate', {
    id: 'pig-devastator',
    name: 'ทำลายล้าง',
    attack: heavyAttack('pig-devastator', {
      damageMultiplier: 2.2,
      range: 160,
      knockdown: true,
      knockback: 300,
    }),
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
    targetLock: 'nearest',
  }),
}
