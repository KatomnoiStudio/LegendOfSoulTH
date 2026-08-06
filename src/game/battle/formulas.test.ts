import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { applyDefense, calcMaxHp, calcPhysicalDamage, rollInt } from './formulas'

describe('rollInt', () => {
  test('stays within [min, max] inclusive across the range', () => {
    for (let i = 0; i < 200; i++) {
      const value = rollInt(3, 7)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(7)
    }
  })
})

describe('calcPhysicalDamage', () => {
  beforeEach(() => {
    // ล็อก variance ไว้ที่กึ่งกลาง (0.88 + 0.5*0.24 = 1.0) ให้ผลลัพธ์ deterministic
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('scales with attack and multiplier, reduced by defense', () => {
    expect(calcPhysicalDamage(100, 20, 1)).toBe(91) // 100*1*1.0 - 20*0.42 = 91.6 -> floor 91
    expect(calcPhysicalDamage(100, 20, 1.5)).toBe(141) // 150 - 8.4 = 141.6 -> floor 141
  })

  test('never returns less than 1, even against overwhelming defense', () => {
    expect(calcPhysicalDamage(1, 10_000, 1)).toBe(1)
  })
})

describe('applyDefense', () => {
  test('passes damage through unchanged when not defending', () => {
    expect(applyDefense(50, false)).toBe(50)
  })

  test('halves damage (floored) when defending', () => {
    expect(applyDefense(51, true)).toBe(25)
  })

  test('never returns less than 1 even for tiny damage', () => {
    expect(applyDefense(1, true)).toBe(1)
  })
})

describe('calcMaxHp', () => {
  test('grows with level and defense', () => {
    expect(calcMaxHp(1, 10)).toBe(212) // 180 + 14 + 18
    expect(calcMaxHp(10, 10)).toBe(338) // 180 + 140 + 18
  })
})
