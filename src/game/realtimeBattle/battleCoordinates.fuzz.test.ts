import { describe, expect, it } from 'vitest'
import { assert, double, integer, property } from 'fast-check'
import { runtimeDepthNormalized, runtimeToWorldXZ } from './battleCoordinates'
import { WORLD_SCALE } from './stageConfig'
import type { RealtimeBattleStage } from './stageConfig'

/*
  battleCoordinates.test.ts (ไฟล์พี่น้อง) ตรวจจุดตายตัวไม่กี่จุด (center, origin, mid-depth)
  ไฟล์นี้ตรวจว่า runtime → world → runtime กลับมาที่เดิมเสมอ (round-trip) ไม่ว่า position/stage
  จะเป็นเท่าไหร่ — สัญญาพิกัดข้อนี้ถ้าพัง จะทำให้ตัวละครวาดผิดตำแหน่งบนจอโดยไม่มี error ใด ๆ
*/

const stageArb = integer({ min: 1, max: 10_000 }).chain((width) =>
  integer({ min: 1, max: 10_000 }).map((height): RealtimeBattleStage => ({
    id: 'test',
    name: 'test-arena',
    width,
    height,
    playerSpawn: { x: width / 2, y: height / 2 },
    enemySpawns: [],
    waves: [],
    chapterId: 'test-chapter',
    order: 1,
    stageType: 'wave',
  })),
)

describe('runtimeToWorldXZ — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('round-trip runtime → world → runtime กลับมาที่ตำแหน่งเดิมเสมอ', () => {
    assert(
      property(
        stageArb,
        double({ min: -100_000, max: 100_000, noNaN: true }),
        double({ min: -100_000, max: 100_000, noNaN: true }),
        (stage, x, y) => {
          const world = runtimeToWorldXZ({ x, y }, stage)
          const backX = world.x / WORLD_SCALE + stage.width / 2
          const backY = world.z / WORLD_SCALE + stage.height / 2
          expect(backX).toBeCloseTo(x, 6)
          expect(backY).toBeCloseTo(y, 6)
        },
      ),
    )
  })
})

describe('runtimeDepthNormalized — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ผลลัพธ์อยู่ในช่วง [0, 1] เสมอ ไม่ว่า y จะเป็นเท่าไหร่', () => {
    assert(
      property(stageArb, double({ min: -1_000_000, max: 1_000_000, noNaN: true }), (stage, y) => {
        const depth = runtimeDepthNormalized(y, stage)
        expect(depth).toBeGreaterThanOrEqual(0)
        expect(depth).toBeLessThanOrEqual(1)
      }),
    )
  })

  it('y มากขึ้น depth ต้องไม่ลดลง (เป็น monotonic) ในช่วง stage เดียวกัน', () => {
    assert(
      property(
        stageArb,
        double({ min: -1_000_000, max: 1_000_000, noNaN: true }),
        double({ min: 0, max: 1_000_000, noNaN: true }),
        (stage, y, delta) => {
          expect(runtimeDepthNormalized(y + delta, stage)).toBeGreaterThanOrEqual(
            runtimeDepthNormalized(y, stage),
          )
        },
      ),
    )
  })
})
