import { describe, expect, it, vi } from 'vitest'
import { PLAYER_ATTACK_CHAIN, type AttackDefinition } from './attacks'
import * as DamageSystem from './DamageSystem'
import { applyDamage, calcDamage } from './DamageSystem'
import { createEnemyBrain, stepEnemyAI } from './EnemyAISystem'
import {
  applyBuffEffect,
  applyCcEffect,
  applyHealEffect,
  resolveEffect,
  resolveSummonEffect,
  resolveTargets,
  type EffectContext,
  type EffectDefinition,
} from './EffectsSystem'
import { getEnemyTemplate } from './stageConfig'
import type { RealtimeBattleEntity } from './types'

/**
 * เทสต์ชุดนี้ pin ตาม Done-criteria ของ
 * docs/agent-blueprint/07-effects-system-non-damage.md — คอมเมนต์แต่ละ describe
 * อ้างเลข done-criterion ที่มันครอบคลุมตรง ๆ
 */

function unit(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'unit',
    entityType: 'enemy',
    name: 'ทดสอบ',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'down',
    combatFacing: 'right',
    state: 'idle',
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 20,
    speed: 130,
    collisionRadius: 34,
    hurtboxRadius: 40,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    ...overrides,
  }
}

function ctx(overrides: Partial<EffectContext> = {}): EffectContext {
  return {
    owner: unit({ id: 'owner', entityType: 'player' }),
    allies: [],
    enemies: [],
    ...overrides,
  }
}

describe('AttackDefinition.effects — shape (done-criterion #1)', () => {
  it('รับ effects[] ครบ 4 kind และ target union ทั้ง 7 ตัวได้ — คอมไพล์ผ่านคือหลักฐาน', () => {
    const withAllKinds: AttackDefinition = {
      ...PLAYER_ATTACK_CHAIN[0],
      effects: [
        { kind: 'heal', target: 'self', healAmount: 10 },
        {
          kind: 'buff',
          target: 'singleAlly',
          buffType: 'atk-up',
          magnitude: 1.2,
          durationMs: 5000,
        },
        { kind: 'cc', target: 'singleEnemy', ccType: 'stun', ccDurationMs: 1500 },
        { kind: 'summon', target: 'aoe', summonId: 'shadow-soldier' },
      ],
    }

    expect(withAllKinds.effects).toHaveLength(4)
    const targetsUsed = withAllKinds.effects?.map((effect) => effect.target) ?? []
    // ใช้ target selector ต่างชนิดกันจริง — ยืนยันว่า union ไม่ได้ผูกตายตัวกับ kind ใด kind หนึ่ง
    expect(new Set(targetsUsed).size).toBe(4)
  })

  it('target union ครบทั้ง 7 ตัวจาก §3.6.7 resolve ได้โดยไม่ throw', () => {
    const allSelectors: EffectDefinition['target'][] = [
      'self',
      'singleEnemy',
      'nearestEnemy',
      'allEnemies',
      'singleAlly',
      'allAllies',
      'aoe',
    ]
    const context = ctx({ enemies: [unit({ id: 'e1' })], allies: [unit({ id: 'a1' })] })
    for (const selector of allSelectors) {
      expect(() => resolveTargets(selector, context)).not.toThrow()
    }
  })
})

