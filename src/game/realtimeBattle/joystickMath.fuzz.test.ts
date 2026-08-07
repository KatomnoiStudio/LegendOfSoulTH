import { describe, expect, it } from 'vitest'
import { assert, double, float, property } from 'fast-check'
import { applyJoystickDeadZone, clampStickVector } from './joystickMath'

/*
  joystickMath.test.ts (ไฟล์พี่น้อง) ตรวจค่าตายตัวไม่กี่ชุด ไฟล์นี้ตรวจคุณสมบัติที่ต้องเป็นจริง
  เสมอไม่ว่า input จะเป็นเท่าไหร่ — ขนาดเวกเตอร์ผลลัพธ์ต้องไม่เกิน 1 (unit circle) เสมอ
*/

const rawArb = double({ min: -1000, max: 1000, noNaN: true })
const deadZoneArb = float({ min: Math.fround(0), max: Math.fround(0.9), noNaN: true })

describe('clampStickVector — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ขนาดเวกเตอร์ผลลัพธ์ไม่เกิน 1 เสมอ ไม่ว่า dx/dy/radius จะเป็นเท่าไหร่', () => {
    assert(
      property(rawArb, rawArb, double({ min: 1, max: 1000, noNaN: true }), (dx, dy, radius) => {
        const v = clampStickVector(dx, dy, radius)
        const length = Math.hypot(v.x, v.y)
        expect(length).toBeLessThanOrEqual(1 + 1e-9)
        expect(Number.isFinite(v.x)).toBe(true)
        expect(Number.isFinite(v.y)).toBe(true)
      }),
    )
  })
})

describe('applyJoystickDeadZone — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ขนาดเวกเตอร์ผลลัพธ์อยู่ในช่วง [0, 1] เสมอ ไม่ว่า input จะเป็นเท่าไหร่', () => {
    assert(
      property(rawArb, rawArb, deadZoneArb, (rawX, rawY, deadZone) => {
        const v = applyJoystickDeadZone(rawX, rawY, deadZone)
        const length = Math.hypot(v.x, v.y)
        expect(length).toBeLessThanOrEqual(1 + 1e-9)
        expect(length).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(v.x)).toBe(true)
        expect(Number.isFinite(v.y)).toBe(true)
      }),
    )
  })

  it('เข้า dead zone (length <= deadZone) คืน {0, 0} เป๊ะเสมอ', () => {
    assert(
      property(
        float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        deadZoneArb,
        (t, deadZone) => {
          // สุ่มมุมแล้วสเกลความยาวให้ไม่เกิน deadZone แน่นอน
          const length = t * deadZone
          const angle = t * Math.PI * 2
          const rawX = Math.cos(angle) * length
          const rawY = Math.sin(angle) * length
          expect(applyJoystickDeadZone(rawX, rawY, deadZone)).toEqual({ x: 0, y: 0 })
        },
      ),
    )
  })
})
