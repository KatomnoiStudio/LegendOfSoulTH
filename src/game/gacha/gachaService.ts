import type { Player, OwnedCharacter } from '../../types/player'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import { getExpToNextForLevel } from '../progression/progressionConfig'
import { BANNERS, type BannerConfig } from './gachaConfig'
import {
  resolveMultiGachaRoll,
  resolveGachaRoll,
  type GachaRollItem,
  type RandomGenerator,
} from './gachaEngine'

export interface GachaPullResultItem extends GachaRollItem {
  isNew: boolean
  shardsGranted: number
}

export interface GachaPullSuccess {
  ok: true
  player: Player
  results: GachaPullResultItem[]
  cost: number
  currencyUsed: 'gem' | 'gold'
  newPity: number
}

export interface GachaPullFailure {
  ok: false
  error: string
}

export type GachaPullResult = GachaPullSuccess | GachaPullFailure

/**
 * ดำเนินการสุ่มกาชาสำหรับผู้เล่น
 * - ตรวจสอบยอดเงิน (หยก/ทอง)
 * - หักเงินและสุ่มตัวละคร
 * - เพิ่มตัวละครใหม่ หรือเพิ่มชิ้นส่วน (shards) กรณีได้ตัวซ้ำ
 * - อัปเดตตัวนับ Pity
 */
export function performGachaPull(
  player: Player,
  bannerId: string,
  pullCount: 1 | 10 = 1,
  rng: RandomGenerator = Math.random,
): GachaPullResult {
  const banner: BannerConfig | undefined = BANNERS[bannerId]
  if (!banner) {
    return { ok: false, error: `ไม่พบตู้สุ่มรหัส ${bannerId}` }
  }

  const cost = pullCount === 10 ? banner.costMulti : banner.costSingle
  const currencyType = banner.currencyType
  const currentBalance = player.currency[currencyType]

  if (currentBalance < cost) {
    const currencyName = currencyType === 'gem' ? 'หยก' : 'ทอง'
    return {
      ok: false,
      error: `${currencyName}ไม่เพียงพอ (ต้องการ ${cost} ${currencyName} แต่มี ${currentBalance} ${currencyName})`,
    }
  }

  const currentPity = player.gachaPity?.[bannerId] ?? 0

  let rollItems: GachaRollItem[] = []
  let nextPity = currentPity

  if (pullCount === 1) {
    const single = resolveGachaRoll(banner, currentPity, rng)
    rollItems = [single.item]
    nextPity = single.nextPity
  } else {
    const multi = resolveMultiGachaRoll(banner, 10, currentPity, rng)
    rollItems = multi.items
    nextPity = multi.nextPity
  }

  const updatedOwned = [...player.ownedCharacters]
  const pullResults: GachaPullResultItem[] = []
  const now = new Date().toISOString()

  for (const item of rollItems) {
    const existingIndex = updatedOwned.findIndex((o) => o.characterId === item.characterId)

    if (existingIndex >= 0) {
      // ได้ตัวซ้ำ: เพิ่มชิ้นส่วน (shards +1)
      const existing = updatedOwned[existingIndex]
      updatedOwned[existingIndex] = {
        ...existing,
        shards: (existing.shards ?? 0) + 1,
      }
      pullResults.push({
        ...item,
        isNew: false,
        shardsGranted: 1,
      })
    } else {
      // ได้ตัวใหม่: สร้าง OwnedCharacter เริ่มต้นที่ Lv.1, Star 1
      const newOwned: OwnedCharacter = {
        characterId: item.characterId,
        level: 1,
        exp: 0,
        expToNext: getExpToNextForLevel(1),
        obtainedAt: now,
        skillLevels: createDefaultSkillLevels(),
        star: 1,
        shards: 0,
        talentState: { unlockedNodes: [] },
        awakeningState: { tier: 0, unlockedEffects: [] },
        progressionVersion: 1,
      }
      updatedOwned.push(newOwned)
      pullResults.push({
        ...item,
        isNew: true,
        shardsGranted: 0,
      })
    }
  }

  const updatedPlayer: Player = {
    ...player,
    currency: {
      ...player.currency,
      [currencyType]: currentBalance - cost,
    },
    ownedCharacters: updatedOwned,
    gachaPity: {
      ...player.gachaPity,
      [bannerId]: nextPity,
    },
  }

  return {
    ok: true,
    player: updatedPlayer,
    results: pullResults,
    cost,
    currencyUsed: currencyType,
    newPity: nextPity,
  }
}
