import { describe, expect, it } from 'vitest'

import type { RealtimeBattleEntity } from '../realtimeBattle/types'
import type { RealtimeBattleState } from '../realtimeBattle/createRealtimeBattle'
import {
  createCombatAccumulator,
  mergeBattleStateIntoAccumulator,
  toCombatSummary,
} from './combatSummary'

/*
  ไฟล์นี้ไม่เคยมีเทสต์เลย — Stryker รอบแรก (2026-08-16) รายงาน combatSummary.ts ที่ 5.71%
  โดยมี 33 บรรทัดที่ไม่มีเทสต์ไหนวิ่งผ่าน ทั้งที่มันคือตัวนับ "ฆ่าไปกี่ตัว elite กี่ตัว boss
  กี่ตัว" ที่ไหลต่อเข้าไปเป็นรางวัลท้ายด่าน

  เทสต์จึงจงใจขับ **แต่ละครึ่งของเงื่อนไข** แยกกัน ไม่ใช่แค่ให้ผ่านบรรทัด:
  ตัวนับพวกนี้เปลี่ยนค่าได้เงียบ ๆ ไม่มีอะไรพัง มีแต่ผู้เล่นได้รางวัลผิด
*/

/** entity เปล่า ๆ ที่ครบ type — เทสต์นี้อ่านแค่ state/hp/combatTier/entityType */
function enemy(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'e1',
    entityType: 'enemy',
    name: 'มาร',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'down',
    combatFacing: 'right',
    state: 'dead',
    hp: 0,
    maxHp: 100,
    atk: 10,
    def: 5,
    speed: 100,
    collisionRadius: 30,
    hurtboxRadius: 36,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    ...overrides,
  }
}

function battleState(
  enemies: RealtimeBattleEntity[],
  damage: { dealt?: number; taken?: number } = {},
): RealtimeBattleState {
  return {
    enemies,
    damageDealt: damage.dealt ?? 0,
    damageTaken: damage.taken ?? 0,
  } as unknown as RealtimeBattleState
}

describe('createCombatAccumulator', () => {
  it('เริ่มที่ศูนย์ทั้งห้าช่อง', () => {
    expect(createCombatAccumulator()).toEqual({
      enemiesDefeated: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      damageDealt: 0,
      damageTaken: 0,
    })
  })

  it('คืน object ใหม่ทุกครั้ง ไม่ใช่ตัวเดียวกันที่ใช้ร่วมกัน', () => {
    const a = createCombatAccumulator()
    const b = createCombatAccumulator()
    a.enemiesDefeated = 99
    // ถ้าคืน object เดิม ห้องถัดไปจะเริ่มด้วยยอดของห้องก่อน
    expect(b.enemiesDefeated).toBe(0)
  })
})

