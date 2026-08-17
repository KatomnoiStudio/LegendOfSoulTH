import { describe, expect, it, vi } from 'vitest'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import type { RealtimeBattleResult } from '../realtimeBattle/types'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import {
  LOBBY_BATTLE_REWARD_POLICY,
  finalizeLobbyBattleRewards,
  lobbyBattleGoldFlagKey,
  lobbyBattleItemRefId,
  lobbyBattleProgressionFlagKey,
  lobbyBattleTransactionId,
  pendingLobbyRewardToResult,
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

function mockCommit(onPlayerChange?: (next: Player) => Promise<boolean>) {
  return vi.fn(async (payload: { player: Player }) => {
    if (onPlayerChange) {
      const saved = await onPlayerChange(payload.player)
      if (!saved) return { ok: false as const, error: 'save failed' }
    }
    return { ok: true as const, player: payload.player }
  })
}

function baseDeps(overrides: Partial<Parameters<typeof finalizeLobbyBattleRewards>[2]> = {}) {
  return {
    onPlayerChange: vi.fn(async () => true),
    onEarnGold: vi.fn(),
    onGrantItem: vi.fn(async () => ({ ok: true as const, player: makePlayer() })),
    onCommitProgression: mockCommit(),
    onRecordPending: vi.fn(async () => true),
    onClearPending: vi.fn(async () => true),
    ...overrides,
  }
}

describe('lobbyBattleRewardPipeline policy', () => {
  it('declares ordered partial commit — not one atomic backend RPC', () => {
    expect(LOBBY_BATTLE_REWARD_POLICY).toBe('ordered-partial-commit')
  })
})

describe('finalizeLobbyBattleRewards', () => {
  const result = victoryResult()
  const txId = lobbyBattleTransactionId(result)

  it('persists progression before earnGold — no ledger call when commit fails', async () => {
    const player = makePlayer()
    const onEarnGold = vi.fn()

    const out = await finalizeLobbyBattleRewards(result, player, {
      ...baseDeps(),
      onCommitProgression: vi.fn(async () => ({ ok: false as const, error: 'rpc down' })),
      onEarnGold,
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('progression_save')
    expect(out.player).toBe(player)
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
      ...baseDeps({ onPlayerChange, onEarnGold }),
      onCommitProgression: mockCommit(onPlayerChange),
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('gold_grant')
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
      ...baseDeps({ onPlayerChange, onEarnGold, onGrantItem }),
      onCommitProgression: mockCommit(onPlayerChange),
    })

    expect(out.ok).toBe(false)
    expect(out.failure).toBe('item_grant')
    expect(onEarnGold).toHaveBeenCalledTimes(1)
    expect(onGrantItem).toHaveBeenCalledTimes(1)
    expect(onGrantItem).toHaveBeenCalledWith(
      'iron-essence',
      1,
      'drop',
      lobbyBattleItemRefId(txId, 'iron-essence'),
    )
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
      ...baseDeps({ onPlayerChange, onEarnGold }),
      onCommitProgression: mockCommit(onPlayerChange),
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
      ...baseDeps({
        onPlayerChange,
        onEarnGold,
        onGrantItem: vi.fn(async () => ({ ok: true as const, player: savedPlayer })),
      }),
      onCommitProgression: mockCommit(onPlayerChange),
    })

    expect(second.ok).toBe(true)
    expect(onEarnGold).toHaveBeenCalledTimes(2)
  })

  it('reload after gold RPC success but flag save fail — retry completes without duplicate gold call effect', async () => {
    const player = makePlayer()
    let savedPlayer = player
    const onPlayerChange = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
    const onEarnGold = vi.fn(async () => ({
      ok: true as const,
      player: { ...savedPlayer, currency: { gold: 581, gem: 0 } },
      amount: 81,
    }))

    const first = await finalizeLobbyBattleRewards(result, player, {
      ...baseDeps({ onPlayerChange, onEarnGold }),
      onCommitProgression: mockCommit(),
    })
    expect(first.failure).toBe('progression_save')

    const reloadedFlags = { ...savedPlayer.progress.flags }
    delete reloadedFlags[lobbyBattleGoldFlagKey(txId)]
    delete reloadedFlags[rewardTransactionFlagKey(txId)]

    const reloadedPlayer: Player = {
      ...savedPlayer,
      currency: { gold: 581, gem: 0 },
      progress: {
        ...savedPlayer.progress,
        flags: {
          ...reloadedFlags,
          [lobbyBattleProgressionFlagKey(txId)]: true,
        },
      },
    }

    const second = await finalizeLobbyBattleRewards(result, reloadedPlayer, {
      ...baseDeps({
        onPlayerChange,
        onEarnGold,
        onGrantItem: vi.fn(async () => ({ ok: true as const, player: reloadedPlayer })),
      }),
      onCommitProgression: mockCommit(),
    })

    expect(second.ok).toBe(true)
    expect(onEarnGold).toHaveBeenCalledTimes(2)
    expect(onEarnGold).toHaveBeenNthCalledWith(2, 'drop', 81, txId)
  })

  it('alreadyComplete short-circuits without ledger or save calls', async () => {
    const player = makePlayer()
    player.progress.flags[rewardTransactionFlagKey(txId)] = true

    const onEarnGold = vi.fn()
    const out = await finalizeLobbyBattleRewards(result, player, {
      ...baseDeps({ onEarnGold }),
    })

    expect(out.ok).toBe(true)
    expect(out.alreadyComplete).toBe(true)
    expect(onEarnGold).not.toHaveBeenCalled()
  })

  it('grants gold only after progression commit succeeds', async () => {
    const player = makePlayer()
    const order: string[] = []
    const onCommitProgression = vi.fn(async (payload: { player: Player }) => {
      order.push('prog')
      return { ok: true as const, player: payload.player }
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
      ...baseDeps({ onEarnGold, onCommitProgression }),
    })

    expect(out.ok).toBe(true)
    expect(order.indexOf('prog')).toBeLessThan(order.indexOf('gold'))
  })
})

