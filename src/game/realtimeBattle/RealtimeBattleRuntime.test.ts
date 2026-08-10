import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { MONKEY_SPINNING_STAFF, PLAYER_ATTACK_CHAIN } from './attacks'
import { createRealtimeBattle, createWaveEnemies } from './createRealtimeBattle'
import { RealtimeBattleRuntime } from './RealtimeBattleRuntime'
import { getRealtimeStage } from './stageConfig'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import type { RealtimeBattleEntity } from './types'
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
    expect(state.player.position.x).toBeLessThan(state.enemies[0].position.x)
    for (const enemy of state.enemies) {
      expect(enemy.position.x).toBeGreaterThan(stage.width * 0.65)
      expect(enemy.combatFacing).toBe('left')
    }
    expect(state.player.combatFacing).toBe('right')
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

    runtime.requestSkill('skill1')

    for (let t = 0; t < 1200; t += 16) {
      runtime.step(16)
    }

    expect(state.damageDealt).toBeGreaterThan(0)
    expect(enemy.hp).toBeLessThan(hpBefore)
  })

  /*
     ── ชุดนี้ล็อกพฤติกรรมที่ต้อง "เหมือนเดิม" หลังรื้อ hot loop (perf audit 2026-08-10) ──

     ของเดิม publish() ถูกเรียกในลูปต่อเป้าหมายที่ลงดาเมจได้ ท่ากวาดโดนหลายตัวจึงสร้าง
     snapshot ใหม่ทั้งชุดหลายรอบใน tick เดียว ทั้งที่ผู้อ่านทุกรายเห็นแค่ค่าสุดท้ายของ tick
  */
  it('หนึ่ง step แจ้ง subscriber ไม่เกินหนึ่งครั้ง แม้สกิลจะโดนศัตรูหลายตัวพร้อมกัน', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    // กองศัตรูทุกตัวไว้ในระยะของสกิลกวาดรอบตัว = หลายเป้าในเฟรมเดียว
    for (const enemy of state.enemies) {
      enemy.position = { x: state.player.position.x + 40, y: state.player.position.y }
    }

    let calls = 0
    runtime.subscribe(() => {
      calls += 1
    })

    runtime.requestSkill('skill1')
    let maxCallsInOneStep = 0
    let sawMultiHitTick = false
    for (let t = 0; t < 1200; t += 16) {
      const before = calls
      const damageBefore = runtime.getSnapshot().damageEvents.length
      runtime.step(16)
      const callsThisStep = calls - before
      maxCallsInOneStep = Math.max(maxCallsInOneStep, callsThisStep)
      if (runtime.getSnapshot().damageEvents.length - damageBefore > 1) sawMultiHitTick = true
    }

    // fixture ต้องเกิดเหตุการณ์ "โดนหลายตัวใน tick เดียว" จริง ไม่งั้นเทสต์นี้ไม่ได้พิสูจน์อะไร
    expect(sawMultiHitTick).toBe(true)
    expect(maxCallsInOneStep).toBe(1)
    expect(state.damageDealt).toBeGreaterThan(0)
  })

  /*
     stepPlayerAttack (คอมโบพื้นฐาน) มี publishRequested = true ของตัวเองแยกจาก stepPlayerSkill
     ด้านบน — คนละจุดในไฟล์ คนละลูป ต้องพิสูจน์แยกกัน เทสต์สกิลด้านบนไม่แตะจุดนี้เลย
     (สกิลตัดคอมโบทิ้งตั้งแต่เริ่มร่าย ไม่มีทาง stepPlayerAttack ทำงานพร้อมกัน)
  */
  it('หนึ่ง step แจ้ง subscriber ไม่เกินหนึ่งครั้ง แม้คอมโบพื้นฐานจะโดนศัตรูหลายตัวพร้อมกัน', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    // ระยะคอมโบไม้แรกของหงอคง (attackChains.ts): range 120, depthTolerance 95
    for (const enemy of state.enemies) {
      enemy.position = { x: state.player.position.x + 60, y: state.player.position.y }
    }

    let calls = 0
    runtime.subscribe(() => {
      calls += 1
    })

    runtime.requestAttack()
    let maxCallsInOneStep = 0
    let sawMultiHitTick = false
    for (let t = 0; t < 600; t += 16) {
      const before = calls
      const damageBefore = runtime.getSnapshot().damageEvents.length
      runtime.step(16)
      const callsThisStep = calls - before
      maxCallsInOneStep = Math.max(maxCallsInOneStep, callsThisStep)
      if (runtime.getSnapshot().damageEvents.length - damageBefore > 1) sawMultiHitTick = true
    }

    expect(sawMultiHitTick).toBe(true)
    expect(maxCallsInOneStep).toBe(1)
    expect(state.damageDealt).toBeGreaterThan(0)
  })

  /*
     resolveEnemyAttack (ศัตรูตีผู้เล่น) มี publishRequested = true ของตัวเองอีกจุดหนึ่ง — สอง
     เทสต์บนไม่แตะจุดนี้เลย (ทั้งคู่เป็นฝั่งผู้เล่นตี ไม่ใช่ฝั่งศัตรูตี)

     พิสูจน์ทาง "นับจำนวนครั้ง publish ต่อ step" แบบสองเทสต์บนใช้ไม่ได้กับจุดนี้ — พิสูจน์แล้ว
     ด้วยการวัดจริง (สองตัวยืนคนละฝั่งผู้เล่น ระยะเท่ากันเป๊ะ ไม่มี RNG เกี่ยว เดิน state machine
     ตรงกันทุกติ๊ก): แม้ทั้งคู่เข้าช่วง active window พร้อมกัน ก็ยังลงดาเมจได้แค่ตัวเดียวต่อติ๊ก
     เสมอ เพราะ combatReaction.ts:64 ให้ i-frame ผู้เล่น 120ms ทันทีที่โดนตี ตัวที่สองในลูปเดียวกัน
     จึงโดน invulnerableUntilMs กันไว้เสมอ — resolveEnemyAttack ก็รับเป้าหมายแค่ [state.player]
     (ตัวเดียวตายตัว) แปลว่า for-loop ต่อเป้าหมายในนี้ไม่มีทางวนเกินหนึ่งรอบได้เลยไม่ว่ากรณีใด
     การนับจำนวนแจ้ง subscriber จึงแยกแยะ this.publish() ทันทีกับ this.publishRequested = true
     ไม่ออกที่จุดนี้จุดเดียว — ต้องตรวจตรงซอร์สแทน
  */
  it('resolveEnemyAttack ต้อง publish ผ่านคิว publishRequested เท่านั้น ห้ามเรียก publish() ตรง ๆ ในลูป', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'RealtimeBattleRuntime.ts'), 'utf8')
    const methodStart = source.indexOf('private resolveEnemyAttack(')
    expect(methodStart).toBeGreaterThan(-1)
    const methodEnd = source.indexOf('\n  private pushDamageEvent(', methodStart)
    expect(methodEnd).toBeGreaterThan(methodStart)

    const body = source.slice(methodStart, methodEnd)
    expect(body).toContain('this.publishRequested = true')
    expect(body).not.toContain('this.publish()')
  })

  /*
     QC (2026-08-10, MEMORY item 189): `living` คิดครั้งเดียวตอนต้น tick ก่อน stepAllies —
     ถ้า summon ตีศัตรูตายกลาง stepAllies ศพตัวนั้นยังค้างอยู่ใน living เดิม (คนละเรื่องกับ
     .state ที่เพิ่งเปลี่ยน — อ้างถึง object เดียวกัน) แล้วถูกส่งต่อเข้า separateEnemies
     ทำให้ศพไปเบียดตำแหน่งศัตรูที่ยังไม่ตายออกไปไกลผิดที่ผิดทาง วัดได้จริงกว่า 100 หน่วยต่อติ๊ก
  */
  it('ally ฆ่าศัตรูกลางติ๊ก ต้องไม่ทำให้ศพไปเบียดตำแหน่งศัตรูที่ยังไม่ตาย', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('สร้างสถานะตั้งต้นไม่สำเร็จ')
    const runtime = new RealtimeBattleRuntime(state)
    runtime.step(1000) // brain ยังไม่ขยับเลยสักติ๊ก — ปลอดภัยที่จะจัดตำแหน่งใหม่ตรงนี้

    // ย้ายผู้เล่นออกไปไกลสุดขอบ ให้ศัตรูทุกตัวอยู่นอก detectRange (1600) จะได้ไม่ไล่ตามเอง
    state.player.position = { x: 1, y: 1 }

    const [victim, bystander] = state.enemies
    victim.position = { x: 1700, y: 1000 }
    victim.hp = 1 // สูตรดาเมจมีพื้นขั้นต่ำ 1 เสมอ (ดูคอมเมนต์ stageConfig.ts) — โดนตีครั้งเดียวตายแน่
    bystander.position = { ...victim.position } // ซ้อนสนิท (distance=0) ให้ทิศทางการดันคงที่
    const bystanderStart = { ...bystander.position }

    const ally: RealtimeBattleEntity = {
      ...victim,
      id: 'ally-probe',
      entityType: 'ally',
      hp: 100,
      maxHp: 100,
      attackCooldownRemainingMs: 0,
      position: { x: victim.position.x - 50, y: victim.position.y },
    }
    state.allies = [ally]

    runtime.step(16)

    expect(victim.state).toBe('dead')
    expect(bystander.position).toEqual(bystanderStart)
  })

  it('ดาเมจที่เกิดใน tick ยังอยู่ครบใน snapshot ตอนจบ step เดียวกัน', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    state.enemies[0].position = {
      x: state.player.position.x + 40,
      y: state.player.position.y,
    }

    runtime.requestAttack()
    for (let t = 0; t < 400; t += 16) runtime.step(16)

    const events = runtime.getSnapshot().damageEvents
    expect(events.length).toBeGreaterThan(0)
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
    expect(events.map((event) => event.createdAtMs)).toEqual(
      events.map((event) => event.createdAtMs).toSorted((a, b) => a - b),
    )
  })

  /*
     ศพต้องอยู่ใน state.enemies ต่อไปหลังตาย — ชั้นวาดอ่านรายการนี้เพื่อเล่นแอนิเมชันตาย
     แล้วค้างเป็นร่างจาง ๆ (EntitySprite: opacity 0.35 ตอน state 'dead') และ EnemyHealthBar
     จองช่องตามดัชนีของรายการนี้ ถ้าลบศพออกกลางคัน แอนิเมชันจะหายทันทีและหลอดเลือด
     ของตัวที่ยังไม่ตายจะเลื่อนช่อง
  */
  it('ศพยังอยู่ในรายการศัตรูและใน snapshot ต่อไป — แอนิเมชันตายเล่นจนจบได้', () => {
    const state = createRealtimeBattle('trial-02', makePlayer())
    if (!state) throw new Error('สร้างสถานะตั้งต้นไม่สำเร็จ')
    const runtime = new RealtimeBattleRuntime(state)
    runtime.step(1000)

    const firstWave = state.enemies.map((enemy) => enemy.id)
    const corpseId = firstWave[0]
    const corpse = state.enemies[0]
    corpse.state = 'dead'
    corpse.hp = 0
    const restingPlace = { ...corpse.position }

    for (let t = 0; t < 2000; t += 16) runtime.step(16)

    expect(state.enemies.map((enemy) => enemy.id)).toEqual(expect.arrayContaining([corpseId]))
    expect(runtime.getSnapshot().enemies.map((enemy) => enemy.id)).toEqual(
      expect.arrayContaining([corpseId]),
    )
    // ศพต้องไม่ถูกจำลองต่อ: ไม่เดิน ไม่ถูกดันแยก ไม่กลับมามีชีวิต
    expect(corpse.state).toBe('dead')
    expect(corpse.position).toEqual(restingPlace)
    expect(runtime.getEntityById(corpseId)).toBe(corpse)
  })

  it('ศัตรูที่ตายคาเทเลกราฟต้องไม่ทิ้งเครื่องหมายพื้นค้างไว้', () => {
    const runtime = makeRuntime()
    runtime.step(1000)

    const state = runtime.getState()
    const enemy = state.enemies[0]
    // ยืนติดผู้เล่นจนเข้าระยะโจมตี แล้วเดินเวลาจนกว่าจะเริ่มเงื้อท่า
    for (let t = 0; t < 4000 && runtime.getTelegraphMarkers().length === 0; t += 16) {
      enemy.position = { x: state.player.position.x + 20, y: state.player.position.y }
      runtime.step(16)
    }
    expect(runtime.getTelegraphMarkers().map((marker) => marker.enemyId)).toContain(enemy.id)

    enemy.state = 'dead'
    enemy.hp = 0
    runtime.step(16)

    expect(runtime.getTelegraphMarkers().map((marker) => marker.enemyId)).not.toContain(enemy.id)
  })

  it('getEntityById หาตัวเดิมได้ และยังถูกต้องหลังคลื่นใหม่ถูกสร้าง', () => {
    const state = createRealtimeBattle('trial-02', makePlayer())
    if (!state) throw new Error('สร้างสถานะตั้งต้นไม่สำเร็จ')
    const runtime = new RealtimeBattleRuntime(state)
    runtime.step(1000)

    for (const enemy of state.enemies) {
      expect(runtime.getEntityById(enemy.id)).toBe(enemy)
    }
    expect(runtime.getEntityById(state.player.id)).toBe(state.player)
    expect(runtime.getEntityById('ไม่มีตัวนี้')).toBeNull()

    for (const enemy of state.enemies) {
      enemy.state = 'dead'
      enemy.hp = 0
    }
    runtime.step(16)
    expect(state.currentWaveIndex).toBe(1)

    // ดัชนีต้องรู้จักศัตรูคลื่นใหม่ด้วย ไม่ใช่ค้างอยู่กับชุดเดิม
    for (const enemy of state.enemies) {
      expect(runtime.getEntityById(enemy.id)).toBe(enemy)
    }
  })

  it('basic attack ใช้ทิศที่ผู้เล่นหันอยู่ ไม่ auto-face หาศัตรู', () => {
    const runtime = makeRuntime()
    runtime.step(1000)
    const state = runtime.getState()

    state.player.combatFacing = 'left'
    state.player.facing = 'left'
    state.enemies[0].position = {
      x: state.player.position.x + 80,
      y: state.player.position.y,
    }

    runtime.requestAttack()
    runtime.step(16)

    expect(state.player.combatFacing).toBe('left')
    expect(state.player.facing).toBe('left')
  })

  it('เดินพร้อม basic attack ได้ช่วง startup/recovery แต่ล็อกเฉพาะ active-hit window', () => {
    const runtime = makeRuntime()
    runtime.step(1000)
    const state = runtime.getState()
    const firstAttack = PLAYER_ATTACK_CHAIN[0]

    runtime.setMoveInput({ x: 1, y: 0 })
    const beforeStartup = state.player.position.x
    runtime.requestAttack()
    runtime.step(16)
    expect(state.player.position.x).toBeGreaterThan(beforeStartup)

    runtime.setMoveInput({ x: 0, y: 0 })
    runtime.step(firstAttack.startupMs - 16)
    const atActiveStart = state.player.position.x
    runtime.setMoveInput({ x: 1, y: 0 })
    runtime.step(16)
    expect(state.player.position.x).toBe(atActiveStart)

    runtime.setMoveInput({ x: 0, y: 0 })
    runtime.step(firstAttack.activeMs)
    const atRecovery = state.player.position.x
    runtime.setMoveInput({ x: 1, y: 0 })
    runtime.step(16)
    expect(state.player.position.x).toBeGreaterThan(atRecovery)
  })
})

