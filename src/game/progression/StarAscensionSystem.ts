import type { Character, CharacterStats } from '../characters'
import type { OwnedCharacter } from '../../types/player'

/**
 * ระดับดาวขั้นต่ำและสูงสุด (★1 – ★6)
 * ล็อกตาม Master Blueprint §4.3 (ช่องว่างสเตตัสสูงสุดไม่เกิน 130% เทียบ ★6 กับ ★1)
 */
export const MIN_STAR = 1
export const MAX_STAR = 6

export interface StarTierConfig {
  /** จำนวนตัวซ้ำ/ชิ้นส่วนที่ต้องใช้เพื่อเลื่อนจากระดับก่อนหน้ามายังระดับนี้ */
  duplicatesRequired: number
  /** ตัวคูณสเตตัสรวม (1.00 = 100%, 1.30 = 130%) */
  statMultiplier: number
}

/**
 * ตารางการเลื่อนระดับดาว (Star Ascension Table)
 * ออกแบบเป็น plain data table ตาม Master Blueprint §4.3 และ Low-maintenance-cost design
 */
export const STAR_ASCENSION_TABLE: Record<number, StarTierConfig> = {
  1: { duplicatesRequired: 0, statMultiplier: 1.0 },
  2: { duplicatesRequired: 1, statMultiplier: 1.06 },
  3: { duplicatesRequired: 2, statMultiplier: 1.12 },
  4: { duplicatesRequired: 4, statMultiplier: 1.18 },
  5: { duplicatesRequired: 8, statMultiplier: 1.24 },
  6: { duplicatesRequired: 12, statMultiplier: 1.3 },
}

/**
 * คืนค่าตัวคูณสเตตัสตามระดับดาว (หนีบระหว่าง 1 ถึง 6)
 */
export function getStarMultiplier(star: number): number {
  const clamped = Math.max(MIN_STAR, Math.min(MAX_STAR, Math.floor(star)))
  return STAR_ASCENSION_TABLE[clamped]?.statMultiplier ?? 1.0
}

/**
 * คืนค่าจำนวนตัวซ้ำที่ต้องใช้เพื่อขึ้นระดับดาวเป้าหมาย (targetStar)
 */
export function getDuplicatesRequiredForStar(targetStar: number): number {
  if (targetStar <= MIN_STAR || targetStar > MAX_STAR) return 0
  return STAR_ASCENSION_TABLE[targetStar]?.duplicatesRequired ?? 0
}

/**
 * คำนวณสเตตัสของฮีโร่ตามระดับดาว
 * @param character ข้อมูลตัวละครพื้นฐาน
 * @param star ระดับดาว (1–6)
 */
export function statsAtStar(character: Character, star: number): CharacterStats {
  const multiplier = getStarMultiplier(star)
  return {
    hp: Math.round(character.stats.hp * multiplier),
    atk: Math.round(character.stats.atk * multiplier),
    def: Math.round(character.stats.def * multiplier),
    spd: Math.round(character.stats.spd * multiplier),
  }
}

/**
 * คำนวณผลรวมสเตตัสทั้งหมดของฮีโร่
 */
export function getTotalStats(stats: CharacterStats): number {
  return stats.hp + stats.atk + stats.def + stats.spd
}

export interface AscensionResult {
  success: boolean
  newStar: number
  duplicatesRemaining: number
  error?: string
}

/**
 * ตรวจสอบว่าสามารถเลื่อนดาวได้หรือไม่
 */
export function canAscendStar(owned: OwnedCharacter, duplicatesAvailable: number = 0): boolean {
  const currentStar = owned.star ?? MIN_STAR
  if (currentStar >= MAX_STAR) return false
  const nextStar = currentStar + 1
  const required = getDuplicatesRequiredForStar(nextStar)
  const totalAvailable = (owned.shards ?? 0) + duplicatesAvailable
  return totalAvailable >= required
}

/**
 * เลื่อนระดับดาวของตัวละครที่ครอบครอง
 * @param owned ข้อมูลตัวละครที่ครอบครอง
 * @param additionalDuplicates ตัวซ้ำที่ป้อนเพิ่มเข้ามา
 */
export function ascendStar(
  owned: OwnedCharacter,
  additionalDuplicates: number = 0,
): AscensionResult {
  const currentStar = owned.star ?? MIN_STAR

  if (currentStar >= MAX_STAR) {
    return {
      success: false,
      newStar: currentStar,
      duplicatesRemaining: (owned.shards ?? 0) + additionalDuplicates,
      error: 'ระดับดาวถึงขั้นสูงสุดแล้ว (★6)',
    }
  }

  const nextStar = currentStar + 1
  const required = getDuplicatesRequiredForStar(nextStar)
  const totalAvailable = (owned.shards ?? 0) + additionalDuplicates

  if (totalAvailable < required) {
    return {
      success: false,
      newStar: currentStar,
      duplicatesRemaining: totalAvailable,
      error: `จำนวนตัวซ้ำไม่เพียงพอ (ต้องการ ${required} ตัว แต่มี ${totalAvailable} ตัว)`,
    }
  }

  return {
    success: true,
    newStar: nextStar,
    duplicatesRemaining: totalAvailable - required,
  }
}
