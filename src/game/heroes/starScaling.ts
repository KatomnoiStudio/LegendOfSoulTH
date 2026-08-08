import type { CharacterStats } from '../characters'

/**
 * Star ascension stat multipliers — Blueprint §4.3 (★6 ≤ 130% ★1)
 * ตัวเลขรอ Ring 0 final lock; โครงสร้างพร้อมสำหรับ P9 integration
 */
export const STAR_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 1.05,
  3: 1.1,
  4: 1.15,
  5: 1.22,
  6: 1.3,
}

export const MAX_STAR_TIER = 6

export function statsAtStar(base: CharacterStats, star: number): CharacterStats {
  const tier = Math.min(MAX_STAR_TIER, Math.max(1, Math.floor(star)))
  const multiplier = STAR_MULTIPLIERS[tier] ?? 1
  return {
    hp: Math.round(base.hp * multiplier),
    atk: Math.round(base.atk * multiplier),
    def: Math.round(base.def * multiplier),
    spd: Math.round(base.spd * multiplier),
  }
}

export function starPowerRatio(star: number): number {
  return STAR_MULTIPLIERS[Math.min(MAX_STAR_TIER, Math.max(1, star))] ?? 1
}
