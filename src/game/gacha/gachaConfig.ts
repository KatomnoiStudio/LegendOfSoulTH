/**
 * Gacha System (#23) Configuration
 * Reference: docs/agent-blueprint/23-gacha-system.md
 * Master Blueprint P9: Standard Banner, Probability Tables, Pity Rules, and Costs.
 */

export type GachaRarity = 'SSR' | 'SR' | 'R'

export interface GachaPoolEntry {
  characterId: string
  rarity: GachaRarity
  rateUp?: boolean
}

export interface GachaBannerConfig {
  id: string
  name: string
  description: string
  singleCostGems: number
  multiCostGems: number
  /** Hard pity: guaranteed SSR on or before this count (default 90) */
  hardPityCount: number
  /** Soft pity: rate starts scaling up after this count (default 75) */
  softPityCount: number
  /** Base drop rates per rarity (must sum to 1.0 / 100%) */
  baseRates: {
    SSR: number // e.g. 0.016 (1.6%)
    SR: number // e.g. 0.130 (13.0%)
    R: number // e.g. 0.854 (85.4%)
  }
  pool: GachaPoolEntry[]
}

/**
 * ตารางแปลงตัวละครซ้ำเป็นเศษดาว (Duplicate Shard Grants)
 */
export const GACHA_DUPLICATE_SHARDS: Record<GachaRarity, number> = {
  SSR: 30, // พอสำหรับเลื่อน 1★ -> 5★ หรือสะสมไป 6★
  SR: 10, // พอสำหรับเลื่อน 1★ -> 3★
  R: 2, // พอสำหรับเลื่อน 1★ -> 2★
}

/**
 * ตู้สุ่มมาตรฐาน (Standard Banner)
 */
export const STANDARD_BANNER: GachaBannerConfig = {
  id: 'standard-legend-banner',
  name: 'อัญเชิญปฐมบทขุนพลสวรรค์',
  description: 'ตู้สุ่มอัญเชิญขุนพลระดับตำนาน ราชาแห่งวานร ซุนหงอคง และยอดขุนพลสวรรค์',
  singleCostGems: 160,
  multiCostGems: 1600,
  hardPityCount: 90,
  softPityCount: 75,
  baseRates: {
    SSR: 0.016, // 1.6%
    SR: 0.13, // 13.0%
    R: 0.854, // 85.4% (รวม 100.0%)
  },
  pool: [
    { characterId: 'monkey-king', rarity: 'SSR', rateUp: true },
    { characterId: 'pig-warrior', rarity: 'SR' },
    { characterId: 'pilgrim-monk', rarity: 'SR' },
  ],
}

/**
 * ตรวจสอบความถูกต้องของตารางความน่าจะเป็น (Done-criterion 4: Rate table sums to 100%)
 */
export function validateBannerConfig(banner: GachaBannerConfig): {
  valid: boolean
  error?: string
} {
  const sum = banner.baseRates.SSR + banner.baseRates.SR + banner.baseRates.R
  // Floating point tolerance
  if (Math.abs(sum - 1.0) > 0.0001) {
    return {
      valid: false,
      error: `อัตราสุ่มรวมต้องเท่ากับ 100% (คำนวณได้ ${(sum * 100).toFixed(2)}%)`,
    }
  }

  if (banner.pool.length === 0) {
    return { valid: false, error: 'รายชื่อขุนพลในตู้สุ่มต้องไม่ว่างเปล่า' }
  }

  const hasSSR = banner.pool.some((e) => e.rarity === 'SSR')
  if (!hasSSR) {
    return { valid: false, error: 'ตู้สุ่มต้องมีขุนพลระดับ SSR อย่างน้อย 1 ตัว' }
  }

  return { valid: true }
}