describe('pure-damage move ไม่มี effects — พฤติกรรมเดิมเป๊ะ (done-criterion #2)', () => {
  it('ท่าที่ shipped จริงไม่มี field effects ติดมา', () => {
    for (const attack of PLAYER_ATTACK_CHAIN) {
      expect(attack.effects).toBeUndefined()
    }
  })

  it('calcDamage/applyDamage ให้ผลเดิมทุกตัวเลข ไม่ถูก EffectsSystem แตะ (ตรึงค่ากับ DamageSystem.test.ts)', () => {
    const attacker = unit({ id: 'player', atk: 100, facing: 'right', position: { x: 400, y: 500 } })
    const target = unit({ def: 50, position: { x: 500, y: 500 } })
    let seed = 0
    const values = [0.5, 0.99]
    const random = () => values[Math.min(seed++, values.length - 1)]

    const outcome = calcDamage({
      attacker,
      target,
      attack: PLAYER_ATTACK_CHAIN[0],
      elapsedMs: 0,
      random,
    })
    expect(outcome.amount).toBe(79) // เลขเดิมจาก DamageSystem.test.ts — ยืนยันไม่มีอะไรเปลี่ยน

    seed = 0
    const applied = applyDamage({
      attacker,
      target,
      attack: PLAYER_ATTACK_CHAIN[0],
      elapsedMs: 1000,
      random,
    })
    expect(applied.amount).toBe(79)
    expect(target.hitStunRemainingMs).toBeGreaterThan(0)
  })
})

describe('resolveTargets — solo-hero fallback (done-criterion #3, §3.8.1)', () => {
  it('singleAlly/allAllies ตกกลับมาที่ owner เอง เมื่อไม่มีพวกพ้องตัวอื่นบนสนาม', () => {
    const owner = unit({ id: 'owner' })
    const context = ctx({ owner, allies: [] })

    expect(resolveTargets('singleAlly', context)).toEqual([owner])
    expect(resolveTargets('allAllies', context)).toEqual([owner])
  })

  it('มี summon ออกสนามอยู่ → เล็งกลุ่มพวกพ้องจริง ไม่ fallback', () => {
    const owner = unit({ id: 'owner' })
    const summon = unit({ id: 'summon-1', entityType: 'ally' })
    const context = ctx({ owner, allies: [summon] })

    expect(resolveTargets('singleAlly', context)).toEqual([summon])
    expect(resolveTargets('allAllies', context)).toEqual([summon])
  })

  it('พวกพ้องที่ตายแล้วไม่นับว่า "อยู่บนสนาม" — ยัง fallback กลับ self', () => {
    const owner = unit({ id: 'owner' })
    const deadAlly = unit({ id: 'dead-ally', entityType: 'ally', state: 'dead', hp: 0 })
    const context = ctx({ owner, allies: [deadAlly] })

    expect(resolveTargets('allAllies', context)).toEqual([owner])
  })
})

describe('cc effect — ไม่แตะ hit-reaction (done-criterion #4, §3.8.6)', () => {
  it('หลัง resolve cc แล้ว hitStunRemainingMs ของเป้าหมายไม่ถูกแตะเลย', () => {
    const target = unit({ id: 'mob', hitStunRemainingMs: 42, state: 'idle' })
    const context = ctx({ owner: unit({ id: 'owner' }), enemies: [target] })

    applyCcEffect(
      { kind: 'cc', target: 'singleEnemy', ccType: 'stun', ccDurationMs: 1200 },
      context,
    )

    // ค่าก่อนหน้าคือ 42 (sentinel) — ถ้า cc เผลอไปโดน hit-reaction จะถูกเขียนทับด้วยค่าอื่น
    expect(target.hitStunRemainingMs).toBe(42)
    expect(target.state).toBe('idle') // ไม่ถูกเปลี่ยนเป็น 'hit'
    expect(target.activeCc).toEqual([{ ccType: 'stun', remainingMs: 1200 }])
  })

  it('mob ปกติ (ไม่ใช่ elite/boss) ก็ติด cc ได้ — ไม่มีเงื่อนไข tier กีดกัน', () => {
    const mob = unit({ id: 'mob' })
    const context = ctx({ enemies: [mob] })

    const targets = applyCcEffect(
      { kind: 'cc', target: 'singleEnemy', ccType: 'root', ccDurationMs: 800 },
      context,
    )

    expect(targets).toEqual([mob])
    expect(mob.activeCc?.[0].ccType).toBe('root')
  })

  it('resolve cc ไม่เรียก applyDamage เลยแม้แต่ครั้งเดียว (spy ยืนยันตรง ๆ ตามคำที่ Done-criterion #4 ใช้)', () => {
    const applyDamageSpy = vi.spyOn(DamageSystem, 'applyDamage')
    const target = unit({ id: 'mob' })
    const context = ctx({ enemies: [target] })

    applyCcEffect(
      { kind: 'cc', target: 'singleEnemy', ccType: 'silence', ccDurationMs: 900 },
      context,
    )

    expect(applyDamageSpy).not.toHaveBeenCalled()
    applyDamageSpy.mockRestore()
  })
})

