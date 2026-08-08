import type { GachaBannerConfig, GachaPoolEntry, GachaRarity } from './gachaConfig'
import { GACHA_DUPLICATE_SHARDS, STANDARD_BANNER, validateBannerConfig } from './gachaConfig'
import type { OwnedCharacter, Player } from '../../types/player'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'

export interface GachaSingleResult {
  characterId: string
  rarity: GachaRarity
  isNew: boolean
  grantedShards: number
  pityCountAfterRoll: number
}

export interface GachaRollSessionResult {
  bannerId: string
  results: GachaSingleResult[]
  totalCostGems: number
  previousPityCount: number
  newPityCount: number
  newCharacters: OwnedCharacter[]
  updatedOwnedCharacters: OwnedCharacter[]
  remainingGems: number
}

/**
 * คำนวณอัตราสุ่ม SSR จริงตาม Soft/Hard Pity
 */
export function calculateEffectiveRates(
  banner: GachaBannerConfig,
  pityCount: number,
): { SSR: number; SR: number; R: number } {
  // Hard pity: การันตี SSR 100%
  if (pityCount >= banner.hardPityCount) {
    return { SSR: 1.0, SR: 0.0, R: 0.0 }
  }

  // Soft pity: ตั้งแต่รอบที่ 75 เป็นต้นไป เพิ่มเรท SSR รอบละ 6% จนครบ 100% ที่รอบ 90
  if (pityCount >= banner.softPityCount) {
    const extraSteps = pityCount - (banner.softPityCount - 1)
    const boostedSSR = Math.min(1.0, banner.baseRates.SSR + extraSteps * 0.06)
    const remainingRate = 1.0 - boostedSSR
    const srRatio = banner.baseRates.SR / (banner.baseRates.SR + banner.baseRates.R)
    const boostedSR = remainingRate * srRatio
    const boostedR = remainingRate * (1 - srRatio)

    return {
      SSR: boostedSSR,
      SR: boostedSR,
      R: boostedR,
    }
  }

  return { ...banner.baseRates }
}

/**
 * สุ่มตัวละคร 1 ครั้ง (Single Pull Pure Function)
 * รองรับการใส่ custom rngFn (0..1) เพื่อ Deterministic Test
 */
export function rollSingleGacha(
  banner: GachaBannerConfig,
  currentPityCount: number,
  rngFn: () => number = Math.random,
): { entry: GachaPoolEntry; newPityCount: number } {
  const nextPity = currentPityCount + 1
  const rates = calculateEffectiveRates(banner, nextPity)
  const roll = rngFn()

  let selectedRarity: GachaRarity = 'R'
  if (roll < rates.SSR) {
    selectedRarity = 'SSR'
  } else if (roll < rates.SSR + rates.SR) {
    selectedRarity = 'SR'
  } else {
    selectedRarity = 'R'
  }

  // เลือกตัวละครจาก Pool ที่ตรงกับ Rarity
  const eligibleEntries = banner.pool.filter((e) => e.rarity === selectedRarity)
  const finalPool = eligibleEntries.length > 0 ? eligibleEntries : banner.pool

  // สุ่มเลือกตัวใน Rarity นั้น (ให้ความสำคัญกับ rateUp ถ้ามี)
  const subRoll = rngFn()
  const rateUpEntries = finalPool.filter((e) => e.rateUp)
  let chosenEntry: GachaPoolEntry

  if (rateUpEntries.length > 0 && subRoll < 0.5) {
    // 50% rate-up chance
    const idx = Math.floor(rngFn() * rateUpEntries.length)
    chosenEntry = rateUpEntries[Math.min(idx, rateUpEntries.length - 1)]
  } else {
    const idx = Math.floor(rngFn() * finalPool.length)
    chosenEntry = finalPool[Math.min(idx, finalPool.length - 1)]
  }

  // รีเซ็ต pity เมื่อได้ SSR
  const newPityCount = selectedRarity === 'SSR' ? 0 : nextPity

  return {
    entry: chosenEntry,
    newPityCount,
  }
}

/**
 * ดำเนินการสุ่มอัญเชิญครบวงจร (Full Roll Session)
 * ตรวจสอบยอด Gem, ทำการสุ่ม, ตรวจสอบตัวใหม่/ตัวซ้ำ, แปลงเป็นเศษดาว, และคืนค่าผลลัพธ์
 */
export function executeGachaSession(
  player: Player,
  banner: GachaBannerConfig = STANDARD_BANNER,
  pullCount: 1 | 10 = 1,
  currentPity: number = 0,
  rngFn: () => number = Math.random,
): { success: boolean; result?: GachaRollSessionResult; error?: string } {
  const validation = validateBannerConfig(banner)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const cost = pullCount === 10 ? banner.multiCostGems : banner.singleCostGems * pullCount
  if (player.currency.gem < cost) {
    return {
      success: false,
      error: `หยกไม่เพียงพอสำหรับการอัญเชิญ (ต้องการ ${cost} หยก แต่มี ${player.currency.gem} หยก)`,
    }
  }

  let runningPity = currentPity
  const rollResults: GachaSingleResult[] = []
  const updatedOwned = [...player.ownedCharacters]
  const newCharactersCreated: OwnedCharacter[] = []

  for (let i = 0; i < pullCount; i++) {
    const { entry, newPityCount } = rollSingleGacha(banner, runningPity, rngFn)
    runningPity = newPityCount

    const existingIdx = updatedOwned.findIndex((c) => c.characterId === entry.characterId)
    const isNew = existingIdx === -1

    if (isNew) {
      const newChar: OwnedCharacter = {
        characterId: entry.characterId,
        level: 1,
        exp: 0,
        expToNext: 100,
        obtainedAt: new Date().toISOString(),
        star: 1,
        shards: 0,
        skillLevels: createDefaultSkillLevels(),
      }
      updatedOwned.push(newChar)
      newCharactersCreated.push(newChar)
      rollResults.push({
        characterId: entry.characterId,
        rarity: entry.rarity,
        isNew: true,
        grantedShards: 0,
        pityCountAfterRoll: runningPity,
      })
    } else {
      const shardAmount = GACHA_DUPLICATE_SHARDS[entry.rarity] ?? 2
      const existing = updatedOwned[existingIdx]
      const currentShards = existing.shards ?? 0
      updatedOwned[existingIdx] = {
        ...existing,
        shards: currentShards + shardAmount,
      }
      rollResults.push({
        characterId: entry.characterId,
        rarity: entry.rarity,
        isNew: false,
        grantedShards: shardAmount,
        pityCountAfterRoll: runningPity,
      })
    }
  }

  return {
    success: true,
    result: {
      bannerId: banner.id,
      results: rollResults,
      totalCostGems: cost,
      previousPityCount: currentPity,
      newPityCount: runningPity,
      newCharacters: newCharactersCreated,
      updatedOwnedCharacters: updatedOwned,
      remainingGems: player.currency.gem - cost,
    },
  }
}
