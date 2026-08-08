import { describe, expect, it } from 'vitest'
import { ENEMY_ATTACK_MELEE } from './attacks'
import {
  createEnemyBrain,
  isEnemyAttackDamageWindow,
  isEnemyTelegraphing,
  stepEnemyAI,
} from './EnemyAISystem'
import { createRealtimeBattle } from './createRealtimeBattle'
import { RealtimeBattleRuntime } from './RealtimeBattleRuntime'
import { findHitTargets } from './HitboxSystem'
import {
  BOSS_TEMPLATES,
  getEnemyTemplate,
  type BossAttackRow,
  type BossTemplate,
} from './stageConfig'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import type { RealtimeBattleEntity } from './types'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

const EXECUTE_MS =
  ENEMY_ATTACK_MELEE.startupMs + ENEMY_ATTACK_MELEE.activeMs + ENEMY_ATTACK_MELEE.recoveryMs
const TELEGRAPH_MS = ENEMY_ATTACK_MELEE.telegraphMs ?? 0

function makePlayer(): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'ผู้ทดสอบ',
    title: 'นักเดินทาง',
    level: 10,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 12,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

function entity(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'e1',
    entityType: 'enemy',
    name: 'ศัตรูทดสอบ',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'down',
    combatFacing: 'right',
    state: 'idle',
    hp: 100,
    maxHp: 100,
    atk: 20,
    def: 10,
    speed: 130,
    collisionRadius: 34,
    hurtboxRadius: 40,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    enemyId: 'shadow-soldier',
    ...overrides,
  }
}

const template = getEnemyTemplate('shadow-soldier')
if (!template) throw new Error('ไม่พบแม่แบบ shadow-soldier')

describe('stepEnemyAI', () => {
  it('อยู่ไกลเกิน detectRange = ไม่ขยับ', () => {
    const enemy = entity({ position: { x: 0, y: 0 } })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: template.detectRange + 100, y: 0 },
    })
    const brain = createEnemyBrain()

    const decision = stepEnemyAI(enemy, brain, player, 16)

    expect(brain.state).toBe('idle')
    expect(decision.move).toEqual({ x: 0, y: 0 })
  })

  it('เข้าระยะตรวจจับแล้วเริ่มไล่ และเดินเข้าหาผู้เล่น', () => {
    const enemy = entity({ position: { x: 0, y: 0 } })
    const player = entity({ id: 'player', entityType: 'player', position: { x: 300, y: 0 } })
    const brain = createEnemyBrain()

    stepEnemyAI(enemy, brain, player, 16) // idle → chase
    const decision = stepEnemyAI(enemy, brain, player, 16)

    expect(brain.state).toBe('chase')
    expect(enemy.state).toBe('walk')
    expect(decision.move.x).toBeCloseTo(1)
    expect(decision.move.y).toBeCloseTo(0)
  })

  it('เข้าระยะโจมตีแล้วเปลี่ยนเป็นท่าโจมตี และหยุดเดินตลอดท่า', () => {
    const enemy = entity({ position: { x: 0, y: 0 } })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: template.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(enemy, brain, player, 16) // → chase
    const decision = stepEnemyAI(enemy, brain, player, 16) // → telegraph

    expect(brain.state).toBe('telegraph')
    expect(isEnemyTelegraphing(brain)).toBe(true)
    expect(enemy.state).toBe('attack')
    expect(decision.move).toEqual({ x: 0, y: 0 })
    expect(enemy.attackCooldownRemainingMs).toBe(template.attackCooldownMs)

    stepEnemyAI(enemy, brain, player, TELEGRAPH_MS) // telegraph → attack execute
    expect(brain.state).toBe('attack')

    const during = stepEnemyAI(enemy, brain, player, ENEMY_ATTACK_MELEE.startupMs - 20)
    expect(brain.state).toBe('attack')
    expect(isEnemyAttackDamageWindow(brain)).toBe(false)
    expect(during.move).toEqual({ x: 0, y: 0 })
  })

  it('จบท่าโจมตีแล้วเข้าสู่ช่วงพัก ก่อนกลับไปไล่ต่อ', () => {
    const enemy = entity({ position: { x: 0, y: 0 } })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: template.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(enemy, brain, player, 16)
    stepEnemyAI(enemy, brain, player, 16)
    stepEnemyAI(enemy, brain, player, TELEGRAPH_MS)
    stepEnemyAI(enemy, brain, player, EXECUTE_MS)
    expect(brain.state).toBe('recover')

    stepEnemyAI(enemy, brain, player, 500)
    expect(brain.state).toBe('chase')
  })

  it('โดนตีจนเซ = หยุดทุกอย่างและท่าโจมตีถูกยกเลิก', () => {
    const enemy = entity({ position: { x: 0, y: 0 }, hitStunRemainingMs: 200 })
    const player = entity({ id: 'player', entityType: 'player', position: { x: 50, y: 0 } })
    const brain = createEnemyBrain()

    const decision = stepEnemyAI(enemy, brain, player, 16)

    expect(brain.state).toBe('hit')
    expect(enemy.state).toBe('hit')
    expect(decision.move).toEqual({ x: 0, y: 0 })
  })

  it('ตายแล้ว AI หยุดถาวร ไม่ไล่ ไม่โจมตี', () => {
    const enemy = entity({ hp: 0 })
    const player = entity({ id: 'player', entityType: 'player', position: { x: 10, y: 0 } })
    const brain = createEnemyBrain()

    const decision = stepEnemyAI(enemy, brain, player, 16)

    expect(brain.state).toBe('dead')
    expect(enemy.state).toBe('dead')
    expect(decision.move).toEqual({ x: 0, y: 0 })
  })

  it('ผู้เล่นตายแล้วศัตรูเลิกไล่', () => {
    const enemy = entity({ position: { x: 0, y: 0 } })
    const player = entity({ id: 'player', entityType: 'player', position: { x: 200, y: 0 }, hp: 0 })
    const brain = createEnemyBrain()

    stepEnemyAI(enemy, brain, player, 16)
    expect(brain.state).toBe('idle')
  })

  it('ยังไม่พ้นคูลดาวน์ = เข้าใกล้แล้วยืนรอ ไม่เข้าท่าโจมตี', () => {
    const enemy = entity({
      position: { x: 0, y: 0 },
      attackCooldownRemainingMs: 800,
    })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: template.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(enemy, brain, player, 16)
    const decision = stepEnemyAI(enemy, brain, player, 16)

    expect(brain.state).toBe('chase')
    expect(enemy.state).toBe('idle')
    expect(decision.move).toEqual({ x: 0, y: 0 })
  })
})