describe('heal / buff effects', () => {
  it('heal ไม่เกิน maxHp', () => {
    const target = unit({ id: 't', hp: 95, maxHp: 100 })
    const context = ctx({ enemies: [], allies: [], owner: target })

    applyHealEffect({ kind: 'heal', target: 'self', healAmount: 50 }, context)

    expect(target.hp).toBe(100)
  })

  it('buff บันทึก record ครบ buffType/magnitude/durationMs', () => {
    const target = unit({ id: 't' })
    const context = ctx({ owner: target })

    applyBuffEffect(
      { kind: 'buff', target: 'self', buffType: 'atk-up', magnitude: 1.3, durationMs: 4000 },
      context,
    )

    expect(target.activeBuffs).toEqual([{ buffType: 'atk-up', magnitude: 1.3, remainingMs: 4000 }])
  })
})

describe('summon effect — reuse enemy AI machine verbatim (done-criterion #5, §3.8.3)', () => {
  it('spawn แล้วได้ entityType "ally" พร้อมสเตตจาก template จริง', () => {
    const owner = unit({ id: 'owner', position: { x: 10, y: 20 } })
    const context = ctx({ owner })
    const template = getEnemyTemplate('shadow-soldier')
    if (!template) throw new Error('ไม่พบแม่แบบ shadow-soldier')

    const summon = resolveSummonEffect(
      { kind: 'summon', target: 'self', summonId: 'shadow-soldier' },
      context,
      'summon-test-1',
    )

    expect(summon).not.toBeNull()
    expect(summon?.entityType).toBe('ally')
    expect(summon?.hp).toBe(template.maxHp)
    expect(summon?.position).toEqual({ x: 10, y: 20 })
  })

  it('summonId ไม่พบ template → คืน null ไม่ throw (ไม่ล้มทั้งเอฟเฟกต์อื่นที่ตามมา)', () => {
    const context = ctx()
    const summon = resolveSummonEffect(
      { kind: 'summon', target: 'self', summonId: 'no-such-template' },
      context,
      'summon-test-2',
    )
    expect(summon).toBeNull()
  })

  it('หน่วยที่ spawn เดินผ่าน stepEnemyAI ตัวเดียวกับศัตรู (harness เดิมจาก EnemyAISystem.test.ts) ได้จริง: idle → chase → attack', () => {
    const owner = unit({ id: 'owner', position: { x: 0, y: 0 } })
    const context = ctx({ owner })
    const template = getEnemyTemplate('shadow-soldier')
    if (!template) throw new Error('ไม่พบแม่แบบ shadow-soldier')

    const summon = resolveSummonEffect(
      { kind: 'summon', target: 'self', summonId: 'shadow-soldier' },
      context,
      'summon-ai-1',
    )
    if (!summon) throw new Error('spawn ล้มเหลว')

    // เป้าหมายของหน่วยเรียก = ศัตรูที่ใกล้สุด ไม่ใช่ผู้เล่น (ally-targeting-nearest-enemy)
    const nearestEnemy = unit({
      id: 'enemy-target',
      entityType: 'enemy',
      position: { x: template.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(summon, brain, nearestEnemy, 16) // idle → chase
    const decision = stepEnemyAI(summon, brain, nearestEnemy, 16) // chase → attack

    expect(brain.state).toBe('attack')
    expect(summon.state).toBe('attack')
    expect(decision.move).toEqual({ x: 0, y: 0 })
  })

  it('scar-repro: owner ไม่ใช่ตัวที่ active/slot 0 ก็ยัง spawn ได้ปกติ (ไม่มี implicit "active hero" assumption)', () => {
    // Guardian Tales scar: pet ไม่เกิดเมื่อฮีโร่เจ้าของอยู่ slot 2/3 แทนที่จะเป็น lead
    // ที่นี่จำลองด้วย owner ที่ entityType เป็น 'ally' (ไม่ใช่ 'player') — resolver ต้อง
    // ไม่สนใจว่า owner คือใคร แค่ใช้ตำแหน่ง/ข้อมูลที่ส่งมาตรง ๆ
    const nonActiveOwner = unit({
      id: 'roster-slot-2',
      entityType: 'ally',
      position: { x: 77, y: 88 },
    })
    const context = ctx({ owner: nonActiveOwner })

    const summon = resolveSummonEffect(
      { kind: 'summon', target: 'self', summonId: 'spirit-guardian' },
      context,
      'summon-scar-1',
    )

    expect(summon).not.toBeNull()
    expect(summon?.entityType).toBe('ally')
    expect(summon?.position).toEqual({ x: 77, y: 88 })
  })

  it('scar-repro: allAllies resolve ถูกต้องเมื่อ owner ไม่ใช่ active hero slot (ไม่คีย์ผิดจาก "active hero")', () => {
    // Guardian Tales scar: party-buff ของ Priscilla ไม่ apply เมื่อเธออยู่ slot 2/3
    const nonActiveOwner = unit({ id: 'roster-slot-3', entityType: 'ally' })
    const realAllies = [unit({ id: 'ally-a' }), unit({ id: 'ally-b' })]
    const context = ctx({ owner: nonActiveOwner, allies: realAllies })

    expect(resolveTargets('allAllies', context)).toEqual(realAllies)
  })

  it('scar-repro: AI ของหน่วยเรียกเริ่มไล่จริงข้ามหลายคู่ summon/enemy-template ไม่ใช่แค่คู่เดียว', () => {
    const combos: Array<[string, string]> = [
      ['shadow-soldier', 'demon-captain'],
      ['demon-captain', 'shadow-soldier'],
      ['spirit-guardian', 'demon-captain'],
    ]

    for (const [summonId, enemyTemplateId] of combos) {
      const owner = unit({ id: 'owner', position: { x: 0, y: 0 } })
      const context = ctx({ owner })
      const enemyTemplate = getEnemyTemplate(enemyTemplateId)
      if (!enemyTemplate) throw new Error(`ไม่พบแม่แบบ ${enemyTemplateId}`)

      const summon = resolveSummonEffect(
        { kind: 'summon', target: 'self', summonId },
        context,
        `summon-combo-${summonId}-${enemyTemplateId}`,
      )
      if (!summon) throw new Error(`spawn ${summonId} ล้มเหลว`)

      const enemyTarget = unit({
        id: `enemy-${enemyTemplateId}`,
        entityType: 'enemy',
        position: { x: enemyTemplate.detectRange - 100, y: 0 },
      })
      const brain = createEnemyBrain()

      stepEnemyAI(summon, brain, enemyTarget, 16)

      expect(brain.state).not.toBe('idle') // ต้องเริ่มไล่ ไม่ค้างเฉย ๆ ในทุกคู่
    }
  })
})

describe('resolveEffect — จุดเข้าเดียว dispatch ตาม kind', () => {
  it('heal/buff/cc คืน null (ผลข้างเคียงเกิดผ่าน mutation) — summon คืน entity ใหม่', () => {
    const target = unit({ id: 't', hp: 50, maxHp: 100 })
    const context = ctx({ owner: target })

    expect(resolveEffect({ kind: 'heal', target: 'self', healAmount: 10 }, context)).toBeNull()
    expect(target.hp).toBe(60)

    const summonResult = resolveEffect(
      { kind: 'summon', target: 'self', summonId: 'shadow-soldier' },
      context,
      'summon-dispatch-1',
    )
    expect(summonResult).not.toBeNull()
    expect(summonResult?.id).toBe('summon-dispatch-1')
  })
})
