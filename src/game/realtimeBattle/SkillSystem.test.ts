import { describe, expect, it } from 'vitest'
import {
  ERLANG_GOLDEN_LIGHTNING,
  MONKEY_SPINNING_STAFF,
  SKILL_CONFIG,
  totalDurationMs,
} from './attacks'
import { getRealtimeSkillForCharacter } from './skills'
import {
  canStartSkill,
  createSkillState,
  isCastingSkill,
  startSkill,
  stepSkill,
} from './SkillSystem'
import type { RealtimeBattleEntity } from './types'

function player(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'player',
    entityType: 'player',
    name: 'หงอคง',
    position: { x: 900, y: 550 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    state: 'idle',
    hp: 300,
    maxHp: 300,
    atk: 90,
    def: 60,
    speed: 275,
    collisionRadius: 34,
    hurtboxRadius: 42,
    attackCooldownRemainingMs: 0,
    skillCooldownRemainingMs: 0,
    dashCooldownRemainingMs: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    characterId: 'spear-warrior',
    ...overrides,
  }
}

describe('skills registry', () => {
  it('หงอคงมีสกิลหมุนกระบวนทองคำ', () => {
    const skill = getRealtimeSkillForCharacter('spear-warrior')
    expect(skill?.id).toBe('spinning-golden-staff')
    expect(skill?.attack).toBe(MONKEY_SPINNING_STAFF)
    expect(skill?.cooldownMs).toBe(SKILL_CONFIG.cooldownMs)
  })

  it('Erlang can select the separate gold-lightning Skill 2', () => {
    const skill = getRealtimeSkillForCharacter('spear-warrior', 'skill-2')

    expect(skill?.id).toBe('erlang-golden-lightning')
    expect(skill?.attack).toBe(ERLANG_GOLDEN_LIGHTNING)
    expect(skill?.attack.animationId).toBe('skill-2')
    expect(totalDurationMs(ERLANG_GOLDEN_LIGHTNING)).toBe(600)
  })

  it('ตัวละครที่ไม่มีสกิลคืน undefined', () => {
    expect(getRealtimeSkillForCharacter('pig-warrior')).toBeUndefined()
    expect(getRealtimeSkillForCharacter(undefined)).toBeUndefined()
  })
})

describe('SkillSystem', () => {
  it('เริ่มร่ายสกิลได้เมื่อพร้อม และตั้งคูลดาวน์ + i-frame', () => {
    const unit = player()
    const skill = createSkillState()
    const definition = getRealtimeSkillForCharacter('spear-warrior')
    if (!definition) throw new Error('ไม่พบสกิลหงอคง')

    expect(startSkill(unit, skill, definition, 1000)).toBe(true)
    expect(isCastingSkill(skill)).toBe(true)
    expect(unit.state).toBe('skill')
    expect(unit.skillCooldownRemainingMs).toBe(SKILL_CONFIG.cooldownMs)
    expect(unit.invulnerableUntilMs).toBe(1000 + definition.invulnerableMs)
  })

  it('ร่ายซ้ำไม่ได้ระหว่างคูลดาวน์หรือกำลังร่ายอยู่', () => {
    const unit = player({ skillCooldownRemainingMs: 500 })
    const skill = createSkillState()
    const definition = getRealtimeSkillForCharacter('spear-warrior')
    if (!definition) throw new Error('ไม่พบสกิลหงอคง')

    expect(canStartSkill(unit, skill, false, false)).toBe(false)

    unit.skillCooldownRemainingMs = 0
    startSkill(unit, skill, definition, 0)
    expect(canStartSkill(unit, skill, false, false)).toBe(false)
  })

  it('hitbox เปิดเฉพาะช่วง active ของท่า', () => {
    const unit = player()
    const skill = createSkillState()
    const definition = getRealtimeSkillForCharacter('spear-warrior')
    if (!definition) throw new Error('ไม่พบสกิลหงอคง')

    startSkill(unit, skill, definition, 0)

    const startup = definition.attack.startupMs - 1
    expect(stepSkill(unit, skill, startup).hitboxActive).toBe(false)

    const active = definition.attack.activeMs
    expect(stepSkill(unit, skill, active).hitboxActive).toBe(true)
  })

  it('จบท่าแล้วกลับ idle และเคลียร์สถานะสกิล', () => {
    const unit = player()
    const skill = createSkillState()
    const definition = getRealtimeSkillForCharacter('spear-warrior')
    if (!definition) throw new Error('ไม่พบสกิลหงอคง')

    startSkill(unit, skill, definition, 0)
    stepSkill(unit, skill, totalDurationMs(definition.attack) + 1)

    expect(isCastingSkill(skill)).toBe(false)
    expect(unit.state).toBe('idle')
  })

  it('โดนตีจนสตันระหว่างร่าย = ยกเลิกสกิล', () => {
    const unit = player()
    const skill = createSkillState()
    const definition = getRealtimeSkillForCharacter('spear-warrior')
    if (!definition) throw new Error('ไม่พบสกิลหงอคง')

    startSkill(unit, skill, definition, 0)
    unit.hitStunRemainingMs = 120
    stepSkill(unit, skill, 16)

    expect(isCastingSkill(skill)).toBe(false)
  })
})