/** ท่าโจมตีบอสสำหรับเทสต์ — module scope เพราะไม่ผูกกับ closure ใด ๆ (ไม่มี state จับ) */
function testBossAttackRow(overrides: Partial<BossAttackRow> = {}): BossAttackRow {
  return {
    id: 'boss-test-attack',
    animationId: 'attack-1',
    startupMs: 30,
    activeMs: 20,
    recoveryMs: 30,
    comboWindowStartMs: 0,
    comboWindowEndMs: 0,
    damageMultiplier: 1,
    range: 120,
    hitShape: 'horizontal',
    arcDegrees: 0,
    depthTolerance: 90,
    knockback: 100,
    telegraphMs: 900, // baseline บอส 800–1200ms (§3.6.12)
    ...overrides,
  }
}

/** #11 Boss System — HP-threshold phase-transition state machine (docs/agent-blueprint/11-boss-system.md) */
describe('stepEnemyAI — บอส (#11 Boss System)', () => {
  const TEST_BOSS_ID = 'test-boss'

  /** ลงทะเบียนแม่แบบบอสทดสอบใน BOSS_TEMPLATES ตรง ๆ — เหมือน ENEMY_TEMPLATES ที่เทสต์อื่นอ่านอยู่แล้ว */
  function registerTestBoss(overrides: Partial<BossTemplate> = {}): BossTemplate {
    const bossTemplate: BossTemplate = {
      id: TEST_BOSS_ID,
      name: 'บอสทดสอบ',
      spriteKind: 'pig-warrior',
      accent: '#ffffff',
      maxHp: 1000,
      atk: 80,
      def: 30,
      speed: 100,
      collisionRadius: 50,
      hurtboxRadius: 60,
      detectRange: 2000,
      attackRange: 100,
      attackCooldownMs: 0,
      phaseHpThreshold: 0.5,
      phaseTransitionMs: 1000,
      phases: [
        { attacks: [testBossAttackRow({ id: 'phase-1-attack' })] },
        { attacks: [testBossAttackRow({ id: 'phase-2-attack' })] },
      ],
      ...overrides,
    }
    BOSS_TEMPLATES[TEST_BOSS_ID] = bossTemplate
    return bossTemplate
  }

  function bossEntity(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
    return entity({
      id: 'boss1',
      entityType: 'boss',
      enemyId: TEST_BOSS_ID,
      collisionRadius: 50,
      hurtboxRadius: 60,
      ...overrides,
    })
  }

  it('Done-criterion 1: HP ข้ามเกณฑ์ระหว่างท่าโจมตี/พักท่า ไม่ตัดท่าปัจจุบัน รอจนจบก่อนค่อยเปลี่ยนเฟส', () => {
    const bossTemplate = registerTestBoss()
    const boss = bossEntity({
      position: { x: 0, y: 0 },
      hp: bossTemplate.maxHp,
      maxHp: bossTemplate.maxHp,
    })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: bossTemplate.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(boss, brain, player, 16, 0) // idle → chase
    stepEnemyAI(boss, brain, player, 16, 16) // chase → telegraph (เลือกท่าเฟส 1)
    expect(brain.state).toBe('telegraph')
    const row = brain.selectedAttack
    if (!row) throw new Error('ควรมี selectedAttack แล้ว')

    stepEnemyAI(boss, brain, player, row.telegraphMs ?? 0, 100) // telegraph → attack
    expect(brain.state).toBe('attack')

    // HP ลดต่ำกว่า threshold ระหว่างอยู่ในท่าโจมตี (mid-AttackActive)
    boss.hp = bossTemplate.maxHp * 0.4

    const attackTotalMs = row.startupMs + row.activeMs + row.recoveryMs
    stepEnemyAI(boss, brain, player, attackTotalMs - 1, 1000) // ยังไม่จบท่า
    expect(brain.state).toBe('attack') // ยังไม่ถูกตัดท่า

    stepEnemyAI(boss, brain, player, 2, 2000) // ท่าจบพอดี → recover
    expect(brain.state).toBe('recover')

    // ยังอยู่กลาง recover (mid-Recovery) — ก็ยังไม่สลับเฟสจนกว่าจะจบ
    stepEnemyAI(boss, brain, player, 10, 2010)
    expect(brain.state).toBe('recover')

    // recover จบแล้ว (RECOVER_MS = 260) — ติ๊กนี้ recover ส่งตรงเข้า chase ก่อน (จุดปลอดภัย
    // เดียวกับที่ enemy ทั่วไปกลับไปไล่ต่อ) แล้วเกตของบอสจะตัดเข้า phase-transition ในติ๊กถัดไปทันที
    // (ยังไม่มี hitbox/ท่าใดเกิดขึ้นระหว่างนั้น — ล่าช้าแค่ 1 ติ๊กจำลอง ไม่กระทบ Done-criterion 1)
    stepEnemyAI(boss, brain, player, 260, 3000)
    expect(brain.state).toBe('chase')
    stepEnemyAI(boss, brain, player, 0, 3001)
    expect(brain.state).toBe('phase-transition')
  })

  it('Done-criterion 2: ระหว่าง PhaseTransition invulnerableUntilMs ยาวเกินระยะเปลี่ยนเฟส และ HitboxSystem ปฏิเสธทุกฮิต', () => {
    const bossTemplate = registerTestBoss({ phaseTransitionMs: 1000 })
    const boss = bossEntity({
      position: { x: 0, y: 0 },
      hp: bossTemplate.maxHp * 0.4,
      maxHp: bossTemplate.maxHp,
    })
    const player = entity({ id: 'player', entityType: 'player', position: { x: 9000, y: 9000 } })
    const brain = createEnemyBrain()

    stepEnemyAI(boss, brain, player, 16, 1000)

    expect(brain.state).toBe('phase-transition')
    expect(boss.invulnerableUntilMs).toBe(1000 + bossTemplate.phaseTransitionMs)

    const attacker = entity({ id: 'attacker', entityType: 'player' })
    const targets = findHitTargets([boss], {
      attacker,
      attack: testBossAttackRow(),
      alreadyHit: new Set(),
      elapsedMs: 1000 + bossTemplate.phaseTransitionMs - 1, // ยังอยู่ในช่วงคุ้มกัน
    })

    expect(targets).toHaveLength(0)
  })

  it('Done-criterion 3: พูลท่าหลังเปลี่ยนเฟสต้องต่างจากพูลก่อนเปลี่ยนเฟสจริง', () => {
    const bossTemplate = registerTestBoss()
    const boss = bossEntity({
      position: { x: 0, y: 0 },
      hp: bossTemplate.maxHp,
      maxHp: bossTemplate.maxHp,
    })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: bossTemplate.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(boss, brain, player, 16, 0) // → chase
    stepEnemyAI(boss, brain, player, 16, 16) // → telegraph เฟส 1
    const phase1Row = brain.selectedAttack
    if (!phase1Row) throw new Error('ควรมี selectedAttack แล้ว')
    expect(phase1Row).toBe(bossTemplate.phases[0].attacks[0])

    boss.hp = bossTemplate.maxHp * 0.4 // ข้าม threshold
    stepEnemyAI(boss, brain, player, phase1Row.telegraphMs ?? 0, 100) // telegraph → attack
    const attackTotalMs = phase1Row.startupMs + phase1Row.activeMs + phase1Row.recoveryMs
    stepEnemyAI(boss, brain, player, attackTotalMs, 200) // attack → recover
    stepEnemyAI(boss, brain, player, 260, 300) // recover → chase (จุดปลอดภัย)
    stepEnemyAI(boss, brain, player, 0, 301) // เกตบอสตัดเข้า phase-transition ติ๊กถัดไป
    expect(brain.state).toBe('phase-transition')
    stepEnemyAI(boss, brain, player, bossTemplate.phaseTransitionMs, 400) // phase-transition → chase
    expect(brain.state).toBe('chase')
    expect(brain.bossPhaseIndex).toBe(1)

    boss.attackCooldownRemainingMs = 0 // จำลอง tickTimers ของ runtime นับถอยหลังจนพ้นคูลดาวน์แล้ว
    stepEnemyAI(boss, brain, player, 16, 500) // → telegraph เฟส 2
    expect(brain.state).toBe('telegraph')
    const phase2Row = brain.selectedAttack
    expect(phase2Row).toBe(bossTemplate.phases[1].attacks[0])
    expect(phase2Row).not.toBe(phase1Row)
  })

  it('Done-criterion 4: Telegraph ค้างตาม telegraphMs ของท่า (baseline 800–1200ms) แล้วยิง ground-marker ก่อนเข้า AttackActive', () => {
    const bossTemplate = registerTestBoss()
    const boss = bossEntity({
      position: { x: 0, y: 0 },
      hp: bossTemplate.maxHp,
      maxHp: bossTemplate.maxHp,
    })
    const player = entity({
      id: 'player',
      entityType: 'player',
      position: { x: bossTemplate.attackRange - 10, y: 0 },
    })
    const brain = createEnemyBrain()

    stepEnemyAI(boss, brain, player, 16, 0) // → chase
    const decision = stepEnemyAI(boss, brain, player, 16, 16) // → telegraph

    expect(brain.state).toBe('telegraph')
    const row = brain.selectedAttack
    if (!row) throw new Error('ควรมี selectedAttack แล้ว')
    expect(row.telegraphMs).toBeGreaterThanOrEqual(800)
    expect(row.telegraphMs).toBeLessThanOrEqual(1200)
    expect(decision.telegraph).toBeDefined()
    expect(decision.telegraph?.durationMs).toBe(row.telegraphMs)

    // ยังไม่ครบ telegraphMs → ยังไม่เข้า AttackActive
    stepEnemyAI(boss, brain, player, (row.telegraphMs ?? 0) - 10, 100)
    expect(brain.state).toBe('telegraph')

    // ครบแล้ว → attack (ท่าเดียวกับที่เทเลกราฟไว้ — กันสลับท่า, scar #2)
    stepEnemyAI(boss, brain, player, 10, 1000)
    expect(brain.state).toBe('attack')
    expect(brain.selectedAttack).toBe(row)
  })

  it('Done-criterion 5: เปลี่ยนเฟสได้ครั้งเดียวต่อบอสหนึ่งตัว แม้ HP แกว่งกลับข้าม threshold ซ้ำหลังเฟส 2', () => {
    const bossTemplate = registerTestBoss({ phaseTransitionMs: 50 })
    const boss = bossEntity({
      position: { x: 9000, y: 9000 },
      hp: bossTemplate.maxHp * 0.4,
      maxHp: bossTemplate.maxHp,
    })
    // ผู้เล่นอยู่ไกลนอกระยะตรวจจับ กัน AI ไปวุ่นกับ chase/attack ระหว่างทดสอบ HP แกว่ง
    const player = entity({ id: 'player', entityType: 'player', position: { x: 90000, y: 90000 } })
    const brain = createEnemyBrain()

    stepEnemyAI(boss, brain, player, 16, 0)
    expect(brain.state).toBe('phase-transition')

    stepEnemyAI(boss, brain, player, 60, 100) // ครบ phaseTransitionMs → idle, เฟส 2 แล้ว
    expect(brain.bossPhaseIndex).toBe(1)
    expect(brain.state).toBe('idle')

    // HP แกว่งข้าม threshold ไปมาหลายรอบ
    boss.hp = bossTemplate.maxHp * 0.6
    stepEnemyAI(boss, brain, player, 16, 200)
    boss.hp = bossTemplate.maxHp * 0.3
    stepEnemyAI(boss, brain, player, 16, 300)
    boss.hp = bossTemplate.maxHp * 0.6
    stepEnemyAI(boss, brain, player, 16, 400)
    boss.hp = bossTemplate.maxHp * 0.2
    stepEnemyAI(boss, brain, player, 16, 500)

    expect(brain.state).not.toBe('phase-transition')
    expect(brain.bossPhaseIndex).toBe(1)
  })
})

