import { describe, expect, it } from 'vitest'
import {
  MONKEY_GOLDEN_FURY,
  MONKEY_SPINNING_STAFF,
  MONKEY_STAFF_SWEEP,
  MONKEY_STAFF_THRUST,
  SKILL_CONFIG,
  totalDurationMs,
} from './attacks'
import { getRealtimeSkillKit, getSkillFromKit } from './skills'
import {
  canStartSkill,
  createSkillState,
  isCastingSkill,
  startSkill,
  stepSkill,
} from './SkillSystem'
import { ULTIMATE_GAUGE_CONFIG } from './ultimateGauge'
import type { RealtimeBattleEntity } from './types'

function player(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'player',
    entityType: 'player',
    name: 'หงอคง',
    position: { x: 900, y: 550 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    combatFacing: 'right',
    state: 'idle',
    hp: 300,
    maxHp: 300,
    atk: 90,
    def: 60,
    speed: 275,
    collisionRadius: 34,
    hurtboxRadius: 42,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    characterId: 'monkey-king',
    ...overrides,
  }
}

function enemy(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    ...player({ characterId: undefined }),
    id: 'enemy',
    entityType: 'enemy',
    name: 'ศัตรู',
    ...overrides,
  }
}

describe('skills registry', () => {
  it('หงอคงมี kit 3 สกิล + อัลติเมท', () => {
    const kit = getRealtimeSkillKit('monkey-king')
    expect(kit?.skill1.id).toBe('spinning-golden-staff')
    expect(kit?.skill1.attack).toBe(MONKEY_SPINNING_STAFF)
    expect(kit?.skill2.attack).toBe(MONKEY_STAFF_THRUST)
    expect(kit?.skill3.attack).toBe(MONKEY_STAFF_SWEEP)
    expect(kit?.ultimate.attack).toBe(MONKEY_GOLDEN_FURY)
    expect(kit?.skill1.cooldownMs).toBe(SKILL_CONFIG.skill1CooldownMs)
  })

  it('ตัวละครที่ไม่มี kit คืน undefined', () => {
    expect(getRealtimeSkillKit('pig-warrior')).toBeUndefined()
    expect(getRealtimeSkillKit(undefined)).toBeUndefined()
  })
})

describe('SkillSystem', () => {
  it('เริ่มร่ายสกิล 1 ได้เมื่อพร้อม และตั้งคูลดาวน์ช่องนั้น + i-frame', () => {
    const unit = player()
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const definition = getSkillFromKit(kit, 'skill1')

    expect(startSkill(unit, skill, definition, 1000)).toBe(true)
    expect(isCastingSkill(skill)).toBe(true)
    expect(unit.state).toBe('skill')
    expect(unit.skillCooldownsMs.skill1).toBe(SKILL_CONFIG.skill1CooldownMs)
    expect(unit.invulnerableUntilMs).toBe(1000 + definition.invulnerableMs)
  })

  it('ร่ายซ้ำช่องเดียวไม่ได้ระหว่างคูลดาวน์หรือกำลังร่ายอยู่', () => {
    const unit = player({ skillCooldownsMs: { skill1: 500, skill2: 0, skill3: 0 } })
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const definition = getSkillFromKit(kit, 'skill1')

    expect(canStartSkill(unit, skill, definition, false)).toBe(false)

    unit.skillCooldownsMs.skill1 = 0
    startSkill(unit, skill, definition, 0)
    expect(canStartSkill(unit, skill, definition, false)).toBe(false)
  })

  it('อัลติเมทใช้ได้เมื่อ gauge เต็ม และรีเซ็ต gauge หลังร่าย', () => {
    const unit = player({ ultimateGauge: ULTIMATE_GAUGE_CONFIG.max })
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const ultimate = getSkillFromKit(kit, 'ultimate')

    expect(canStartSkill(unit, skill, ultimate, false)).toBe(true)
    startSkill(unit, skill, ultimate, 0)
    expect(unit.ultimateGauge).toBe(0)
  })

  it('อัลติเมทใช้ไม่ได้เมื่อ gauge ยังไม่เต็ม', () => {
    const unit = player({ ultimateGauge: 50 })
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const ultimate = getSkillFromKit(kit, 'ultimate')

    expect(canStartSkill(unit, skill, ultimate, false)).toBe(false)
  })

  it('hitbox เปิดเฉพาะช่วง active ของท่า', () => {
    const unit = player()
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const definition = getSkillFromKit(kit, 'skill1')

    startSkill(unit, skill, definition, 0)

    const startup = definition.attack.startupMs - 1
    expect(stepSkill(unit, skill, startup).hitboxActive).toBe(false)

    const active = definition.attack.activeMs
    expect(stepSkill(unit, skill, active).hitboxActive).toBe(true)
  })

  it('จบท่าแล้วกลับ idle และเคลียร์สถานะสกิล', () => {
    const unit = player()
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const definition = getSkillFromKit(kit, 'skill1')

    startSkill(unit, skill, definition, 0)
    stepSkill(unit, skill, totalDurationMs(definition.attack) + 1)

    expect(isCastingSkill(skill)).toBe(false)
    expect(unit.state).toBe('idle')
  })

  it('โดนตีจนสตันระหว่างร่าย = ยกเลิกสกิล', () => {
    const unit = player()
    const skill = createSkillState()
    const kit = getRealtimeSkillKit('monkey-king')
    if (!kit) throw new Error('ไม่พบ kit หงอคง')
    const definition = getSkillFromKit(kit, 'skill1')

    startSkill(unit, skill, definition, 0)
    unit.hitStunRemainingMs = 120
    stepSkill(unit, skill, 16)

    expect(isCastingSkill(skill)).toBe(false)
  })
})

