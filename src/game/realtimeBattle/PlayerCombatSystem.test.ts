import { describe, expect, it } from 'vitest'
import { PLAYER_ATTACK, totalDurationMs } from './attacks'
import { createPlayerCombatState, isAttacking, startAttack, stepPlayerCombat } from './PlayerCombatSystem'
import { createRealtimeBattle } from './createRealtimeBattle'
import { RealtimeBattleRuntime } from './RealtimeBattleRuntime'
import type { RealtimeBattleEntity } from './types'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

function player(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'player',
    entityType: 'player',
    name: 'ผู้เล่น',
    position: { x: 500, y: 500 },
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
    characterId: 'monkey-king',
    ...overrides,
  }
}

function makePlayerAccount(): Player {
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
      { characterId: 'monkey-king', level: 12, exp: 0, expToNext: 100, obtainedAt: '2026-01-01T00:00:00.000Z' },
    ],
    inventory: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

describe('PlayerCombatSystem', () => {
  it('ดาเมจไม่เกิดทันทีที่เริ่มท่า — hitbox เปิดเฉพาะช่วง active', () => {
    const unit = player()
    const combat = createPlayerCombatState()

    expect(startAttack(unit, combat)).toBe(true)
    expect(unit.state).toBe('attack')

    // ยังอยู่ในช่วงเงื้อ (startup) — hitbox ต้องยังไม่เปิด
    const duringStartup = stepPlayerCombat(unit, combat, PLAYER_ATTACK.startupMs - 20)
    expect(duringStartup.hitboxActive).toBe(false)

    // เข้าสู่ active frame
    const duringActive = stepPlayerCombat(unit, combat, 30)
    expect(duringActive.hitboxActive).toBe(true)

    // ผ่าน active ไปแล้ว (recovery) — ปิดอีกครั้ง
    const duringRecovery = stepPlayerCombat(unit, combat, PLAYER_ATTACK.activeMs)
    expect(duringRecovery.hitboxActive).toBe(false)
  })

  it('กดซ้ำระหว่างท่ายังไม่จบ ไม่เริ่มท่าใหม่ (กดรัวไม่ข้าม recovery)', () => {
    const unit = player()
    const combat = createPlayerCombatState()

    startAttack(unit, combat)
    stepPlayerCombat(unit, combat, 50)

    expect(startAttack(unit, combat)).toBe(false)
  })

  it('จบท่าแล้วกลับเป็น idle และติดคูลดาวน์สั้น ๆ', () => {
    const unit = player()
    const combat = createPlayerCombatState()

    startAttack(unit, combat)
    stepPlayerCombat(unit, combat, totalDurationMs(PLAYER_ATTACK) + 1)

    expect(isAttacking(combat)).toBe(false)
    expect(unit.state).toBe('idle')
    expect(unit.attackCooldownRemainingMs).toBeGreaterThan(0)
    expect(startAttack(unit, combat)).toBe(false)
  })

  it('โดนตีจนเซระหว่างเงื้อ = ท่าถูกยกเลิก', () => {
    const unit = player()
    const combat = createPlayerCombatState()

    startAttack(unit, combat)
    unit.hitStunRemainingMs = 200
    const tick = stepPlayerCombat(unit, combat, 16)

    expect(tick.hitboxActive).toBe(false)
    expect(isAttacking(combat)).toBe(false)
  })

  it('ตายแล้วโจมตีไม่ได้', () => {
    const unit = player({ state: 'dead' })
    expect(startAttack(unit, createPlayerCombatState())).toBe(false)
  })

  it('กำลังเซอยู่ก็โจมตีไม่ได้', () => {
    const unit = player({ hitStunRemainingMs: 150 })
    expect(startAttack(unit, createPlayerCombatState())).toBe(false)
  })
})

describe('การต่อสู้จริงผ่าน runtime', () => {
  /** ตัวสุ่มคงที่ ไม่คริ variance กลาง — ผลทดสอบจึงเท่ากันทุกครั้ง */
  const steadyRandom = () => 0.5

  function advance(runtime: RealtimeBattleRuntime, ms: number) {
    const stepMs = 1000 / 60
    for (let t = 0; t < ms; t += stepMs) runtime.step(stepMs)
  }

  function battle() {
    const state = createRealtimeBattle('trial-01', makePlayerAccount())
    if (!state) throw new Error('สร้างสถานะไม่สำเร็จ')
    return new RealtimeBattleRuntime(state, steadyRandom)
  }

  it('ผู้เล่นตีศัตรูที่ยืนอยู่ตรงหน้าแล้วเลือดลดจริง', () => {
    const runtime = battle()
    const state = runtime.getState()

    advance(runtime, 800) // ผ่านฉากเปิด

    const target = state.enemies[0]
    // วางศัตรูไว้ตรงหน้าผู้เล่นพอดี
    state.player.facing = 'right'
    target.position = { x: state.player.position.x + 80, y: state.player.position.y }
    const hpBefore = target.hp

    runtime.requestAttack()
    advance(runtime, 400)

    expect(target.hp).toBeLessThan(hpBefore)
    expect(state.damageDealt).toBeGreaterThan(0)
  })

  it('ท่าเดียวโดนศัตรูตัวเดิมได้ครั้งเดียว แม้ active frame จะกินหลายเฟรม', () => {
    const runtime = battle()
    const state = runtime.getState()
    advance(runtime, 800)

    const target = state.enemies[0]
    state.player.facing = 'right'
    target.position = { x: state.player.position.x + 80, y: state.player.position.y }
    // ปิดการอยู่ยงหลังโดนตี เพื่อพิสูจน์ว่าที่กันซ้ำคือ hitTargets ไม่ใช่ i-frame
    target.invulnerableUntilMs = -1

    runtime.requestAttack()
    advance(runtime, 400)

    const damageEvents = runtime.getSnapshot().damageEvents.filter((e) => e.targetId === target.id)
    expect(damageEvents).toHaveLength(1)
  })

  it('ศัตรูตีผู้เล่นจนเลือดลดได้', () => {
    const runtime = battle()
    const state = runtime.getState()
    advance(runtime, 800)

    // ลากศัตรูมาประชิดตัวผู้เล่นแล้วปล่อยให้ AI เดินเรื่อง
    for (const enemy of state.enemies) {
      enemy.position = { x: state.player.position.x + 60, y: state.player.position.y }
    }
    const hpBefore = state.player.hp

    advance(runtime, 3000)

    expect(state.player.hp).toBeLessThan(hpBefore)
    expect(state.damageTaken).toBeGreaterThan(0)
  })

  it('ศัตรูที่เลือดหมดถูกบันทึกว่าถูกกำจัดแล้ว', () => {
    const runtime = battle()
    const state = runtime.getState()
    advance(runtime, 800)

    const target = state.enemies[0]
    state.player.facing = 'right'
    target.hp = 1
    target.position = { x: state.player.position.x + 80, y: state.player.position.y }

    runtime.requestAttack()
    advance(runtime, 400)

    expect(target.state).toBe('dead')
    expect(state.defeatedEnemyIds).toContain(target.id)
  })
})
