import type { Rarity } from '../characters'
import type { BannerConfig, GachaPoolEntry } from './gachaConfig'

export interface GachaRollItem {
  characterId: string
  rarity: Rarity
  isPity: boolean
}

export interface RollResult {
  item: GachaRollItem
  nextPity: number
}

export interface MultiRollResult {
  items: GachaRollItem[]
  nextPity: number
}

export type RandomGenerator = () => number

/**
 * เลือก Rarity จากเรตที่กำหนดตามค่าสุ่ม (0 ถึง 1)
 */
export function rollRarity(banner: BannerConfig, randValue: number): Rarity {
  let cumulative = 0
  for (const entry of banner.rates) {
    cumulative += entry.rate
    if (randValue <= cumulative) {
      return entry.rarity
    }
  }
  return banner.rates[banner.rates.length - 1]?.rarity ?? 'common'
}

/**
 * เลือกตัวละครจาก Pool ที่ตรงกับ Rarity
 */
export function selectCharacterFromPool(
  pool: GachaPoolEntry[],
  rarity: Rarity,
  randValue: number,
): GachaPoolEntry {
  const matching = pool.filter((entry) => entry.rarity === rarity)
  const candidatePool = matching.length > 0 ? matching : pool

  const totalWeight = candidatePool.reduce((sum, entry) => sum + (entry.weight ?? 1), 0)
  let cumulative = 0
  const threshold = randValue * totalWeight

  for (const entry of candidatePool) {
    cumulative += entry.weight ?? 1
    if (threshold <= cumulative) {
      return entry
    }
  }

  return candidatePool[0]
}

/**
 * คำนวณผลการสุ่มกาชา 1 ครั้งแบบ Pure Function
 * @param banner การตั้งค่าตู้สุ่ม
 * @param currentPity จำนวนครั้งที่สุ่มสะสมก่อนหน้านี้
 * @param rng ตัวสร้างตัวเลขสุ่ม (default: Math.random)
 */
export function resolveGachaRoll(
  banner: BannerConfig,
  currentPity: number = 0,
  rng: RandomGenerator = Math.random,
): RollResult {
  const pityCount = Math.max(0, currentPity)
  const isPityTriggered = pityCount + 1 >= banner.pityThreshold

  let targetRarity: Rarity
  if (isPityTriggered) {
    targetRarity = banner.pityGuaranteedRarity
  } else {
    targetRarity = rollRarity(banner, rng())
  }

  const selectedEntry = selectCharacterFromPool(banner.pool, targetRarity, rng())

  const isHighestRarityHit = selectedEntry.rarity === banner.pityGuaranteedRarity
  const nextPity = isHighestRarityHit ? 0 : pityCount + 1

  return {
    item: {
      characterId: selectedEntry.characterId,
      rarity: selectedEntry.rarity,
      isPity: isPityTriggered,
    },
    nextPity,
  }
}

/**
 * คำนวณผลการสุ่มกาชาหลายครั้ง (เช่น 10-pull)
 */
export function resolveMultiGachaRoll(
  banner: BannerConfig,
  count: number,
  initialPity: number = 0,
  rng: RandomGenerator = Math.random,
): MultiRollResult {
  const items: GachaRollItem[] = []
  let runningPity = initialPity

  for (let i = 0; i < count; i++) {
    const single = resolveGachaRoll(banner, runningPity, rng)
    items.push(single.item)
    runningPity = single.nextPity
  }

  return {
    items,
    nextPity: runningPity,
  }
}