/** เดินเวลาเป็นก้าวคงที่เหมือนลูปจริง ไม่ใช่ก้อนเดียวใหญ่ ๆ */
function advance(runtime: RealtimeBattleRuntime, ms: number) {
  const stepMs = 1000 / 60
  for (let t = 0; t < ms; t += stepMs) runtime.step(stepMs)
}

describe('runtime กับศัตรูทั้งกอง', () => {
  function runtimeWithEnemies() {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('สร้างสถานะไม่สำเร็จ')
    return new RealtimeBattleRuntime(state)
  }

  it('ศัตรูเดินเข้าหาผู้เล่นเมื่อการต่อสู้เริ่มแล้ว', () => {
    const runtime = runtimeWithEnemies()
    const state = runtime.getState()
    const enemy = state.enemies[0]
    const before = Math.hypot(
      enemy.position.x - state.player.position.x,
      enemy.position.y - state.player.position.y,
    )

    advance(runtime, 2000)

    const after = Math.hypot(
      enemy.position.x - state.player.position.x,
      enemy.position.y - state.player.position.y,
    )
    expect(after).toBeLessThan(before)
  })

  it('ศัตรูไม่กองทับกันเป็นตัวเดียวแม้จะวิ่งเข้าหาจุดเดียวกัน', () => {
    const runtime = runtimeWithEnemies()
    const state = runtime.getState()

    advance(runtime, 6000)

    for (let i = 0; i < state.enemies.length; i += 1) {
      for (let j = i + 1; j < state.enemies.length; j += 1) {
        const a = state.enemies[i]
        const b = state.enemies[j]
        const gap = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)
        // Visual crowd spacing is wider than gameplay collision so wide HD sprites remain readable.
        expect(gap).toBeGreaterThan((a.collisionRadius + b.collisionRadius) * 1.4)
      }
    }
  })

  it('ศัตรูไม่หลุดออกนอกห้อง', () => {
    const runtime = runtimeWithEnemies()
    const state = runtime.getState()

    advance(runtime, 4000)

    for (const enemy of state.enemies) {
      expect(enemy.position.x).toBeGreaterThanOrEqual(enemy.collisionRadius - 0.01)
      expect(enemy.position.x).toBeLessThanOrEqual(state.stage.width - enemy.collisionRadius + 0.01)
      expect(enemy.position.y).toBeGreaterThanOrEqual(enemy.collisionRadius - 0.01)
      expect(enemy.position.y).toBeLessThanOrEqual(
        state.stage.height - enemy.collisionRadius + 0.01,
      )
    }
  })

  it('การต่อสู้จบแล้ว (exiting) ศัตรูหยุดสนิท', () => {
    const runtime = runtimeWithEnemies()
    advance(runtime, 2000)

    runtime.requestExit()
    const state = runtime.getState()
    const positions = state.enemies.map((enemy) => ({ ...enemy.position }))

    advance(runtime, 2000)

    state.enemies.forEach((enemy, index) => {
      expect(enemy.position).toEqual(positions[index])
    })
  })
})
