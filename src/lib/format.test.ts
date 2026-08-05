import { describe, expect, test } from 'vitest'
import { clampRatio, formatBadge, formatNumber } from './format'

describe('formatNumber', () => {
  test('adds thousands separators', () => {
    expect(formatNumber(12450)).toBe('12,450')
  })
})

describe('formatBadge', () => {
  test('passes through values under 100', () => {
    expect(formatBadge(42)).toBe('42')
  })

  test('caps at 99+', () => {
    expect(formatBadge(132)).toBe('99+')
  })
})

describe('clampRatio', () => {
  test('returns 0 when total is 0 or invalid', () => {
    expect(clampRatio(5, 0)).toBe(0)
    expect(clampRatio(5, Number.NaN)).toBe(0)
  })

  test('clamps to [0, 1]', () => {
    expect(clampRatio(-5, 100)).toBe(0)
    expect(clampRatio(150, 100)).toBe(1)
    expect(clampRatio(25, 100)).toBe(0.25)
  })
})
