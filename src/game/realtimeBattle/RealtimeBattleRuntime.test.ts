import { describe, expect, it } from 'vitest'
import { createRealtimeBattle, createWaveEnemies } from './createRealtimeBattle'
import { RealtimeBattleRuntime } from './RealtimeBattleRuntime'
import { getRealtimeStage } from './stageConfig'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

/**
 * เทสต์ระดับ runtime ล้วน ๆ — ไม่มี React, ไม่มี DOM, ไม่มี requestAnimationFrame
 *
 * นี่คือเหตุผลที่ RealtimeBattleRuntime ไม่ถือ rAF ไว้เอง: เทสต์เรียก step() ตรง ๆ
 * ด้วยเวลาที่กำหนดเองได้ ทำให้ผลลัพธ์คงที่ทุกครั้ง (deterministic)
 */

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
        characterId: 'spear-warrior',
        level: 12,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['spear-warrior', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

describe('createRealtimeBattle', () => {
  it('สร้างผู้เล่นที่จุดเกิดของด่าน พร้อมศัตรูคลื่นแรกครบตามข้อมูลด่าน', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    const stage = getRealtimeStage('trial-01')

    expect(state).not.toBeNull()
    expect(stage).not.toBeNull()
    if (!state || !stage) return

    expect(state.player.position).toEqual(stage.playerSpawn)
    expect(state.player.hp).toBe(state.player.maxHp)
    expect(state.enemies).toHaveLength(3)
    expect(state.status).toBe('intro')
    expect(state.currentWaveIndex).toBe(0)
  })

  it('คืน null เมื่อไม่รู้จักด่าน', () => {
    expect(createRealtimeBattle('ด่านที่ไม่มีจริง', makePlayer())).toBeNull()
  })

  it('คืน null เมื่อผู้เล่นไม่มีตัวละครในทีม', () => {
    const player = makePlayer()
    player.teamSlots = [null, null, null, null]
    expect(createRealtimeBattle('trial-01', player)).toBeNull()
  })

  it('ศัตรูของแต่ละคลื่นมี id ไม่ซ้ำกันข้ามคลื่น', () => {
    const stage = getRealtimeStage('trial-02')
    expect(stage).not.toBeNull()
    if (!stage) return

    const ids = [...createWaveEnemies(stage, 0), ...createWaveEnemies(stage, 1)].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('RealtimeBattleRuntime', () => {
  function makeRuntime() {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('สร้างสถานะตั้งต้นไม่สำเร็จ')
    return new RealtimeBattleRuntime(state)
  }

  it('เดินจาก intro ไป running เมื่อเวลาฉากเปิดผ่านไปแล้ว', () => {
    const runtime = makeRuntime()
    expect(runtime.getSnapshot().status).toBe('intro')

    runtime.step(500)
    expect(runtime.getSnapshot().status).toBe('intro')

    runtime.step(500)
    expect(runtime.getSnapshot().status).toBe('running')
  })

  it('นับคูลดาวน์ถอยหลังแต่ไม่ต่ำกว่าศูนย์', () => {
    const runtime = makeRuntime()
    const state = runtime.getState()
    runtime.step(1000) // ผ่านฉากเปิด

    state.player.attackCooldownRemainingMs = 300
    runtime.step(100)
    expect(state.player.attackCooldownRemainingMs).toBeCloseTo(200)

    runtime.step(1000)
    expect(state.player.attackCooldownRemainingMs).toBe(0)
  })

  it('แจ้ง subscriber เมื่อ publish และหยุดแจ้งหลัง unsubscribe', () => {
    const runtime = makeRuntime()
    let calls = 0
    const unsubscribe = runtime.subscribe(() => {
      calls += 1
    })

    runtime.publish()
    expect(calls).toBe(1)

    unsubscribe()
    runtime.publish()
    expect(calls).toBe(1)
  })

  it('snapshot เป็นสำเนา ไม่ใช่การอ้างถึงสถานะภายใน', () => {
    const runtime = makeRuntime()
    const snapshot = runtime.getSnapshot()
    const state = runtime.getState()

    expect(snapshot.player).not.toBe(state.player)
    expect(snapshot.player.position).not.toBe(state.player.position)
    expect(snapshot.player.position).toEqual(state.player.position)
  })

  it('requestExit หยุดการจำลอง — step หลังจากนั้นไม่ทำให้เวลาเดินต่อ', () => {
    const runtime = makeRuntime()
    runtime.step(1000)
    const elapsedBefore = runtime.getState().elapsedMs

    runtime.requestExit()
    runtime.step(500)

    expect(runtime.getSnapshot().status).toBe('exiting')
    expect(runtime.getState().elapsedMs).toBe(elapsedBefore)
  })

  it('dispose แล้วไม่แจ้ง subscriber อีก', () => {
    const runtime = makeRuntime()
    let calls = 0
    runtime.subscribe(() => {
      calls += 1
    })

    runtime.dispose()
    runtime.publish()
    expect(calls).toBe(0)
  })

  // ask-CB retroactive audit (2026-08-06): ก่อนแก้ checkBattleEnd() ไม่มีทางไหนใน
  // ทั้งระบบตั้ง status เป็น 'victory'/'defeat' ได้เลย — การต่อสู้จบเองไม่ได้จริง
  // เทสต์ชุดนี้ล็อกพฤติกรรมไว้ไม่ให้เกิดซ้ำ
  it('ผู้เล่นเลือดหมด = แพ้ทันที ไม่ต้องรอศัตรู', () => {
    const runtime = makeRuntime()
    runtime.step(1000) // ผ่านฉากเปิด

    const state = runtime.getState()
    state.player.state = 'dead'
    state.player.hp = 0

    runtime.step(16)
    expect(runtime.getSnapshot().status).toBe('defeat')
  })

  it('ศัตรูตายหมดในด่านคลื่นเดียว (trial-01) = ชนะ', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    expect(state.enemies).toHaveLength(3)
    for (const enemy of state.enemies) {
      enemy.state = 'dead'
      enemy.hp = 0
    }

    runtime.step(16)
    expect(runtime.getSnapshot().status).toBe('victory')
  })

  it('requestExit หลังผลตัดสินแล้ว (victory/defeat) ต้องไม่ทับสถานะเป็น exiting', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    for (const enemy of state.enemies) {
      enemy.state = 'dead'
      enemy.hp = 0
    }
    runtime.step(16)
    expect(runtime.getSnapshot().status).toBe('victory')

    runtime.requestExit()
    expect(runtime.getSnapshot().status).toBe('victory')
  })

  it('ด่านหลายคลื่น (trial-02) — คลื่นแรกตายหมดแล้วต้องสร้างคลื่นถัดไป ไม่ใช่ชนะทันที', () => {
    const state = createRealtimeBattle('trial-02', makePlayer())
    if (!state) throw new Error('สร้างสถานะตั้งต้นไม่สำเร็จ')
    const runtime = new RealtimeBattleRuntime(state)
    runtime.step(1000)

    const firstWaveCount = state.enemies.length
    expect(firstWaveCount).toBeGreaterThan(0)
    for (const enemy of state.enemies) {
      enemy.state = 'dead'
      enemy.hp = 0
    }

    runtime.step(16)
    // คลื่นสองต้องถูกสร้างเพิ่มเข้ามา (ศัตรูคลื่นแรกที่ตายแล้วยังอยู่ในลิสต์ด้วย)
    expect(runtime.getSnapshot().status).toBe('running')
    expect(state.currentWaveIndex).toBe(1)
    expect(state.enemies.length).toBeGreaterThan(firstWaveCount)

    // ฆ่าที่เหลือทั้งหมด (รวมคลื่นสอง) แล้วต้องชนะจริง
    for (const enemy of state.enemies) {
      enemy.state = 'dead'
      enemy.hp = 0
    }
    runtime.step(16)
    expect(runtime.getSnapshot().status).toBe('victory')
  })

  it('ใช้สกิลแล้วศัตรูในระยะโดนดาเมจ', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    const enemy = state.enemies[0]
    const hpBefore = enemy.hp
    enemy.position = { x: state.player.position.x + 60, y: state.player.position.y }

    runtime.requestSkill()

    for (let t = 0; t < 1200; t += 16) {
      runtime.step(16)
    }

    expect(state.damageDealt).toBeGreaterThan(0)
    expect(enemy.hp).toBeLessThan(hpBefore)
  })

  it('creates a lightning strike effect on every enemy hit by Skill 1', () => {
    const runtime = makeRuntime()
    runtime.step(1000)
    const state = runtime.getState()
    const enemy = state.enemies[0]
    enemy.position = { x: state.player.position.x + 60, y: state.player.position.y }
    enemy.speed = 0

    runtime.requestSkill()
    for (let elapsed = 0; elapsed < 700; elapsed += 16) {
      runtime.step(16)
      if (runtime.getSnapshot().effectEvents.some((event) => event.kind === 'skill-lightning'))
        break
    }

    const strike = runtime
      .getSnapshot()
      .effectEvents.find((event) => event.kind === 'skill-lightning')
    expect(strike).toBeDefined()
    expect(strike?.position).toEqual(enemy.position)
  })
  it('plays Skill 2 as its own action and returns to Idle', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    runtime.requestSkill('skill-2')
    runtime.step(16)

    expect(runtime.getState().player.state).toBe('skill')
    expect(runtime.getState().player.attackAnimationId).toBe('skill-2')
    expect(runtime.getSnapshot().effectEvents.some((event) => event.kind === 'skill-spin')).toBe(
      false,
    )

    runtime.step(1200)
    expect(runtime.getState().player.state).toBe('idle')
    expect(runtime.getState().player.attackAnimationId).toBeUndefined()
  })
})
