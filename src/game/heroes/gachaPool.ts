import type { Rarity } from '../characters'
import { BATCH_01_CHARACTER_IDS } from './heroProductionBatch'

/**
 * Gacha pool data สำหรับ Production Batch 01 — รอ P9 engine merge
 * rate/pity ตัวเลขยัง NON-PRODUCTION (Blueprint §7.1 skeleton)
 */
export interface GachaPoolEntry {
  characterId: string
  rarity: Rarity
  weight: number
}

export const BATCH_01_GACHA_BANNER = {
  bannerId: 'batch-01-legends',
  displayName: 'ตำนานรามเกียรติ ชุดที่ 1',
  costGems: 160,
  softPityAt: 74,
  hardPityAt: 90,
  pool: [
    { characterId: 'monkey-king', rarity: 'legendary', weight: 5 },
    { characterId: 'pig-warrior', rarity: 'epic', weight: 12 },
    { characterId: 'celestial-archer', rarity: 'epic', weight: 12 },
    { characterId: 'nezha-warden', rarity: 'rare', weight: 18 },
    { characterId: 'sand-sage', rarity: 'rare', weight: 18 },
  ] satisfies GachaPoolEntry[],
} as const

export function validateGachaPoolEntries(): boolean {
  return BATCH_01_GACHA_BANNER.pool.every((entry) => isCharacterInBatch01Pool(entry.characterId))
}

export function isCharacterInBatch01Pool(characterId: string): boolean {
  return BATCH_01_CHARACTER_IDS.includes(characterId)
}