/*
  2026-08-10 audit F8 — the permanently uncleanable pending row.

  `clearPendingLobbyReward` used to throw its RPC error away (a bare `await`, returning void), so
  a failed clear left the durable row behind. On the next lobby entry the flags were all set, the
  pipeline took the `alreadyComplete` early return at the TOP of the function — above the clear at
  the bottom — and the row survived untouched again. Result: the recovery pipeline re-ran on every
  single lobby entry forever, with no path that could ever remove the row.
*/
describe('F8: pending row is cleared on the alreadyComplete path', () => {
  const result = victoryResult()
  const txId = lobbyBattleTransactionId(result)

  it('clears the durable row when every step was already committed', async () => {
    const player = makePlayer()
    player.progress.flags[rewardTransactionFlagKey(txId)] = true
    const onClearPending = vi.fn(async () => true)

    const out = await finalizeLobbyBattleRewards(result, player, {
      ...baseDeps({ onClearPending }),
    })

    expect(out.alreadyComplete).toBe(true)
    // Old code returned here without ever reaching a clear — the row could never be removed.
    expect(onClearPending).toHaveBeenCalledWith(txId)
  })

  it('still grants nothing while clearing — the clear is cleanup, not a re-run', async () => {
    const player = makePlayer()
    player.progress.flags[rewardTransactionFlagKey(txId)] = true
    const onEarnGold = vi.fn()
    const onCommitProgression = vi.fn()

    await finalizeLobbyBattleRewards(result, player, {
      ...baseDeps({ onEarnGold, onCommitProgression }),
    })

    expect(onEarnGold).not.toHaveBeenCalled()
    expect(onCommitProgression).not.toHaveBeenCalled()
  })
})

