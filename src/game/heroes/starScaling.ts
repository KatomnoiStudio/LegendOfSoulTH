import type { CharacterStats } from '../characters'

/**
 * Star ascension stat multipliers — Blueprint §4.3 (★6 ≤ 130% ★1)
 * Ring 0 P9 baseline — shared by preview UI and authoritative battle stat resolution.
 */
export const STAR_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 1.06,
  3: 1.12,
  4: 1.18,
  5: 1.24,
  6: 1.3,
}

export const MAX_STAR_TIER = 6

export function statsAtStar(base: CharacterStats, star: number): CharacterStats {
  const tier = Math.min(MAX_STAR_TIER, Math.max(1, Math.floor(star)))
  const multiplier = STAR_MULTIPLIERS[tier] ?? 1
  return {
    // Floor is intentional: rounding each field independently can make aggregate ★6 power
    // exceed the locked 130% ceiling even when the nominal multiplier itself is exactly 1.30.
    hp: Math.floor(base.hp * multiplier),
    atk: Math.floor(base.atk * multiplier),
    def: Math.floor(base.def * multiplier),
    spd: Math.floor(base.spd * multiplier),
  }
}

export function starPowerRatio(star: number): number {
  return STAR_MULTIPLIERS[Math.min(MAX_STAR_TIER, Math.max(1, star))] ?? 1
}
