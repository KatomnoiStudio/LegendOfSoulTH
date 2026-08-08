import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillKit,
  RealtimeSkillDefinition,
  SkillSlot,
} from '../../realtimeBattle/skills'

const CHARACTER_ID = 'nezha-warden'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: CHARACTER_ID }
}

const controlBase: AttackDefinition = {
  id: 'nezha-skill-base',
  animationId: 'skill-1',
  startupMs: 140,
  activeMs: 100,
  recoveryMs: 360,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1,
  range: 135,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 95,
  knockback: 40,
  hitstunMs: 200,
  lungeDistance: 24,
}

export const NEZHA_WARDEN_KIT: RealtimeSkillKit = {
  characterId: CHARACTER_ID,
  skill1: skill('skill1', {
    id: 'nezha-ring-bind',
    name: 'แหวนผูกมัด',
    attack: {
      ...controlBase,
      id: 'nezha-ring-bind',
      damageMultiplier: 0.6,
      effects: [{ kind: 'cc', target: 'nearestEnemy', ccType: 'root', ccDurationMs: 1500 }],
    },
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
    targetLock: 'nearest',
  }),
  skill2: skill('skill2', {
    id: 'nezha-fire-wheel',
    name: 'ล้อไฟจักร',
    attack: {
      ...controlBase,
      id: 'nezha-fire-wheel',
      hitShape: 'radial',
      arcDegrees: 360,
      range: 150,
      damageMultiplier: 1.1,
      effects: [{ kind: 'cc', target: 'allEnemies', ccType: 'stun', ccDurationMs: 900 }],
    },
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill3: skill('skill3', {
    id: 'nezha-spear-flurry',
    name: 'หอกพลิ้ว',
    attack: {
      ...controlBase,
      id: 'nezha-spear-flurry',
      damageMultiplier: 1.35,
      lungeDistance: 36,
    },
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  ultimate: skill('ultimate', {
    id: 'nezha-domain-lock',
    name: 'อาณาเขตจักร',
    attack: {
      ...controlBase,
      id: 'nezha-domain-lock',
      damageMultiplier: 0.8,
      range: 200,
      hitShape: 'radial',
      arcDegrees: 360,
      effects: [{ kind: 'cc', target: 'allEnemies', ccType: 'root', ccDurationMs: 2000 }],
    },
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
  }),
}
