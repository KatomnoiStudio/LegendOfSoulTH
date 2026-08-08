import { describe, expect, it, vi } from 'vitest'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import type { RealtimeBattleResult } from '../realtimeBattle/types'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import { finalizeLobbyBattleRewards } from './lobbyBattleRewardPipeline'

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
    progress: EMPTY_PROGRESS,
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

describe('finalizeLobbyBattleRewards', () => {
  it('persists progression before earnGold — no ledger call when save fails', async () => {
    const player = makePlayer()
    const onPlayerChange = vi.fn(async () => false)
    const onEarnGold = vi.fn()

    const out = await finalizeLobbyBattleRewards(victoryResult(), player, {
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

  it('applies hero EXP on the saved payload when progression save succeeds', async () => {
    const player = makePlayer()
    const onPlayerChange = vi.fn(async (next: Player) => {
      expect(next.ownedCharacters[0]?.exp).toBe(65)
      return true
    })

    await finalizeLobbyBattleRewards(victoryResult({ earnedGold: 0, droppedItems: [] }), player, {
      onPlayerChange,
      onEarnGold: vi.fn(),
      onGrantItem: vi.fn(),
    })

    expect(onPlayerChange).toHaveBeenCalledTimes(1)
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
      onGrantItem: vi.fn(),
    })

    expect(out.ok).toBe(true)
    expect(order).toEqual(['save', 'gold'])
  })

  it('returns gold_grant failure without calling onPlayerChange again', async () => {
    const player = makePlayer()
    const onPlayerChange = vi.fn(async () => true)
    const onEarnGold = vi.fn(async () => ({ ok: false as const, error: 'ledger down' }))

    const out = await finalizeLobbyBattleRewards(victoryResult({ droppedItems: [] }), player, {
      onPlayerChange,
      onEarnGold,
      onGrantItem: vi.fn(),
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('gold_grant')
    expect(onPlayerChange).toHaveBeenCalledTimes(1)
    expect(onEarnGold).toHaveBeenCalledTimes(1)
  })
})
