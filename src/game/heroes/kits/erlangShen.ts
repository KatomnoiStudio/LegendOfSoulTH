import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillDefinition,
  RealtimeSkillKit,
  SkillSlot,
} from '../../realtimeBattle/skills'

const CHARACTER_ID = 'spear-warrior'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: CHARACTER_ID }
}

const LIGHTNING_STRIKE: AttackDefinition = {
  id: 'erlang-lightning-strike',
  animationId: 'skill-1',
  startupMs: 520,
  activeMs: 140,
  recoveryMs: 360,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1.65,
  range: 360,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 105,
  knockback: 130,
  hitstunMs: 220,
}

const THREE_HOUND_ASSAULT: AttackDefinition = {
  id: 'erlang-three-hound-assault',
  animationId: 'skill-2',
  // 600ms casting frames → 630ms aura → hounds strike after the visual reaches the target.
  startupMs: 1450,
  activeMs: 120,
  recoveryMs: 330,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 2.1,
  range: 520,
  hitShape: 'horizontal',
  arcDegrees: 0,
  depthTolerance: 140,
  knockback: 180,
  hitstunMs: 280,
  targetLock: 'nearest',
}

export const ERLANG_SHEN_KIT: RealtimeSkillKit = {
  characterId: CHARACTER_ID,
  skill1: skill('skill1', {
    id: 'erlang-lightning-strike',
    name: 'อสนีบาตสวรรค์',
    attack: LIGHTNING_STRIKE,
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
    targetLock: 'nearest',
  }),
  skill2: skill('skill2', {
    id: 'erlang-three-hound-assault',
    name: 'บัญชาหมาสวรรค์สามตน',
    attack: THREE_HOUND_ASSAULT,
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
    targetLock: 'nearest',
  }),
  skill3: skill('skill3', {
    id: 'erlang-spear-tempest',
    name: 'พายุหอกสามคม',
    attack: { ...LIGHTNING_STRIKE, id: 'erlang-spear-tempest', damageMultiplier: 1.8 },
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
    targetLock: 'nearest',
  }),
  ultimate: skill('ultimate', {
    id: 'erlang-celestial-judgement',
    name: 'พิพากษาสวรรค์',
    attack: { ...LIGHTNING_STRIKE, id: 'erlang-celestial-judgement', damageMultiplier: 2.4 },
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
    targetLock: 'nearest',
  }),
}
