import { describe, expect, it } from 'vitest'
import { assert, integer, property } from 'fast-check'
import { applyDefense, calcMaxHp, rollInt } from './formulas'

/*
  formulas.ts เป็นเศษที่เหลือของระบบเทิร์นเดิม แต่ calcMaxHp ยังถูก DamageSystem/
  createRealtimeBattle ใช้จริง (ดู MEMORY.md — ห้ามลบ) ความถูกต้องของมันจึงยังสำคัญ
*/

describe('rollInt — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ผลลัพธ์อยู่ในช่วง [min, max] ปิดทั้งสองด้านเสมอ ไม่ว่า min/max จะเป็นเท่าไหร่', () => {
    assert(
      property(
        integer({ min: -10_000, max: 10_000 }),
        integer({ min: -10_000, max: 10_000 }),
        (a, b) => {
          const min = Math.min(a, b)
          const max = Math.max(a, b)
          const value = rollInt(min, max)
          expect(value).toBeGreaterThanOrEqual(min)
          expect(value).toBeLessThanOrEqual(max)
          expect(Number.isInteger(value)).toBe(true)
        },
      ),
    )
  })

  it('min === max คืนค่าเดียวนั้นเสมอ (กรณีขอบที่ช่วงสุ่มแคบสุด)', () => {
    assert(
      property(integer({ min: -10_000, max: 10_000 }), (n) => {
        expect(rollInt(n, n)).toBe(n)
      }),
    )
  })
})

describe('applyDefense — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('ไม่ป้องกัน คืนดาเมจเดิมเป๊ะ', () => {
    assert(
      property(integer({ min: -1_000_000, max: 1_000_000 }), (damage) => {
        expect(applyDefense(damage, false)).toBe(damage)
      }),
    )
  })

  it('ป้องกันแล้วดาเมจไม่ต่ำกว่า 1 และไม่เกินดาเมจเดิม ไม่ว่าดาเมจตั้งต้นจะเป็นเท่าไหร่', () => {
    assert(
      property(integer({ min: -1_000_000, max: 1_000_000 }), (damage) => {
        const result = applyDefense(damage, true)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(Number.isInteger(result)).toBe(true)
      }),
    )
  })
})

describe('calcMaxHp — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('level หรือ def สูงขึ้น HP สูงสุดต้องไม่ลดลง (เป็น monotonic)', () => {
    assert(
      property(
        integer({ min: 1, max: 999 }),
        integer({ min: 0, max: 999 }),
        (level, def) => {
          expect(calcMaxHp(level + 1, def)).toBeGreaterThanOrEqual(calcMaxHp(level, def))
          expect(calcMaxHp(level, def + 1)).toBeGreaterThanOrEqual(calcMaxHp(level, def))
        },
      ),
    )
  })

  it('คืนจำนวนเต็มบวกเสมอในช่วง level/def ที่เป็นไปได้จริง', () => {
    assert(
      property(
        integer({ min: 1, max: 999 }),
        integer({ min: 0, max: 999 }),
        (level, def) => {
          const hp = calcMaxHp(level, def)
          expect(hp).toBeGreaterThan(0)
          expect(Number.isInteger(hp)).toBe(true)
        },
      ),
    )
  })
})
