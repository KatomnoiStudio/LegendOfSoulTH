import type { CurrencyResult, GoldSource, ItemResult } from '../../data/accountRepository.shared'
import { appendBattleHistory } from '../dialogue/actions'
import { applyBattleExp } from '../realtimeBattle/RewardSystem'
import { toLegacyBattleResult } from '../realtimeBattle/BattleResultAdapter'
import type { RealtimeBattleResult } from '../realtimeBattle/types'
import type { Player } from '../../types/player'

export interface LobbyBattleRewardDeps {
  onPlayerChange: (next: Player) => Promise<boolean>
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  onGrantItem: (itemId: string, quantity: number, source: GoldSource) => Promise<ItemResult>
}

export type LobbyBattleRewardFailure = 'progression_save' | 'gold_grant' | 'item_grant'

export interface LobbyBattleRewardResult {
  ok: boolean
  player: Player
  /** Set when ok=false — progression is saved before ledger grants. */
  failure?: LobbyBattleRewardFailure
}

/**
 * Lobby battle rewards — progression first, ledger second.
 *
 * Policy: hero EXP / flags / history persist via onPlayerChange before any earnGold/grantItem
 * RPC. If progression save fails, nothing is committed. If a ledger grant fails after a
 * successful save, progression remains (gold/items not granted) — caller must surface an error.
 */
export async function finalizeLobbyBattleRewards(
  result: RealtimeBattleResult,
  player: Player,
  deps: LobbyBattleRewardDeps,
): Promise<LobbyBattleRewardResult> {
  let next = applyBattleExp(player, result.earnedExp)

  const legacy = toLegacyBattleResult(result)
  const won = legacy.outcome === 'victory'

  let progress = appendBattleHistory(next.progress, {
    id: `battle-${Date.now()}`,
    opponent: legacy.stageName,
    result: won ? 'win' : 'lose',
    finishedAt: legacy.finishedAt,
    durationMs: legacy.durationMs,
  })

  if (won) {
    progress = {
      ...progress,
      flags: { ...progress.flags, [`trial_cleared_${legacy.stageId}`]: true },
    }
  }

  next = { ...next, progress }

  const saved = await deps.onPlayerChange(next)
  if (!saved) {
    return { ok: false, player, failure: 'progression_save' }
  }

  if (result.earnedGold > 0) {
    const gold = await deps.onEarnGold('drop', result.earnedGold, result.stageId)
    if (!gold.ok) {
      return { ok: false, player: next, failure: 'gold_grant' }
    }
    next = gold.player
  }

  for (const drop of result.droppedItems) {
    const granted = await deps.onGrantItem(drop.itemId, drop.quantity, 'drop')
    if (!granted.ok) {
      return { ok: false, player: next, failure: 'item_grant' }
    }
    next = granted.player
  }

  return { ok: true, player: next }
}
