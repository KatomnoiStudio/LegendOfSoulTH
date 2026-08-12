import type { CurrencyResult, GoldSource, ItemResult } from '../../data/accountRepository.shared'
import type { Player } from '../../types/player'
import { applyAccountExp } from '../realtimeBattle/RewardSystem'
import { applyHeroExpToLeadHero } from '../progression/progressionService'
import type { ResolvedReward, RewardEntry, RewardGrantResult } from './rewardSchema'
import { hasRewardTransaction, rewardTransactionFlagKey } from './resultFinalizer'
import { validateRewardEntry } from './rewardValidator'

export interface GrantDungeonRewardDeps {
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  onGrantItem: (itemId: string, quantity: number, source: GoldSource) => Promise<ItemResult>
}

/**
 * Validate all entries, apply via ledger callbacks, then mark transaction on player flags.
 * Mirrors LobbyBattleSession ordering: currency → items → EXP → single player commit.
 */
export async function grantDungeonRewards(
  resolved: ResolvedReward,
  player: Player,
  deps: GrantDungeonRewardDeps,
): Promise<{ grant: RewardGrantResult; player: Player }> {
  const transactionId = resolved.transactionId

  if (hasRewardTransaction(player.progress.flags, transactionId)) {
    return {
      grant: {
        success: true,
        granted: [],
        playerUpdated: false,
        transactionId,
        alreadyGranted: true,
      },
      player,
    }
  }

  const granted: RewardEntry[] = []
  const rejected: RewardEntry[] = []

  for (const entry of resolved.entries) {
    const err = validateRewardEntry(entry)
    if (err) rejected.push(entry)
    else granted.push(entry)
  }

  if (resolved.entries.length > 0 && granted.length === 0) {
    return {
      grant: {
        success: false,
        granted: [],
        rejected,
        playerUpdated: false,
        transactionId,
      },
      player,
    }
  }

  let next = player
  let heroExp = 0
  let accountExp = 0

  for (const entry of granted) {
    switch (entry.type) {
      case 'currency': {
        if (entry.currencyId !== 'gold') {
          rejected.push(entry)
          continue
        }
        const gold = await deps.onEarnGold('drop', entry.amount, transactionId)
        if (!gold.ok) {
          return {
            grant: {
              success: false,
              granted,
              rejected,
              playerUpdated: false,
              transactionId,
            },
            player,
          }
        }
        next = gold.player
        break
      }
      case 'item': {
        const item = await deps.onGrantItem(entry.itemId, entry.quantity, 'drop')
        if (!item.ok) {
          return {
            grant: {
              success: false,
              granted,
              rejected,
              playerUpdated: false,
              transactionId,
            },
            player,
          }
        }
        next = item.player
        break
      }
      case 'heroExp':
        heroExp += entry.amount
        break
      case 'accountExp':
        accountExp += entry.amount
        break
      case 'resource':
        break
      default:
        break
    }
  }

  /*
    ⚠ DORMANT TRAP — READ BEFORE WIRING DungeonSession UP.

    These two calls mutate profiles.level/exp/exp_to_next and owned_characters.level/exp/
    exp_to_next in memory only. Unlike the lobby path (lobbyBattleRewardPipeline.ts, which
    commits through the `commit_lobby_battle_progression` RPC), the dungeon path has no RPC of
    its own — whatever it produces reaches the backend through `savePlayer`, and `savePlayer`
    no longer sends those six columns: the migration
    `supabase/migrations/20260810130000_security_harden_lobby_progression_rpc.sql` (
    CoalBoard scope B) revoked client UPDATE on them, so the RPC is now the ONLY writer.

    Harmless today only because DungeonSession is never rendered — nothing calls this with
    heroExp/accountExp > 0 in production. The moment it IS wired up, this EXP is written to a
    local Player object, persisted nowhere, and silently vanishes on the next `loadPlayer`.
    Wiring it therefore means routing dungeon progression through
    `commit_lobby_battle_progression` (or a dungeon sibling of it) FIRST — not just rendering
    the screen. Behaviour deliberately left unchanged here: this is a note, not a fix.
  */
  if (heroExp > 0) {
    next = applyHeroExpToLeadHero(next, heroExp).player
  }
  if (accountExp > 0) {
    next = applyAccountExp(next, accountExp)
  }

  const flags = {
    ...next.progress.flags,
    [rewardTransactionFlagKey(transactionId)]: true,
  }
  next = { ...next, progress: { ...next.progress, flags } }

  return {
    grant: {
      success: true,
      granted,
      rejected: rejected.length > 0 ? rejected : undefined,
      playerUpdated: true,
      transactionId,
    },
    player: next,
  }
}

export function markDungeonCleared(player: Player, dungeonId: string): Player {
  return {
    ...player,
    progress: {
      ...player.progress,
      flags: {
        ...player.progress.flags,
        [`dungeon_cleared_${dungeonId}`]: true,
      },
    },
  }
}
