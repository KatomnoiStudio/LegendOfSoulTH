import { describe, expect, it } from 'vitest'
import { addUltimateGauge, isUltimateReady, ULTIMATE_GAUGE_CONFIG } from './ultimateGauge'

describe('ultimateGauge', () => {
  it('เติม gauge ไม่เกิน max', () => {
    expect(addUltimateGauge(90, 20)).toBe(ULTIMATE_GAUGE_CONFIG.max)
    expect(addUltimateGauge(0, 8)).toBe(8)
  })

  it('พร้อมใช้อัลติเมทเมื่อ gauge เต็ม', () => {
    expect(isUltimateReady(ULTIMATE_GAUGE_CONFIG.max)).toBe(true)
    expect(isUltimateReady(ULTIMATE_GAUGE_CONFIG.max - 1)).toBe(false)
  })
})