describe('movementDuringCast runtime consumer', () => {
  function runtimeForMovementTest(): RealtimeBattleRuntime {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('สร้างสถานะตั้งต้นไม่สำเร็จ')
    return new RealtimeBattleRuntime(state)
  }

  it('moves only when the active skill explicitly opts in', () => {
    const original = MONKEY_SPINNING_STAFF.movementDuringCast

    try {
      const lockedRuntime = runtimeForMovementTest()
      lockedRuntime.step(1000)
      lockedRuntime.setMoveInput({ x: 1, y: 0 })
      const lockedStartX = lockedRuntime.getState().player.position.x
      lockedRuntime.requestSkill('skill1')
      lockedRuntime.step(16)
      expect(lockedRuntime.getState().player.position.x).toBe(lockedStartX)

      MONKEY_SPINNING_STAFF.movementDuringCast = true
      const movingRuntime = runtimeForMovementTest()
      movingRuntime.step(1000)
      movingRuntime.setMoveInput({ x: 1, y: 0 })
      const movingStartX = movingRuntime.getState().player.position.x
      movingRuntime.requestSkill('skill1')
      movingRuntime.step(16)

      expect(movingRuntime.getState().player.position.x).toBeGreaterThan(movingStartX)
      expect(movingRuntime.getState().player.state).toBe('skill')
    } finally {
      if (original === undefined) delete MONKEY_SPINNING_STAFF.movementDuringCast
      else MONKEY_SPINNING_STAFF.movementDuringCast = original
    }
  })
})
