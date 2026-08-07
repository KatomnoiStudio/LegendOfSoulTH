import { describe, expect, it } from 'vitest'
import { assert, array, integer, property } from 'fast-check'
import { addUltimateGauge, isUltimateReady, ULTIMATE_GAUGE_CONFIG } from './ultimateGauge'

/*
  ultimateGauge.test.ts (ไฟล์พี่น้อง) ตรวจค่าตายตัวไม่กี่ชุด ไฟล์นี้ตรวจว่า gauge อยู่ในช่วง
  [0, max] เสมอไม่ว่าจะเติมกี่ครั้ง ครั้งละเท่าไหร่ (ลำดับ increment แบบสุ่มยาวแค่ไหนก็ตาม)
*/

const incrementArb = integer({ min: 0, max: 1000 })

describe('addUltimateGauge — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('gauge อยู่ในช่วง [0, max] เสมอ ไม่ว่าจะเติมกี่ครั้งด้วยจำนวนเท่าไหร่', () => {
    assert(
      property(array(incrementArb, { minLength: 0, maxLength: 200 }), (increments) => {
        const final = increments.reduce((gauge, amount) => addUltimateGauge(gauge, amount), 0)
        expect(final).toBeGreaterThanOrEqual(0)
        expect(final).toBeLessThanOrEqual(ULTIMATE_GAUGE_CONFIG.max)
      }),
    )
  })

  it('isUltimateReady เป็นจริงก็ต่อเมื่อ gauge ถึง max เท่านั้น', () => {
    assert(
      property(array(incrementArb, { minLength: 0, maxLength: 200 }), (increments) => {
        const final = increments.reduce((gauge, amount) => addUltimateGauge(gauge, amount), 0)
        expect(isUltimateReady(final)).toBe(final >= ULTIMATE_GAUGE_CONFIG.max)
      }),
    )
  })
})
