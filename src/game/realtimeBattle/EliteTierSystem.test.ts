import { describe, expect, it } from 'vitest'
import { applyDamage, isKnockdownEligible, KNOCKDOWN_DURATION_MS } from './DamageSystem'
import { tickKnockdownState } from './combatReaction'
import { createEnemyBrain, stepEnemyAI } from './EnemyAISystem'
import { createWaveEnemies } from './createRealtimeBattle'
import {
  ELITE_STAT_MULTIPLIER,
  ENEMY_TEMPLATES,
  getEnemyTemplate,
  type RealtimeBattleStage,
} from './stageConfig'
import type { AttackDefinition } from './attacks'
import type { RealtimeBattleEntity } from './types'

/**
 * เทสต์ชุดนี้ pin ไว้ตาม Done-criteria ของ
 * docs/agent-blueprint/10-elite-mini-boss-tier-system.md — ตัวเลขในสเปกเป็น requirement
 * เดียวที่ยึด (ไม่ใช่ Genshin's ตัวเลขจริง — ดู "Related caveat" ในสเปก)
 */

function fakeRandom(...values: number[]): () => number {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

function entity(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'unit',
    entityType: 'enemy',
    name: 'เป้าหมาย',
    position: { x: 500, y: 500 },
    velocity: { x: 0, y: 0 },
    facing: 'down',
    combatFacing: 'right',
    state: 'idle',
    hp: 999_999, // เลือดสูงพอไม่ตายจากดาเมจทดสอบ ให้ตรวจ knockdown ได้ตรง ๆ
    maxHp: 999_999,
    atk: 100,
    def: 0,
    speed: 120,
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

/** ท่าที่ตั้งค่า knockdown ได้ตามต้องการ — คุมตัวแปรทดสอบให้ชัดจากค่าคงที่ของ attacks.ts จริง */
function attack(overrides: Partial<AttackDefinition> = {}): AttackDefinition {
  return {
    id: 'test-attack',
    animationId: 'attack-1',
    startupMs: 0,
    activeMs: 100,
    recoveryMs: 0,
    comboWindowStartMs: 0,
    comboWindowEndMs: 0,
    damageMultiplier: 1,
    range: 200,
    hitShape: 'horizontal',
    arcDegrees: 0,
    depthTolerance: 200,
    knockback: 10,
    ...overrides,
  }
}

const attacker = entity({ id: 'attacker', atk: 100 })

describe('Done-criterion 1: knockdown gate is one shared path for elite and boss', () => {
  it('isKnockdownEligible คืน true ทั้ง entityType boss และ tier elite ด้วยตรรกะเดียวกัน', () => {
    expect(isKnockdownEligible(entity({ tier: 'elite' }))).toBe(true)
    expect(isKnockdownEligible(entity({ entityType: 'boss' }))).toBe(true)
    expect(isKnockdownEligible(entity({ tier: 'normal' }))).toBe(false)
    expect(isKnockdownEligible(entity({}))).toBe(false) // ไม่มี tier เลย (ฝ่ายผู้เล่น) = ไม่ eligible
  })
})

describe('Done-criterion 2: mini-boss wave spawn plays out on the existing state set only', () => {
  const eliteWaveStage: RealtimeBattleStage = {
    id: 'test-mini-boss-stage',
    name: 'ทดสอบ mini-boss',
    width: 2000,
    height: 2000,
    playerSpawn: { x: 0, y: 0 },
    enemySpawns: [],
    waves: [{ id: 'wave-1', enemies: [{ templateId: 'demon-warlord', spawnIndex: 0 }] }],
    chapterId: 'test-chapter',
    order: 1,
    stageType: 'wave',
  }

  it('wave flag ตัวเดียวเป็น Elite/mini-boss ได้จริงผ่าน templateId — ไม่ต้องแก้ schema ของ wave', () => {
    const [miniBoss] = createWaveEnemies(eliteWaveStage, 0)
    expect(miniBoss.tier).toBe('elite')
    expect(miniBoss.entityType).toBe('enemy') // mini-boss = elite-tier enemy ไม่ใช่ entityType boss
  })

  it('เดิน AI ของ mini-boss หลายรอบ (รวมช่วง Knockdown/GetUp) ไม่เคยเข้า telegraph/phase-transition', () => {
    const [miniBoss] = createWaveEnemies(eliteWaveStage, 0)
    const brain = createEnemyBrain()
    const player = entity({ id: 'player', entityType: 'player', position: { x: 50, y: 500 } })
    const knockdownMove = attack({ knockdown: true })

    const seenStates = new Set<string>()
    for (let i = 0; i < 20; i += 1) {
      const decision = stepEnemyAI(miniBoss, brain, player, 16, i * 16)
      seenStates.add(brain.state)
      void decision
    }

    applyDamage({
      attacker,
      target: miniBoss,
      attack: knockdownMove,
      elapsedMs: 1000,
      random: fakeRandom(0.5, 0.99),
    })
    expect(miniBoss.state).toBe('knockdown')

    for (let i = 0; i < 80; i += 1) {
      stepEnemyAI(miniBoss, brain, player, 16, 2000 + i * 16)
      seenStates.add(brain.state)
    }

    expect(seenStates.has('telegraph')).toBe(false)
    expect(seenStates.has('phase-transition')).toBe(false)
    // เข้า knockdown/getup จริงตามที่คาด (ไม่ใช่แค่ไม่พังเฉย ๆ)
    expect(seenStates.has('knockdown')).toBe(true)
  })
})

describe('Done-criterion 3: knockdown-flagged hit vs elite/boss/normal targets', () => {
  const knockdownMove = attack({ knockdown: true })

  it('เป้าหมาย combatTier elite โดนท่า knockdown = เข้า Knockdown state, เวลานอนพักอยู่ที่ knockdownRemainingMs', () => {
    const target = entity({ combatTier: 'elite' })
    applyDamage({
      attacker,
      target,
      attack: knockdownMove,
      elapsedMs: 1000,
      random: fakeRandom(0.5, 0.99),
    })

    // combatReaction.ts's applyCombatReaction: knockdown branch clears hitStunRemainingMs
    // to 0 and drives timing through knockdownRemainingMs/getUpRemainingMs instead
    // (tickKnockdownState owns the state machine — i-frames land later, at getUp→idle).
    expect(target.state).toBe('knockdown')
    expect(target.hitStunRemainingMs).toBe(0)
    expect(target.knockdownRemainingMs).toBe(KNOCKDOWN_DURATION_MS)
  })

  it('เป้าหมาย entityType boss โดนท่าเดียวกัน = ผลลัพธ์เหมือนกันทุกประการกับ elite', () => {
    const eliteTarget = entity({ combatTier: 'elite' })
    const bossTarget = entity({ entityType: 'boss' })

    applyDamage({
      attacker,
      target: eliteTarget,
      attack: knockdownMove,
      elapsedMs: 500,
      random: fakeRandom(0.5, 0.99),
    })
    applyDamage({
      attacker,
      target: bossTarget,
      attack: knockdownMove,
      elapsedMs: 500,
      random: fakeRandom(0.5, 0.99),
    })

    expect(bossTarget.state).toBe(eliteTarget.state)
    expect(bossTarget.knockdownRemainingMs).toBe(eliteTarget.knockdownRemainingMs)
    expect(bossTarget.hitStunRemainingMs).toBe(eliteTarget.hitStunRemainingMs)
  })

  it('เป้าหมาย combatTier mob โดนท่าเดียวกัน = ไม่ knockdown แค่เซปกติ', () => {
    const target = entity({ combatTier: 'mob' })
    applyDamage({
      attacker,
      target,
      attack: knockdownMove,
      elapsedMs: 1000,
      random: fakeRandom(0.5, 0.99),
    })

    expect(target.state).toBe('hit')
    expect(target.state).not.toBe('knockdown')
    expect(target.hitStunRemainingMs).toBeLessThan(KNOCKDOWN_DURATION_MS)
  })

  it('ท่าที่ไม่มี knockdown flag ไม่ทำให้เป้าหมาย elite ล้ม', () => {
    const target = entity({ combatTier: 'elite' })
    applyDamage({
      attacker,
      target,
      attack: attack({ knockdown: false }),
      elapsedMs: 1000,
      random: fakeRandom(0.5, 0.99),
    })

    expect(target.state).toBe('hit')
  })

  it('Knockdown/GetUp เดินผ่าน tickKnockdownState + EnemyAISystem จริง แล้วกลับไป chase/idle ได้ (ไม่ค้าง)', () => {
    const target = entity({ combatTier: 'elite', enemyId: 'demon-warlord' })
    const player = entity({ id: 'player', entityType: 'player', position: { x: 550, y: 500 } })
    const brain = createEnemyBrain()

    applyDamage({
      attacker,
      target,
      attack: knockdownMove,
      elapsedMs: 0,
      random: fakeRandom(0.5, 0.99),
    })
    expect(target.state).toBe('knockdown')

    // เดินจน knockdownRemainingMs หมด (RealtimeBattleRuntime.tickTimers เรียก tickKnockdownState
    // ทุกเฟรมแบบนี้จริง ๆ — ก่อน stepEnemyAI เสมอ)
    let elapsed = 0
    for (let i = 0; i < 200 && target.state === 'knockdown'; i += 1) {
      tickKnockdownState(target, 16, elapsed)
      elapsed += 16
      stepEnemyAI(target, brain, player, 16, elapsed)
    }
    expect(target.state).toBe('getUp')
    expect(brain.state).toBe('getUp')

    // เดินต่อจน GetUp i-frame หมด — ต้องกลับไป chase (ผู้เล่นอยู่ในระยะ) ไม่ค้างที่ getUp ตลอดไป
    for (let i = 0; i < 50 && brain.state === 'getUp'; i += 1) {
      tickKnockdownState(target, 16, elapsed)
      elapsed += 16
      stepEnemyAI(target, brain, player, 16, elapsed)
    }
    expect(brain.state).toBe('chase')
  })
})

describe('Done-criterion 4: mini-boss full HP to death sets no invulnerable/phase flag', () => {
  it('ตีจนตายต่อเนื่อง ไม่มี branch ไหนที่ HP-threshold แล้วเซ็ต invulnerable/phase flag ทับ death', () => {
    const target = entity({ combatTier: 'elite', hp: 300, maxHp: 300 })
    const knockdownMove = attack({ knockdown: true, damageMultiplier: 0.5 })

    let guard = 0
    while (target.hp > 0 && guard < 100) {
      applyDamage({
        attacker,
        target,
        attack: knockdownMove,
        elapsedMs: guard * 1000,
        random: fakeRandom(0.5, 0.99),
      })
      guard += 1
    }

    expect(target.hp).toBe(0)
    expect(target.state).toBe('dead')
    // RealtimeBattleEntity ไม่มีฟิลด์ phase/invulnerable-flag แยกต่างหากให้ตรวจอยู่แล้ว (ดู types.ts)
    // — การตายจบที่ state 'dead' ตรง ๆ คือหลักฐานว่าไม่มี branch พิเศษมาแทรกก่อนตาย
  })
})

describe('Done-criterion 5: elite stat multiplier comes from the data table', () => {
  const eliteWaveStage: RealtimeBattleStage = {
    id: 'test-elite-stats-stage',
    name: 'ทดสอบสเตตัส elite',
    width: 2000,
    height: 2000,
    playerSpawn: { x: 0, y: 0 },
    enemySpawns: [],
    waves: [{ id: 'wave-1', enemies: [{ templateId: 'demon-warlord', spawnIndex: 0 }] }],
    chapterId: 'test-chapter',
    order: 1,
    stageType: 'wave',
  }

  it('สเตตัสจริงของ elite = สเตตัสฐานในตาราง × ELITE_STAT_MULTIPLIER (ไม่ใช่ hardcode)', () => {
    const template = getEnemyTemplate('demon-warlord')
    if (!template) throw new Error('ไม่พบแม่แบบ demon-warlord')

    const [miniBoss] = createWaveEnemies(eliteWaveStage, 0)

    expect(miniBoss.maxHp).toBe(Math.round(template.maxHp * ELITE_STAT_MULTIPLIER.maxHp))
    expect(miniBoss.atk).toBe(Math.round(template.atk * ELITE_STAT_MULTIPLIER.atk))
    expect(miniBoss.def).toBe(Math.round(template.def * ELITE_STAT_MULTIPLIER.def))
  })

  it('ศัตรู tier normal ไม่โดนตัวคูณเลย — สเตตัสเท่าฐานเป๊ะ', () => {
    const normalTemplate = getEnemyTemplate('shadow-soldier')
    if (!normalTemplate) throw new Error('ไม่พบแม่แบบ shadow-soldier')

    const stage: RealtimeBattleStage = {
      id: 'test-normal-stats-stage',
      name: 'ทดสอบสเตตัส normal',
      width: 2000,
      height: 2000,
      playerSpawn: { x: 0, y: 0 },
      enemySpawns: [],
      waves: [{ id: 'wave-1', enemies: [{ templateId: 'shadow-soldier', spawnIndex: 0 }] }],
      chapterId: 'test-chapter',
      order: 1,
      stageType: 'wave',
    }
    const [normal] = createWaveEnemies(stage, 0)

    expect(normal.maxHp).toBe(normalTemplate.maxHp)
    expect(normal.atk).toBe(normalTemplate.atk)
    expect(normal.def).toBe(normalTemplate.def)
  })
})

describe('Known scar test-for-us: knockdown gate is immune to stat-table tuning', () => {
  it('ดันตัวคูณ elite ไปสุดขั้ว (ทดสอบเฉพาะจุด) knockdown gate ยังทำงานตามเดิม — ไม่ผูกกับตัวเลขสเตตัส', () => {
    const extremeMultiplier = { maxHp: 999, atk: 999, def: 999 }
    void extremeMultiplier // เอกสารเจตนา: gate เช็คแค่ tier/entityType ไม่แตะค่าพวกนี้เลย ดูบรรทัดถัดไป

    const puny = entity({ combatTier: 'elite', atk: 1, def: 1, maxHp: 1 })
    const knockdownMove = attack({ knockdown: true })
    applyDamage({
      attacker,
      target: puny,
      attack: knockdownMove,
      elapsedMs: 0,
      random: fakeRandom(0.5, 0.99),
    })

    // แม้สเตตัสจิ๋วสุด ๆ (ไม่ใช่ elite ที่ "แรง") gate ก็ยัง fire เพราะเช็คจาก tier ไม่ใช่ magnitude
    expect(puny.state).toBe('knockdown')
  })
})

describe('Related caveat test-for-us: tier discriminant does not drift with flat-stat magnitude', () => {
  it('ศัตรู normal ที่ค่า flat สูงกว่า elite (data-entry ผิด) ยังคงไม่ knockdown —ยึด tier ไม่ยึดตัวเลข', () => {
    const outScaledNormal = entity({ combatTier: 'mob', atk: 99999, def: 99999, maxHp: 99999 })
    const weakElite = entity({ combatTier: 'elite', atk: 1, def: 1, maxHp: 1 })
    const knockdownMove = attack({ knockdown: true })

    applyDamage({
      attacker,
      target: outScaledNormal,
      attack: knockdownMove,
      elapsedMs: 0,
      random: fakeRandom(0.5, 0.99),
    })
    applyDamage({
      attacker,
      target: weakElite,
      attack: knockdownMove,
      elapsedMs: 0,
      random: fakeRandom(0.5, 0.99),
    })

    expect(outScaledNormal.state).not.toBe('knockdown')
    expect(weakElite.state).toBe('knockdown')
  })
})

describe('sanity: ENEMY_TEMPLATES ทุกตัวมี tier ระบุชัดเจน (ไม่มี undefined หลุดเข้ามา)', () => {
  it('ทุก template ประกาศ tier เป็น normal หรือ elite เท่านั้น', () => {
    for (const template of Object.values(ENEMY_TEMPLATES)) {
      expect(['normal', 'elite']).toContain(template.tier)
    }
  })
})
