import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillKit,
  RealtimeSkillDefinition,
  SkillSlot,
} from '../../realtimeBattle/skills'

const CHARACTER_ID = 'sand-sage'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: CHARACTER_ID }
}

const sageBase: AttackDefinition = {
  id: 'sage-skill-base',
  animationId: 'skill-1',
  startupMs: 150,
  activeMs: 110,
  recoveryMs: 380,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1,
  range: 140,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 90,
  knockback: 35,
  hitstunMs: 180,
  lungeDistance: 0,
}

export const SAND_SAGE_KIT: RealtimeSkillKit = {
  characterId: CHARACTER_ID,
  skill1: skill('skill1', {
    id: 'sage-healing-beads',
    name: 'ลูกประคำเยียวยา',
    attack: {
      ...sageBase,
      id: 'sage-healing-beads',
      damageMultiplier: 0,
      range: 0,
      effects: [{ kind: 'heal', target: 'self', healAmount: 180 }],
    },
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill2: skill('skill2', {
    id: 'sage-summon-guardian',
    name: 'เรียกทหารเงา',
    attack: {
      ...sageBase,
      id: 'sage-summon-guardian',
      damageMultiplier: 0,
      range: 0,
      effects: [{ kind: 'summon', target: 'self', summonId: 'shadow-soldier' }],
    },
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill3: skill('skill3', {
    id: 'sage-bead-burst',
    name: 'ระเบิดลูกประคำ',
    attack: {
      ...sageBase,
      id: 'sage-bead-burst',
      hitShape: 'radial',
      arcDegrees: 240,
      range: 165,
      damageMultiplier: 1.25,
    },
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  ultimate: skill('ultimate', {
    id: 'sage-legion-call',
    name: 'กองทัพทราย',
    attack: {
      ...sageBase,
      id: 'sage-legion-call',
      damageMultiplier: 0.5,
      range: 0,
      effects: [
        { kind: 'summon', target: 'self', summonId: 'shadow-soldier' },
        {
          kind: 'buff',
          target: 'allAllies',
          buffType: 'atk_up',
          magnitude: 0.15,
          durationMs: 8000,
        },
      ],
    },
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
  }),
}
