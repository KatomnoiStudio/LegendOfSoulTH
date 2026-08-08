import { SKILL_CONFIG, type AttackDefinition } from '../../realtimeBattle/attacks'
import {
  MONKEY_GOLDEN_FURY,
  MONKEY_SPINNING_STAFF,
  MONKEY_STAFF_SWEEP,
  MONKEY_STAFF_THRUST,
} from '../../realtimeBattle/attacks'
import type {
  RealtimeSkillKit,
  RealtimeSkillDefinition,
  SkillSlot,
} from '../../realtimeBattle/skills'

function skill(
  slot: SkillSlot,
  partial: Omit<RealtimeSkillDefinition, 'slot' | 'characterId'>,
): RealtimeSkillDefinition {
  return { ...partial, slot, characterId: 'monkey-king' }
}

export const MONKEY_KING_KIT: RealtimeSkillKit = {
  characterId: 'monkey-king',
  skill1: skill('skill1', {
    id: 'spinning-golden-staff',
    name: 'กระบวนทองคำ',
    attack: MONKEY_SPINNING_STAFF,
    cooldownMs: SKILL_CONFIG.skill1CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill2: skill('skill2', {
    id: 'staff-thrust',
    name: 'แทงไม้เท้า',
    attack: MONKEY_STAFF_THRUST,
    cooldownMs: SKILL_CONFIG.skill2CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  skill3: skill('skill3', {
    id: 'staff-sweep',
    name: 'กวาดไม้กว้าง',
    attack: MONKEY_STAFF_SWEEP,
    cooldownMs: SKILL_CONFIG.skill3CooldownMs,
    invulnerableMs: SKILL_CONFIG.invulnerableMs,
  }),
  ultimate: skill('ultimate', {
    id: 'golden-fury',
    name: 'คลื่นทองคำ',
    attack: MONKEY_GOLDEN_FURY,
    cooldownMs: 0,
    invulnerableMs: SKILL_CONFIG.ultimateInvulnerableMs,
    targetLock: 'nearest',
  }),
}

export type { AttackDefinition }
