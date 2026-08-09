import { describe, expect, it } from 'vitest'
import { assert, constantFrom, double, property } from 'fast-check'
import { combatFacingFromDirection, combatFacingFromVector } from './combatFacing'
import type { Direction8 } from './types'

/*
  combatFacing.test.ts (ไฟล์พี่น้อง) ตรวจ mapping ตายตัวไม่กี่ทิศ ไฟล์นี้ตรวจคุณสมบัติที่ต้อง
  เป็นจริงเสมอ — ผลลัพธ์ต้องเป็น 'left' หรือ 'right' เป๊ะ ๆ เท่านั้น ไม่มีค่าอื่นหลุดออกมาได้
*/

const direction8Arb = constantFrom<Direction8>(
  'up',
  'down',
  'left',
  'right',
  'up-left',
  'up-right',
  'down-left',
  'down-right',
)

describe('combatFacingFromDirection — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ผลลัพธ์เป็น left หรือ right เท่านั้น ไม่ว่า Direction8 จะเป็นอะไร', () => {
    assert(
      property(direction8Arb, (dir) => {
        expect(['left', 'right']).toContain(combatFacingFromDirection(dir))
      }),
    )
  })
})

describe('combatFacingFromVector — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ผลลัพธ์เป็น left หรือ right เท่านั้น ไม่ว่า vector/fallback จะเป็นเท่าไหร่', () => {
    assert(
      property(
        double({ min: -1000, max: 1000, noNaN: true }),
        double({ min: -1000, max: 1000, noNaN: true }),
        constantFrom<'left' | 'right'>('left', 'right'),
        (x, y, fallback) => {
          expect(['left', 'right']).toContain(combatFacingFromVector({ x, y }, fallback))
        },
      ),
    )
  })

  it('x เกินเกณฑ์ 0.12 ทางบวก/ลบ ต้องได้ right/left ตรงทิศเสมอ ไม่ว่า fallback จะเป็นอะไร', () => {
    assert(
      property(
        double({ min: 0.13, max: 1000, noNaN: true }),
        double({ min: -1000, max: 1000, noNaN: true }),
        constantFrom<'left' | 'right'>('left', 'right'),
        (magnitude, y, fallback) => {
          expect(combatFacingFromVector({ x: magnitude, y }, fallback)).toBe('right')
          expect(combatFacingFromVector({ x: -magnitude, y }, fallback)).toBe('left')
        },
      ),
    )
  })
})