describe('mergeBattleStateIntoAccumulator', () => {
  it('บวกดาเมจสะสมข้ามหลายห้อง ไม่ใช่ทับค่าเดิม', () => {
    let acc = createCombatAccumulator()
    acc = mergeBattleStateIntoAccumulator(acc, battleState([], { dealt: 120, taken: 30 }))
    acc = mergeBattleStateIntoAccumulator(acc, battleState([], { dealt: 80, taken: 5 }))

    expect(acc.damageDealt).toBe(200)
    expect(acc.damageTaken).toBe(35)
  })

  it('ไม่แก้ accumulator ตัวที่รับเข้ามา', () => {
    const before = createCombatAccumulator()
    mergeBattleStateIntoAccumulator(before, battleState([enemy()], { dealt: 50 }))

    expect(before).toEqual(createCombatAccumulator())
  })

  /*
    เงื่อนไขข้ามคือ `state !== 'dead' && hp > 0` — แปลว่า "ตาย" ได้สองทาง และต้องนับทั้งสอง
    เทสต์แยกครึ่งละข้อ ถ้าใครแก้ && เป็น || หรือตัดครึ่งใดครึ่งหนึ่งทิ้ง จะมีข้อแดง
  */
  it('นับตัวที่ state เป็น dead แม้เลือดยังไม่ถึงศูนย์', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ state: 'dead', hp: 12 })]),
    )
    expect(acc.enemiesDefeated).toBe(1)
  })

  it('นับตัวที่เลือดหมดแม้ state ยังไม่เป็น dead', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ state: 'idle', hp: 0 })]),
    )
    expect(acc.enemiesDefeated).toBe(1)
  })

  it('ไม่นับตัวที่ยังไม่ตายและเลือดยังเหลือ', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ state: 'idle', hp: 1 })]),
    )
    expect(acc.enemiesDefeated).toBe(0)
  })

  it('elite นับเข้าทั้ง enemiesDefeated และ elitesDefeated ไม่ใช่อย่างใดอย่างหนึ่ง', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ combatTier: 'elite' })]),
    )
    expect(acc).toMatchObject({ enemiesDefeated: 1, elitesDefeated: 1, bossesDefeated: 0 })
  })

  /*
    บอสมีสองทางเข้า (`combatTier === 'boss' || entityType === 'boss'`) เพราะ createRealtimeBattle
    ตั้งสองค่านี้แยกกัน — ทดสอบทีละทาง ไม่งั้นตัด || ทิ้งข้างหนึ่งก็ยังเขียว
  */
  it('นับบอสจาก combatTier', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ combatTier: 'boss', entityType: 'enemy' })]),
    )
    expect(acc).toMatchObject({ enemiesDefeated: 1, bossesDefeated: 1 })
  })

  it('นับบอสจาก entityType แม้ combatTier ไม่ใช่ boss', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ combatTier: 'mob', entityType: 'boss' })]),
    )
    expect(acc).toMatchObject({ enemiesDefeated: 1, bossesDefeated: 1 })
  })

  it('ตัวที่เป็นทั้ง combatTier boss และ entityType boss นับเป็นบอสตัวเดียว', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy({ combatTier: 'boss', entityType: 'boss' })]),
    )
    expect(acc.bossesDefeated).toBe(1)
  })

  it('ตัวที่ยังไม่ตายไม่นับเป็น elite หรือ boss ด้วย', () => {
    const acc = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([
        enemy({ state: 'idle', hp: 5, combatTier: 'elite' }),
        enemy({ state: 'idle', hp: 5, combatTier: 'boss', entityType: 'boss' }),
      ]),
    )
    expect(acc).toMatchObject({ enemiesDefeated: 0, elitesDefeated: 0, bossesDefeated: 0 })
  })

  it('รวมหลายตัวในห้องเดียวและสะสมต่อจากยอดเดิม', () => {
    const first = mergeBattleStateIntoAccumulator(
      createCombatAccumulator(),
      battleState([enemy(), enemy({ combatTier: 'elite' })], { dealt: 10 }),
    )
    const second = mergeBattleStateIntoAccumulator(
      first,
      battleState(
        [enemy({ combatTier: 'boss', entityType: 'boss' }), enemy({ state: 'idle', hp: 9 })],
        {
          dealt: 5,
          taken: 2,
        },
      ),
    )

    expect(second).toEqual({
      enemiesDefeated: 3,
      elitesDefeated: 1,
      bossesDefeated: 1,
      damageDealt: 15,
      damageTaken: 2,
    })
  })
})

describe('toCombatSummary', () => {
  it('ส่งต่อครบทั้งห้าช่องโดยไม่สลับค่า', () => {
    const summary = toCombatSummary({
      enemiesDefeated: 7,
      elitesDefeated: 3,
      bossesDefeated: 1,
      damageDealt: 4321,
      damageTaken: 99,
    })

    expect(summary).toEqual({
      enemiesDefeated: 7,
      elitesDefeated: 3,
      bossesDefeated: 1,
      damageDealt: 4321,
      damageTaken: 99,
    })
  })
})
