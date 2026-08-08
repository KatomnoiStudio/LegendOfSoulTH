import { describe, expect, it, vi } from 'vitest'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import type { RealtimeBattleResult } from '../realtimeBattle/types'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import {
  LOBBY_BATTLE_REWARD_POLICY,
  finalizeLobbyBattleRewards,
  lobbyBattleGoldFlagKey,
  lobbyBattleProgressionFlagKey,
  lobbyBattleTransactionId,
} from './lobbyBattleRewardPipeline'
import { rewardTransactionFlagKey } from './resultFinalizer'

function makePlayer(): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'ผู้ทดสอบ',
    title: 'นักเดินทาง',
    level: 10,
    exp: 0,
    expToNext: 100,
    currency: { gold: 500, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 1,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: { ...EMPTY_PROGRESS, flags: { ...EMPTY_PROGRESS.flags } },
  }
}

function victoryResult(overrides: Partial<RealtimeBattleResult> = {}): RealtimeBattleResult {
  return {
    outcome: 'victory',
    stageId: 'trial-01',
    stageName: 'ทดสอบ',
    elapsedMs: 12_000,
    defeatedEnemyIds: ['e1'],
    damageDealt: 500,
    damageTaken: 50,
    earnedExp: 65,
    earnedGold: 81,
    droppedItems: [{ itemId: 'iron-essence', quantity: 1 }],
    finishedAt: '2026-08-08T08:00:00.000Z',
    ...overrides,
  }
}

describe('lobbyBattleRewardPipeline policy', () => {
  it('declares ordered partial commit — not atomic backend transaction', () => {
    expect(LOBBY_BATTLE_REWARD_POLICY).toBe('ordered-partial-commit-with-idempotency')
  })
})

describe('finalizeLobbyBattleRewards', () => {
  const result = victoryResult()
  const txId = lobbyBattleTransactionId(result)

  it('persists progression before earnGold — no ledger call when save fails', async () => {
    const player = makePlayer()
    const onPlayerChange = vi.fn(async () => false)
    const onEarnGold = vi.fn()

    const out = await finalizeLobbyBattleRewards(result, player, {
      onPlayerChange,
      onEarnGold,
      onGrantItem: vi.fn(),
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('progression_save')
    expect(out.player).toBe(player)
    expect(onPlayerChange).toHaveBeenCalledTimes(1)
    expect(onEarnGold).not.toHaveBeenCalled()
  })

  it('returns gold_grant when progression saved but earnGold fails — partial commit', async () => {
    const player = makePlayer()
    let savedPlayer: Player | undefined
    const onPlayerChange = vi.fn(async (next: Player) => {
      savedPlayer = next
      return true
    })
    const onEarnGold = vi.fn(async () => ({ ok: false as const, error: 'ledger down' }))

    const out = await finalizeLobbyBattleRewards(result, player, {
      onPlayerChange,
      onEarnGold,
      onGrantItem: vi.fn(),
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('gold_grant')
    expect(onPlayerChange).toHaveBeenCalledTimes(1)
    expect(onEarnGold).toHaveBeenCalledTimes(1)
    expect(onEarnGold).toHaveBeenCalledWith('drop', 81, txId)
    expect(savedPlayer?.progress.flags[lobbyBattleProgressionFlagKey(txId)]).toBe(true)
    expect(savedPlayer?.ownedCharacters[0]?.exp).toBe(65)
  })

  it('returns item_grant when progression and gold succeed but grantItem fails', async () => {
    const player = makePlayer()
    let savedPlayer = player
    const onPlayerChange = vi.fn(async (next: Player) => {
      savedPlayer = next
      return true
    })
    const onEarnGold = vi.fn(async () => ({
      ok: true as const,
      player: { ...savedPlayer, currency: { gold: 581, gem: 0 } },
      amount: 81,
    }))
    const onGrantItem = vi.fn(async () => ({ ok: false as const, error: 'inventory full' }))

    const out = await finalizeLobbyBattleRewards(result, player, {
      onPlayerChange,
      onEarnGold,
      onGrantItem,
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('item_grant')
    expect(onEarnGold).toHaveBeenCalledTimes(1)
    expect(onGrantItem).toHaveBeenCalledTimes(1)
    expect(savedPlayer.progress.flags[lobbyBattleGoldFlagKey(txId)]).toBe(true)
  })

  it('retry after gold_grant failure does not double-apply hero EXP', async () => {
    const player = makePlayer()
    let savedPlayer = player
    const onPlayerChange = vi.fn(async (next: Player) => {
      savedPlayer = next
      return true
    })
    const onEarnGold = vi
      .fn()
      .mockResolvedValueOnce({ ok: false as const, error: 'ledger down' })
      .mockResolvedValueOnce({
        ok: true as const,
        player: { ...savedPlayer, currency: { gold: 581, gem: 0 } },
        amount: 81,
      })

    const first = await finalizeLobbyBattleRewards(result, player, {
      onPlayerChange,
      onEarnGold,
      onGrantItem: vi.fn(async () => ({
        ok: true as const,
        player: savedPlayer,
        itemId: 'iron-essence',
        quantity: 1,
      })),
    })
    expect(first.failure).toBe('gold_grant')

    const afterPartial: Player = {
      ...savedPlayer,
      progress: {
        ...savedPlayer.progress,
        flags: {
          ...savedPlayer.progress.flags,
          [lobbyBattleProgressionFlagKey(txId)]: true,
        },
      },
    }

    const second = await finalizeLobbyBattleRewards(result, afterPartial, {
      onPlayerChange,
      onEarnGold,
      onGrantItem: vi.fn(async () => ({
        ok: true as const,
        player: savedPlayer,
        itemId: 'iron-essence',
        quantity: 1,
      })),
    })

    expect(second.ok).toBe(true)
    expect(onPlayerChange).toHaveBeenCalledTimes(4)
    const progressionSaves = onPlayerChange.mock.calls.filter(
      (call) => (call[0] as Player).ownedCharacters[0]?.exp === 65,
    )
    expect(progressionSaves).toHaveLength(1)
    expect(onEarnGold).toHaveBeenCalledTimes(2)
  })

  it('alreadyComplete short-circuits without ledger or save calls', async () => {
    const player = makePlayer()
    player.progress.flags[rewardTransactionFlagKey(txId)] = true

    const out = await finalizeLobbyBattleRewards(result, player, {
      onPlayerChange: vi.fn(),
      onEarnGold: vi.fn(),
      onGrantItem: vi.fn(),
    })

    expect(out.ok).toBe(true)
    expect(out.alreadyComplete).toBe(true)
  })

  it('grants gold only after progression save succeeds', async () => {
    const player = makePlayer()
    const order: string[] = []
    const onPlayerChange = vi.fn(async () => {
      order.push('save')
      return true
    })
    const onEarnGold = vi.fn(async () => {
      order.push('gold')
      return {
        ok: true as const,
        player: { ...player, currency: { gold: 581, gem: 0 } },
        amount: 81,
      }
    })

    const out = await finalizeLobbyBattleRewards(victoryResult({ droppedItems: [] }), player, {
      onPlayerChange,
      onEarnGold,
      onGrantItem: vi.fn(async () => ({
        ok: true as const,
        player,
        itemId: 'x',
        quantity: 1,
      })),
    })

    expect(out.ok).toBe(true)
    const saveIdx = order.indexOf('save')
    const goldIdx = order.indexOf('gold')
    expect(saveIdx).toBeGreaterThanOrEqual(0)
    expect(goldIdx).toBeGreaterThan(saveIdx)
  })
})