describe('targetLock: nearest (ระบบ #8 Skill-Targeting System)', () => {
  const kit = getRealtimeSkillKit('monkey-king')
  if (!kit) throw new Error('ไม่พบ kit หงอคง')
  const ultimate = getSkillFromKit(kit, 'ultimate') // attack.targetLock === 'nearest'
  const skill1 = getSkillFromKit(kit, 'skill1') // ไม่มี targetLock

  function readyUltimate(): RealtimeBattleEntity {
    return player({ ultimateGauge: ULTIMATE_GAUGE_CONFIG.max })
  }

  it('ล็อกศัตรูที่ใกล้ผู้ร่ายที่สุดตอนเริ่มร่าย (done-criterion #2)', () => {
    const unit = readyUltimate()
    const skill = createSkillState()
    const near = enemy({ id: 'near', position: { x: 950, y: 550 } })
    const far = enemy({ id: 'far', position: { x: 1400, y: 550 } })

    startSkill(unit, skill, ultimate, 0, [far, near])

    expect(skill.lockedTargetId).toBe('near')
  })

  it('0 ศัตรูตอนเริ่มร่าย = ไม่ล็อกเป้า ไม่ crash (done-criterion #1)', () => {
    const unit = readyUltimate()
    const skill = createSkillState()

    expect(() => startSkill(unit, skill, ultimate, 0, [])).not.toThrow()
    expect(skill.lockedTargetId).toBeUndefined()
    expect(isCastingSkill(skill)).toBe(true)
  })

  it('ไม่นับศัตรูที่ตายแล้วเป็นเป้าที่ล็อกได้', () => {
    const unit = readyUltimate()
    const skill = createSkillState()
    const dead = enemy({ id: 'dead', position: { x: 901, y: 550 }, state: 'dead', hp: 0 })
    const alive = enemy({ id: 'alive', position: { x: 1300, y: 550 } })

    startSkill(unit, skill, ultimate, 0, [dead, alive])

    expect(skill.lockedTargetId).toBe('alive')
  })

  it('ท่าไม่มี targetLock ไม่ตั้ง lockedTargetId แม้มีศัตรูอยู่ (done-criterion #4)', () => {
    const unit = player({ skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 } })
    const skill = createSkillState()
    const near = enemy({ id: 'near', position: { x: 950, y: 550 } })

    startSkill(unit, skill, skill1, 0, [near])

    expect(skill.lockedTargetId).toBeUndefined()
  })

  it('เป้าที่ล็อกไว้ยังคงเดิมแม้รายชื่อศัตรูที่ส่งเข้ามาเปลี่ยนหลังเริ่มร่าย (done-criterion #2)', () => {
    const unit = readyUltimate()
    const skill = createSkillState()
    const original = enemy({ id: 'original', position: { x: 950, y: 550 } })

    startSkill(unit, skill, ultimate, 0, [original])
    expect(skill.lockedTargetId).toBe('original')

    // ศัตรูใหม่ที่ใกล้กว่าปรากฏหลังเริ่มร่าย — lockedTargetId ต้องไม่เปลี่ยนเพราะ
    // resolve เกิดครั้งเดียวตอน startSkill เท่านั้น (stepSkill ไม่ query ซ้ำ)
    stepSkill(unit, skill, 16)
    expect(skill.lockedTargetId).toBe('original')
  })

  it('จบท่าแล้วเคลียร์ lockedTargetId เหมือน hitTargets', () => {
    const unit = readyUltimate()
    const skill = createSkillState()
    const near = enemy({ id: 'near', position: { x: 950, y: 550 } })

    startSkill(unit, skill, ultimate, 0, [near])
    stepSkill(unit, skill, totalDurationMs(ultimate.attack) + 1)

    expect(skill.lockedTargetId).toBeUndefined()
  })
})
