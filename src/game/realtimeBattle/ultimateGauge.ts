/**
 * Ultimate gauge — Blueprint v3 P3
 *
 * เติมจากการต่อสู้ ใช้ครั้งเดียวเมื่อเต็ม ไม่มีคูลดาวน์แยก (ต่างจากสกิล 1–3)
 */

export const ULTIMATE_GAUGE_CONFIG = {
  max: 100,
  gainOnBasicHit: 8,
  gainOnSkillHit: 10,
  gainOnKill: 25,
} as const

export function addUltimateGauge(current: number, amount: number): number {
  return Math.min(ULTIMATE_GAUGE_CONFIG.max, current + amount)
}

export function isUltimateReady(gauge: number): boolean {
  return gauge >= ULTIMATE_GAUGE_CONFIG.max
}
