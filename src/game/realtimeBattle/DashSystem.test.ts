import { describe, expect, it } from 'vitest'
import { DASH_CONFIG, ENEMY_ATTACK } from './attacks'
import { createDashState, isDashing, startDash, stepDash } from './DashSystem'
import { applyDamage } from './DamageSystem'
import { findHitTargets } from './HitboxSystem'
import { getRealtimeStage, type RealtimeBattleStage } from './stageConfig'
import type { RealtimeBattleEntity } from './types'

function stage(): RealtimeBattleStage {
  const found = getRealtimeStage('trial-01')
  if (!found) throw new Error('ไม่พบด่าน trial-01')
  return found
}

function player(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'player',
    entityType: 'player',
    name: 'ผู้เล่น',
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
    skillCooldownRemainingMs: 0,
    dashCooldownRemainingMs: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    characterId: 'monkey-king',
    ...overrides,
  }
}

/** เดินการพุ่งจนจบ ทีละก้าว 60 Hz เหมือนลูปจริง */
function runDash(unit: RealtimeBattleEntity, dash: ReturnType<typeof createDashState>) {
  const stepMs = 1000 / 60
  for (let t = 0; t <= DASH_CONFIG.durationMs + stepMs; t += stepMs) {
    stepDash(unit, dash, stepMs, stage())
  }
}

describe('DashSystem', () => {
  it('พุ่งไปตามทิศที่กดอยู่', () => {
    const unit = player()
    const dash = createDashState()
    const startX = unit.position.x

    expect(startDash(unit, dash, { x: 1, y: 0 }, 0)).toBe(true)
    runDash(unit, dash)

    expect(unit.position.x).toBeGreaterThan(startX)
    expect(unit.position.x - startX).toBeCloseTo(DASH_CONFIG.distance, 0)
  })

  it('ไม่ได้กดทิศไหน = พุ่งไปทางที่หันอยู่', () => {
    const unit = player({ facing: 'up' })
    const dash = createDashState()
    const startY = unit.position.y

    startDash(unit, dash, { x: 0, y: 0 }, 0)
    runDash(unit, dash)

    expect(unit.position.y).toBeLessThan(startY)
  })

  it('ตั้งคูลดาวน์ และพุ่งซ้ำไม่ได้จนกว่าคูลดาวน์จะหมด', () => {
    const unit = player()
    const dash = createDashState()

    startDash(unit, dash, { x: 1, y: 0 }, 0)
    expect(unit.dashCooldownRemainingMs).toBe(DASH_CONFIG.cooldownMs)
    runDash(unit, dash)

    expect(startDash(unit, dash, { x: 1, y: 0 }, 500)).toBe(false)

    unit.dashCooldownRemainingMs = 0
    expect(startDash(unit, dash, { x: 1, y: 0 }, 2000)).toBe(true)
  })

  it('ระหว่างพุ่งมี i-frame ที่กันดาเมจได้จริง', () => {
    const unit = player()
    const dash = createDashState()
    const enemy = player({
      id: 'enemy',
      entityType: 'enemy',
      position: { x: 940, y: 550 },
      facing: 'left',
    })

    startDash(unit, dash, { x: 1, y: 0 }, 1000)

    // ระหว่าง i-frame: hitbox ต้องหาไม่เจอเลย
    const duringIFrame = findHitTargets([unit], {
      attacker: enemy,
      attack: ENEMY_ATTACK,
      alreadyHit: new Set(),
      elapsedMs: 1000 + DASH_CONFIG.invulnerableMs / 2,
    })
    expect(duringIFrame).toHaveLength(0)

    // หลัง i-frame หมด: โดนได้ตามปกติ
    const afterIFrame = findHitTargets([unit], {
      attacker: enemy,
      attack: ENEMY_ATTACK,
      alreadyHit: new Set(),
      elapsedMs: 1000 + DASH_CONFIG.invulnerableMs + 50,
    })
    expect(afterIFrame).toHaveLength(1)
  })

  it('i-frame สั้นกว่าเวลาพุ่ง — ช่วงท้ายของการพุ่งยังโดนได้', () => {
    expect(DASH_CONFIG.invulnerableMs).toBeLessThan(DASH_CONFIG.durationMs)
  })

  it('พุ่งทะลุกำแพงไม่ได้', () => {
    const s = stage()
    const unit = player({ position: { x: s.width - 60, y: 550 } })
    const dash = createDashState()

    startDash(unit, dash, { x: 1, y: 0 }, 0)
    runDash(unit, dash)

    expect(unit.position.x).toBeLessThanOrEqual(s.width - unit.collisionRadius + 0.01)
  })

  it('พุ่งตอนกำลังเซหรือตายไม่ได้', () => {
    expect(
      startDash(player({ hitStunRemainingMs: 150 }), createDashState(), { x: 1, y: 0 }, 0),
    ).toBe(false)
    expect(startDash(player({ state: 'dead' }), createDashState(), { x: 1, y: 0 }, 0)).toBe(false)
  })

  it('จบการพุ่งแล้วกลับเป็น idle', () => {
    const unit = player()
    const dash = createDashState()

    startDash(unit, dash, { x: 1, y: 0 }, 0)
    expect(unit.state).toBe('dash')

    runDash(unit, dash)
    expect(isDashing(dash)).toBe(false)
    expect(unit.state).toBe('idle')
  })

  it('ตายระหว่างพุ่ง = หยุดพุ่งทันที', () => {
    const unit = player()
    const dash = createDashState()

    startDash(unit, dash, { x: 1, y: 0 }, 0)
    stepDash(unit, dash, 16, stage())

    unit.state = 'dead'
    stepDash(unit, dash, 16, stage())
    expect(isDashing(dash)).toBe(false)
  })

  it('โดนตีระหว่าง i-frame หมดแล้ว ดาเมจเข้าตามปกติ', () => {
    const unit = player()
    const enemy = player({ id: 'enemy', entityType: 'enemy', atk: 80, facing: 'left' })
    const hpBefore = unit.hp

    applyDamage({
      attacker: enemy,
      target: unit,
      attack: ENEMY_ATTACK,
      elapsedMs: 5000,
      random: () => 0.5,
    })

    expect(unit.hp).toBeLessThan(hpBefore)
  })
})