/*
  2026-08-10 audit F7 (partial) — the resume path no longer re-derives the transaction id.

  Every ledger row for a battle is keyed on the id the pending row was stored under. Rebuilding
  that id from `stageId + finishedAt` on resume works only for as long as the derivation never
  changes; carrying the stored id makes the resume immune to that entirely. The residual (a
  client clock jump can still collide two DIFFERENT battles onto one derived id) needs the id
  minted at battle end in `src/game/realtimeBattle/` and is NOT closed here.
*/
describe('F7: transaction id carried through the reload-resume path', () => {
  it('pendingLobbyRewardToResult carries the stored id', () => {
    const restored = pendingLobbyRewardToResult({
      transactionId: 'lobby:trial-01:server-minted-id',
      stageId: 'trial-01',
      stageName: 'ทดสอบ',
      outcome: 'victory',
      earnedExp: 65,
      earnedGold: 81,
      droppedItems: [],
      finishedAt: '2026-08-08T08:00:00.000Z',
      durationMs: 12_000,
    })

    expect(restored.transactionId).toBe('lobby:trial-01:server-minted-id')
    // ...and that id, not a re-derivation, is what the pipeline keys everything on.
    expect(lobbyBattleTransactionId(restored)).toBe('lobby:trial-01:server-minted-id')
  })

  it('a fresh battle result with no carried id still derives the same id as before', () => {
    expect(lobbyBattleTransactionId(victoryResult())).toBe(
      'lobby:trial-01:2026-08-08T08:00:00.000Z',
    )
  })

  it('resumes against flags written under the stored id — not a recomputed one', async () => {
    const storedId = 'lobby:trial-01:2026-08-08T08:00:00.000Z'
    const player = makePlayer()
    player.progress.flags[rewardTransactionFlagKey(storedId)] = true

    // A row whose stored id disagrees with what stageId+finishedAt would derive today.
    const restored = pendingLobbyRewardToResult({
      transactionId: storedId,
      stageId: 'trial-01',
      stageName: 'ทดสอบ',
      outcome: 'victory',
      earnedExp: 65,
      earnedGold: 81,
      droppedItems: [],
      finishedAt: '2026-08-09T09:99:99.999Z',
      durationMs: 12_000,
    })

    const onEarnGold = vi.fn()
    const out = await finalizeLobbyBattleRewards(restored, player, { ...baseDeps({ onEarnGold }) })

    // Re-deriving would miss the flag and hand out the whole reward a second time.
    expect(out.alreadyComplete).toBe(true)
    expect(onEarnGold).not.toHaveBeenCalled()
  })
})

describe('finalizeLobbyBattleRewards — single write path for progress.flags', () => {
  // A 2026-08-13 review found THREE sites where a flag key was written twice: once into the local
  // `flags` guard variable via an inline spread, and independently into `next` via
  // `withFlags`. Both computations use the same merge shape and run synchronously with no
  // state change between them, so the two never actually disagree in a running process
  // today — this is a duplication/maintainability defect (two sources of truth for one
  // fact), not a live behavioural bug, and no black-box input/output test can turn red
  // against it for that reason. What protects against it is a future edit touching one
  // write site and not the other; the adversary here is a person, not an input. The test
  // that catches THAT is structural — it reads the source itself.
  it('never assigns a flag key into the `flags` variable directly — only withFlags() may set one', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const path = join(process.cwd(), 'src/game/reward/lobbyBattleRewardPipeline.ts')
    const source = readFileSync(path, 'utf8')

    // Matches the two shapes that were duplicated across those three sites:
    //   flags = { ...next.progress.flags, [someKey]: true }   (gold, item sites)
    //   flags = { ...flags, [someKey]: true }                 (transaction site)
    // A bare read-back (`flags = { ...next.progress.flags }`, no bracketed key) is fine —
    // that's the fixed shape. Only a key being injected directly into `flags` is the smell.
    const duplicateWritePattern =
      /\bflags\s*=\s*\{\s*\.\.\.(?:next\.progress\.flags|flags)\s*,\s*\[/g
    const matches = source.match(duplicateWritePattern) ?? []

    expect(matches).toEqual([])
  })
})
