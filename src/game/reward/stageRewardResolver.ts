import type { BattleReward } from '../realtimeBattle/RewardSystem'
import { STAGE_WAVE_CLEAR_BONUS, getStageRewardDefinition } from './stageRewardConfig'
import type { RewardEntry } from './rewardSchema'

export interface LobbyStageRewardContext {
  stageId: string
  wavesCleared: number
  isFirstClear: boolean
}

function mergeItemDrops(
  drops: BattleReward['droppedItems'],
  itemId: string,
  quantity: number,
): BattleReward['droppedItems'] {
  const existing = drops.find((d) => d.itemId === itemId)
  if (existing) {
    return drops.map((d) => (d.itemId === itemId ? { ...d, quantity: d.quantity + quantity } : d))
  }
  return [...drops, { itemId, quantity }]
}

function applyEntry(
  entry: RewardEntry,
  acc: { gold: number; exp: number; drops: BattleReward['droppedItems'] },
): void {
  switch (entry.type) {
    case 'currency':
      if (entry.currencyId === 'gold') acc.gold += entry.amount
      break
    case 'heroExp':
    case 'accountExp':
      acc.exp += entry.amount
      break
    case 'item':
      acc.drops = mergeItemDrops(acc.drops, entry.itemId, entry.quantity)
      break
    default:
      break
  }
}

/**
 * Resolve lobby stage rewards from the per-stage table — deterministic, no RNG.
 */
export function resolveLobbyStageReward(context: LobbyStageRewardContext): BattleReward | null {
  const definition = getStageRewardDefinition(context.stageId)
  if (!definition) return null

  const acc = { gold: 0, exp: 0, drops: [] as BattleReward['droppedItems'] }

  for (const entry of definition.guaranteed ?? []) {
    applyEntry(entry, acc)
  }

  if (context.isFirstClear) {
    for (const block of definition.conditional ?? []) {
      if (block.condition.kind === 'firstClear') {
        for (const entry of block.entries) {
          applyEntry(entry, acc)
        }
      }
    }
  }

  const waveBonus = Math.max(0, context.wavesCleared)
  acc.gold += waveBonus * STAGE_WAVE_CLEAR_BONUS.gold
  acc.exp += waveBonus * STAGE_WAVE_CLEAR_BONUS.exp

  return {
    earnedGold: Math.max(0, Math.round(acc.gold)),
    earnedExp: Math.max(0, Math.round(acc.exp)),
    droppedItems: acc.drops,
  }
}
