import { describe, expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { EnemyHealthBar } from './EnemyHealthBar'
import { createRealtimeBattle } from '../../game/realtimeBattle/createRealtimeBattle'
import { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import styles from './BattleScene.module.css'

/*
  ล็อกไว้ไม่ให้บั๊ก "หลอดเลือดหายตั้งแต่คลื่นสอง" กลับมา

  runtime ต่อศัตรูคลื่นใหม่ท้ายรายการเดิมโดยไม่ลบศพออก ถ้า capacity คิดจากคลื่นที่ใหญ่สุด
  แทนที่จะเป็นผลรวมทุกคลื่น ศัตรูที่ยังมีชีวิตในคลื่นหลังจะไม่มี DOM node ให้แสดงหลอดเลือดเลย
  เทสต์นี้ใช้ runtime จริงจาก createRealtimeBattle ไม่ mock ตัวเลข เพื่อไม่ให้หลุดจาก
  ข้อมูลด่านจริงถ้าใครมาแก้ stageConfig ทีหลัง (trial-02 = คลื่น 2 ตัว + คลื่น 3 ตัว = รวม 5)
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

describe('EnemyHealthBar', () => {
  test('เตรียมช่องหลอดเลือดครบตามผลรวมทุกคลื่น ไม่ใช่แค่คลื่นที่ใหญ่สุด', () => {
    const state = createRealtimeBattle('trial-02', makePlayer())
    // makePlayer() มีตัวละครในทีมเสมอ — null เกิดเฉพาะทีมว่าง ซึ่งไม่ใช่กรณีนี้
    if (!state) throw new Error('คาดว่าสร้างสถานะได้ — makePlayer() มีตัวละครในทีมแล้ว')
    const runtime = new RealtimeBattleRuntime(state)
    const totalEnemiesAcrossWaves = state.stage.waves.reduce((n, w) => n + w.enemies.length, 0)

    expect(totalEnemiesAcrossWaves).toBeGreaterThan(
      Math.max(...state.stage.waves.map((w) => w.enemies.length)),
    )

    const { container } = render(
      <EnemyHealthBar runtime={runtime} projection={{ current: { project: null } }} />,
    )

    const bars = container.querySelectorAll(`.${styles.enemyBar}`)
    expect(bars).toHaveLength(totalEnemiesAcrossWaves)
  })

  test('ด่านคลื่นเดียว (trial-01) ก็ยังเตรียมช่องครบตามจำนวนศัตรูจริง', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('คาดว่าสร้างสถานะได้ — makePlayer() มีตัวละครในทีมแล้ว')
    const runtime = new RealtimeBattleRuntime(state)
    const expected = state.stage.waves.reduce((n, w) => n + w.enemies.length, 0)

    const { container } = render(
      <EnemyHealthBar runtime={runtime} projection={{ current: { project: null } }} />,
    )

    expect(container.querySelectorAll(`.${styles.enemyBar}`)).toHaveLength(expected)
  })
})
