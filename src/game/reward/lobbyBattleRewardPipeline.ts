import type { CurrencyResult, GoldSource, ItemResult } from '../../data/accountRepository.shared'
import { appendBattleHistory } from '../dialogue/actions'
import { applyBattleExp } from '../realtimeBattle/RewardSystem'
import { toLegacyBattleResult } from '../realtimeBattle/BattleResultAdapter'
import type { RealtimeBattleResult } from '../realtimeBattle/types'
import type { Player } from '../../types/player'
import { hasRewardTransaction, rewardTransactionFlagKey } from './resultFinalizer'

export interface LobbyBattleRewardDeps {
  onPlayerChange: (next: Player) => Promise<boolean>
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  onGrantItem: (itemId: string, quantity: number, source: GoldSource) => Promise<ItemResult>
}

export type LobbyBattleRewardFailure = 'progression_save' | 'gold_grant' | 'item_grant'

export interface LobbyBattleRewardResult {
  ok: boolean
  player: Player
  failure?: LobbyBattleRewardFailure
  /** All steps were already committed for this battle result — no duplicate grants. */
  alreadyComplete?: boolean
}

/**
 * Ordered partial commit with client-side idempotency — NOT an atomic backend transaction.
 *
 * Steps (each may persist independently):
 *   1. progression (heroExp, history, clear flags) via onPlayerChange / savePlayer
 *   2. earnGold RPC (ledger)
 *   3. grantItem RPC per drop
 *
 * There is no single Supabase RPC wrapping EXP + gold + items. A ledger step may fail after
 * progression succeeds; retry must skip completed steps (flags below) and must not double-grant.
 *
 * Full atomic reward requires a future bundled RPC — do not describe this pipeline as "atomic".
 */
export const LOBBY_BATTLE_REWARD_POLICY = 'ordered-partial-commit-with-idempotency' as const

/** Stable id for one battle outcome — ties idempotency flags and earnGold refId. */
export function lobbyBattleTransactionId(result: RealtimeBattleResult): string {
  return `lobby:${result.stageId}:${result.finishedAt}`
}

export function lobbyBattleProgressionFlagKey(transactionId: string): string {
  return `${rewardTransactionFlagKey(transactionId)}_prog`
}

export function lobbyBattleGoldFlagKey(transactionId: string): string {
  return `${rewardTransactionFlagKey(transactionId)}_gold`
}

export function lobbyBattleItemFlagKey(transactionId: string, itemId: string): string {
  return `${rewardTransactionFlagKey(transactionId)}_item_${itemId}`
}

function withFlags(player: Player, flags: Record<string, boolean>): Player {
  return {
    ...player,
    progress: { ...player.progress, flags: { ...player.progress.flags, ...flags } },
  }
}

export async function finalizeLobbyBattleRewards(
  result: RealtimeBattleResult,
  player: Player,
  deps: LobbyBattleRewardDeps,
): Promise<LobbyBattleRewardResult> {
  const txId = lobbyBattleTransactionId(result)

  if (hasRewardTransaction(player.progress.flags, txId)) {
    return { ok: true, player, alreadyComplete: true }
  }

  let next = player
  let flags = { ...player.progress.flags }

  if (!flags[lobbyBattleProgressionFlagKey(txId)]) {
    next = applyBattleExp(player, result.earnedExp)

    const legacy = toLegacyBattleResult(result)
    const won = legacy.outcome === 'victory'

    let progress = appendBattleHistory(next.progress, {
      id: `battle-${txId}`,
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

    flags = { ...progress.flags, [lobbyBattleProgressionFlagKey(txId)]: true }
    next = { ...next, progress: { ...next.progress, flags } }

    const saved = await deps.onPlayerChange(next)
    if (!saved) {
      return { ok: false, player, failure: 'progression_save' }
    }
  }

  if (result.earnedGold > 0 && !flags[lobbyBattleGoldFlagKey(txId)]) {
    const gold = await deps.onEarnGold('drop', result.earnedGold, txId)
    if (!gold.ok) {
      return { ok: false, player: next, failure: 'gold_grant' }
    }
    next = gold.player
    flags = { ...next.progress.flags, [lobbyBattleGoldFlagKey(txId)]: true }
    next = withFlags(next, { [lobbyBattleGoldFlagKey(txId)]: true })

    const saved = await deps.onPlayerChange(next)
    if (!saved) {
      return { ok: false, player: next, failure: 'progression_save' }
    }
  }

  for (const drop of result.droppedItems) {
    const itemKey = lobbyBattleItemFlagKey(txId, drop.itemId)
    if (flags[itemKey]) continue

    const granted = await deps.onGrantItem(drop.itemId, drop.quantity, 'drop')
    if (!granted.ok) {
      return { ok: false, player: next, failure: 'item_grant' }
    }
    next = granted.player
    flags = { ...next.progress.flags, [itemKey]: true }
    next = withFlags(next, { [itemKey]: true })

    const saved = await deps.onPlayerChange(next)
    if (!saved) {
      return { ok: false, player: next, failure: 'progression_save' }
    }
  }

  if (!hasRewardTransaction(flags, txId)) {
    flags = { ...flags, [rewardTransactionFlagKey(txId)]: true }
    next = withFlags(next, { [rewardTransactionFlagKey(txId)]: true })
    const saved = await deps.onPlayerChange(next)
    if (!saved) {
      return { ok: false, player: next, failure: 'progression_save' }
    }
  }

  return { ok: true, player: next }
}
