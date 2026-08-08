import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillKit,
  RealtimeSkillDefinition,
  SkillSlot,
} from '../../realtimeBattle/skills'

const CHARACTER_ID = 'celestial-archer'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: CHARACTER_ID }
}

const rangedBase: AttackDefinition = {
  id: 'archer-skill-base',
  animationId: 'skill-1',
  startupMs: 120,
  activeMs: 80,
  recoveryMs: 320,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1.2,
  range: 460,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 65,
  knockback: 25,
  hitstunMs: 180,
  lungeDistance: 0,
}

export const CELESTIAL_ARCHER_KIT: RealtimeSkillKit = {
  characterId: CHARACTER_ID,
  skill1: skill('skill1', {
    id: 'archer-volley',
    name: 'ลูกธนูพุ่ง',
    attack: { ...rangedBase, id: 'archer-volley', damageMultiplier: 1.4 },
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill2: skill('skill2', {
    id: 'archer-pin-shot',
    name: 'ยิงตรึง',
    attack: {
      ...rangedBase,
      id: 'archer-pin-shot',
      damageMultiplier: 1.15,
      effects: [{ kind: 'cc', target: 'nearestEnemy', ccType: 'root', ccDurationMs: 800 }],
    },
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
    targetLock: 'nearest',
  }),
  skill3: skill('skill3', {
    id: 'archer-rain',
    name: 'ฝนธนู',
    attack: {
      ...rangedBase,
      id: 'archer-rain',
      hitShape: 'radial',
      arcDegrees: 120,
      range: 400,
      damageMultiplier: 1.3,
      multiTarget: true,
    },
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  ultimate: skill('ultimate', {
    id: 'archer-execute',
    name: 'ลูกศรพิพากษา',
    attack: {
      ...rangedBase,
      id: 'archer-execute',
      damageMultiplier: 2.4,
      range: 500,
      targetLock: 'nearest',
    },
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
    targetLock: 'nearest',
  }),
}
