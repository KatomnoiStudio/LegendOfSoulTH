import type { Character, CharacterStats } from '../characters'
import type { OwnedCharacter } from '../../types/player'

/**
 * Star Ascension System (#15)
 * Reference: docs/agent-blueprint/15-star-ascension-system.md
 * Master Blueprint §4.3: Power gap between ★1 and ★6 is strictly bounded to <= 130% (1.30).
 */

export const MIN_STAR = 1
export const MAX_STAR = 6

/**
 * ตารางตัวคูณสเตตัสตามระดับดาว (★1–★6)
 * ล็อคตาม Master Blueprint §4.3: ★6 ต้องไม่เกิน 130% ของ ★1
 */
export const STAR_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.05,
  3: 1.1,
  4: 1.16,
  5: 1.23,
  6: 1.3,
}

/**
 * ตารางจำนวนเศษตัวละครซ้ำที่ต้องใช้ในการเลื่อนขั้นแต่ละระดับดาว
 * key = ระดับดาวปัจจุบัน -> value = จำนวนเศษที่ต้องใช้เพื่อเลื่อนไปดาวถัดไป
 */
export const STAR_ASCENSION_COSTS: Record<number, number> = {
  1: 1, // 1 -> 2
  2: 2, // 2 -> 3
  3: 3, // 3 -> 4
  4: 4, // 4 -> 5
  5: 5, // 5 -> 6
}

export interface AscensionResult {
  success: boolean
  previousStar: number
  newStar: number
  consumedShards: number
  remainingShards: number
  updatedCharacter: OwnedCharacter
  error?: string
}

/**
 * คืนค่าระดับดาวที่ปลอดภัย (1-6) สำหรับตัวละครที่อาจจะยังไม่มีค่า star ในฐานข้อมูลเก่า
 */
export function getCharacterStar(character?: Partial<OwnedCharacter> | null): number {
  if (!character || typeof character.star !== 'number' || Number.isNaN(character.star)) {
    return MIN_STAR
  }
  return Math.max(MIN_STAR, Math.min(MAX_STAR, Math.floor(character.star)))
}

/**
 * คืนค่าจำนวนเศษตัวละครที่ปลอดภัย (>= 0)
 */
export function getCharacterShards(character?: Partial<OwnedCharacter> | null): number {
  if (!character || typeof character.shards !== 'number' || Number.isNaN(character.shards)) {
    return 0
  }
  return Math.max(0, Math.floor(character.shards))
}

/**
 * คำนวณค่าสเตตัสสุทธิหลังคูณระดับดาว (Pure Function)
 */
export function statsAtStar(baseStats: CharacterStats, star: number): CharacterStats {
  const safeStar = Math.max(MIN_STAR, Math.min(MAX_STAR, Math.floor(star)))
  const multiplier = STAR_MULTIPLIERS[safeStar] ?? 1.0

  return {
    hp: Math.floor(baseStats.hp * multiplier),
    atk: Math.floor(baseStats.atk * multiplier),
    def: Math.floor(baseStats.def * multiplier),
    spd: baseStats.spd, // Spd ไม่เพิ่มตามดาวเพื่อรักษาสมดุลแอนิเมชันและการเคลื่อนที่
  }
}

/**
 * คำนวณผลรวมสเตตัสทั้งหมด (Total Stat Value) เพื่อใช้ตรวจสอบ invariant 130%
 */
export function calculateTotalStatValue(stats: CharacterStats): number {
  return stats.hp + stats.atk + stats.def
}

/**
 * ตรวจสอบว่าสามารถเลื่อนขั้นดาวได้หรือไม่
 */
export function canAscend(currentStar: number, availableShards: number): boolean {
  const safeStar = Math.max(MIN_STAR, Math.min(MAX_STAR, Math.floor(currentStar)))
  if (safeStar >= MAX_STAR) {
    return false
  }

  const cost = STAR_ASCENSION_COSTS[safeStar]
  if (typeof cost !== 'number') {
    return false
  }

  return availableShards >= cost
}

/**
 * คำนวณเศษที่ต้องใช้สำหรับดาวถัดไป (คืนค่า null หากถึงดาวสูงสุดแล้ว)
 */
export function getRequiredShardsForNextStar(currentStar: number): number | null {
  const safeStar = Math.max(MIN_STAR, Math.min(MAX_STAR, Math.floor(currentStar)))
  if (safeStar >= MAX_STAR) {
    return null
  }
  return STAR_ASCENSION_COSTS[safeStar] ?? null
}

/**
 * ดำเนินการเลื่อนขั้นดาวตัวละคร (Pure Transformation)
 */
export function ascendCharacter(
  character: OwnedCharacter,
  overrideShards?: number,
): AscensionResult {
  const currentStar = getCharacterStar(character)
  const currentShards =
    overrideShards !== undefined ? overrideShards : getCharacterShards(character)

  if (currentStar >= MAX_STAR) {
    return {
      success: false,
      previousStar: currentStar,
      newStar: currentStar,
      consumedShards: 0,
      remainingShards: currentShards,
      updatedCharacter: { ...character, star: currentStar, shards: currentShards },
      error: 'ตัวละครมีระดับดาวสูงสุดแล้ว (★6)',
    }
  }

  const cost = STAR_ASCENSION_COSTS[currentStar]
  if (typeof cost !== 'number' || currentShards < cost) {
    return {
      success: false,
      previousStar: currentStar,
      newStar: currentStar,
      consumedShards: 0,
      remainingShards: currentShards,
      updatedCharacter: { ...character, star: currentStar, shards: currentShards },
      error: `เศษตัวละครไม่เพียงพอ (ต้องการ ${cost} เศษ แต่มี ${currentShards} เศษ)`,
    }
  }

  const newStar = currentStar + 1
  const remainingShards = currentShards - cost

  const updatedCharacter: OwnedCharacter = {
    ...character,
    star: newStar,
    shards: remainingShards,
  }

  return {
    success: true,
    previousStar: currentStar,
    newStar,
    consumedShards: cost,
    remainingShards,
    updatedCharacter,
  }
}
