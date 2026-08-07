import type { Player } from '../../types/player'
import type { RealtimeBattleState } from './createRealtimeBattle'
import { getEnemyTemplate } from './stageConfig'

/**
 * คำนวณรางวัลจากการต่อสู้ real-time
 *
 * แพ้ = ไม่ได้รางวัล (ศูนย์อย่างซื่อสัตย์)
 * ชนะ = ทอง/EXP ตามศัตรูที่ฆ่าได้ + โบนัสคลื่น — ไม่มี RNG (เทสต์ต้อง deterministic)
 *
 * ไฟล์นี้ pure: ไม่แตะ localStorage / Player — แค่ตัวเลขให้ adapter และชั้นบันทึกใช้
 */

export interface BattleReward {
  earnedExp: number
  earnedGold: number
  droppedItems: Array<{ itemId: string; quantity: number }>
}

/** ทอง/EXP ต่อศัตรูเมื่อไม่รู้จัก template */
const DEFAULT_GOLD_PER_ENEMY = 20
const DEFAULT_EXP_PER_ENEMY = 35

/** โบนัสต่อคลื่นที่เคลียร์ (ชนะเท่านั้น) */
const WAVE_CLEAR_GOLD = 15
const WAVE_CLEAR_EXP = 25

const TEMPLATE_REWARD: Record<string, { gold: number; exp: number }> = {
  'shadow-soldier': { gold: 22, exp: 40 },
  'demon-captain': { gold: 35, exp: 55 },
  'spirit-guardian': { gold: 28, exp: 48 },
}

function rewardForTemplate(templateId: string | undefined): { gold: number; exp: number } {
  if (!templateId) {
    return { gold: DEFAULT_GOLD_PER_ENEMY, exp: DEFAULT_EXP_PER_ENEMY }
  }
  const table = TEMPLATE_REWARD[templateId]
  if (table) return table

  const template = getEnemyTemplate(templateId)
  if (!template) {
    return { gold: DEFAULT_GOLD_PER_ENEMY, exp: DEFAULT_EXP_PER_ENEMY }
  }
  return {
    gold: Math.max(DEFAULT_GOLD_PER_ENEMY, Math.round(template.maxHp / 8)),
    exp: Math.max(DEFAULT_EXP_PER_ENEMY, Math.round(template.maxHp / 5)),
  }
}

export function calculateBattleReward(
  state: RealtimeBattleState,
  outcome: 'victory' | 'defeat',
): BattleReward {
  if (outcome === 'defeat') {
    return { earnedExp: 0, earnedGold: 0, droppedItems: [] }
  }

  let earnedGold = 0
  let earnedExp = 0

  for (const defeatedId of state.defeatedEnemyIds) {
    const entity = state.enemies.find((enemy) => enemy.id === defeatedId)
    const part = rewardForTemplate(entity?.enemyId)
    earnedGold += part.gold
    earnedExp += part.exp
  }

  const wavesCleared = state.currentWaveIndex + 1
  earnedGold += wavesCleared * WAVE_CLEAR_GOLD
  earnedExp += wavesCleared * WAVE_CLEAR_EXP

  const droppedItems: BattleReward['droppedItems'] = []
  if (state.defeatedEnemyIds.length >= 1) {
    droppedItems.push({ itemId: 'iron-essence', quantity: 1 })
  }
  if (state.defeatedEnemyIds.length >= 3) {
    droppedItems.push({ itemId: 'spirit-incense', quantity: 1 })
  }
  if (wavesCleared >= 2) {
    droppedItems.push({ itemId: 'healing-peach', quantity: 1 })
  }

  return {
    earnedExp: Math.max(0, Math.round(earnedExp)),
    earnedGold: Math.max(0, Math.round(earnedGold)),
    droppedItems,
  }
}

/** บวก EXP ให้เลเวลบัญชีผู้เล่นเท่านั้น — hero EXP ผ่าน progression service */
export function applyAccountExp(player: Player, earnedExp: number): Player {
  if (earnedExp <= 0) return player

  let { level, exp, expToNext } = player
  exp += earnedExp
  let guard = 0
  while (exp >= expToNext && expToNext > 0 && guard < 20) {
    exp -= expToNext
    level += 1
    expToNext = Math.max(1, Math.round(expToNext * 1.2))
    guard += 1
  }

  return { ...player, level, exp, expToNext }
}

/**
 * บวก EXP ให้บัญชีผู้เล่น (และขุนพลตัวนำถ้ามี) — legacy path สำหรับ LobbyBattleSession
 *
 * Dungeon rewards ใช้ applyAccountExp + progressionService.applyHeroExp แทน
 */
export function applyBattleExp(player: Player, earnedExp: number): Player {
  if (earnedExp <= 0) return player
  const withAccount = applyAccountExp(player, earnedExp)
  const leadId = player.teamSlots.find((id): id is string => id !== null) ?? null
  if (!leadId) return withAccount

  const ownedCharacters = withAccount.ownedCharacters.map((slot) => {
    if (slot.characterId !== leadId) return slot
    let cLevel = slot.level
    let cExp = slot.exp + earnedExp
    let cNext = slot.expToNext
    let cGuard = 0
    while (cExp >= cNext && cNext > 0 && cGuard < 20) {
      cExp -= cNext
      cLevel += 1
      cNext = Math.max(1, Math.round(cNext * 1.2))
      cGuard += 1
    }
    return { ...slot, level: cLevel, exp: cExp, expToNext: cNext }
  })

  return { ...withAccount, ownedCharacters }
}
