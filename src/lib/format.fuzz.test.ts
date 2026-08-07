import { describe, expect, it } from 'vitest'
import { assert, constantFrom, double, property } from 'fast-check'
import { clampRatio } from './format'

describe('clampRatio — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ผลลัพธ์อยู่ในช่วง [0, 1] เสมอ ไม่ว่า current/total จะเป็นเท่าไหร่', () => {
    assert(
      property(
        double({ noNaN: true, min: -1e9, max: 1e9 }),
        double({ noNaN: true, min: -1e9, max: 1e9 }),
        (current, total) => {
          const ratio = clampRatio(current, total)
          expect(ratio).toBeGreaterThanOrEqual(0)
          expect(ratio).toBeLessThanOrEqual(1)
          expect(Number.isNaN(ratio)).toBe(false)
        },
      ),
    )
  })

  it('total ที่ไม่ใช่จำนวนจำกัด (NaN, Infinity, ติดลบ, ศูนย์) คืน 0 เสมอ ไม่ใช่ NaN', () => {
    assert(
      property(
        double(),
        constantFrom(NaN, Infinity, -Infinity, 0, -1, -0.001),
        (current, total) => {
          expect(clampRatio(current, total)).toBe(0)
        },
      ),
    )
  })

  it('current >= total (จำกัดค่า) ให้ผล 1 เสมอ', () => {
    assert(
      property(double({ min: 0.001, max: 1e9, noNaN: true }), (total) => {
        expect(clampRatio(total, total)).toBe(1)
        expect(clampRatio(total * 2, total)).toBe(1)
      }),
    )
  })
})
