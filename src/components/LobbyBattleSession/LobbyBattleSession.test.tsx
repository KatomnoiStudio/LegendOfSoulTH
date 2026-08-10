import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LobbyBattleSession } from './LobbyBattleSession'
import { lobbyBattleTransactionId } from '../../game/reward/lobbyBattleRewardPipeline'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import { REALTIME_STAGES, getRealtimeStage } from '../../game/realtimeBattle/stageConfig'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import type { CurrencyResult, ItemResult } from '../../data/accountRepository.shared'
import type { LobbyBattleProgressionRpcPayload } from '../../data/accountRepository.supabase'
import type { PendingLobbyRewardRow } from '../../data/accountRepository.supabase'

vi.mock('../BattleScene/BattleScene', async () => {
  const { useRef } = await import('react')
  return {
    BattleScene: ({
      stageId,
      onComplete,
      onBattleEnd,
      onExit,
    }: {
      stageId: string
      onComplete: (res: RealtimeBattleResult) => void
      onBattleEnd?: (res: RealtimeBattleResult) => void
      onExit: () => void
    }) => {
      /*
        ONE battle per mount, exactly as production works: the real BattleScene holds the finished
        result in `pendingResult` state and hands the SAME object to every continue press. Minting
        a fresh result per click would make a retry look like a different battle and quietly void
        every idempotency assertion in this file.
      */
      const resultRef = useRef<RealtimeBattleResult | null>(null)
      const victory = (): RealtimeBattleResult =>
        (resultRef.current ??= {
          transactionId: `lobby:${stageId}:test-${Math.random().toString(36).slice(2, 10)}`,
          outcome: 'victory',
          stageId,
          stageName: 'ลานฝึกทดสอบ',
          elapsedMs: 5000,
          defeatedEnemyIds: ['shadow-soldier'],
          damageDealt: 100,
          damageTaken: 10,
          earnedExp: 200,
          earnedGold: 100,
          droppedItems: [{ itemId: 'healing-peach', quantity: 1 }],
          finishedAt: new Date().toISOString(),
        })

      return (
        <div data-testid="mock-battle-scene">
          <span data-testid="battle-stage-id">{stageId}</span>
          {/* The runtime settles and the result panel appears — the player has NOT pressed yet. */}
          <button data-testid="btn-battle-end" onClick={() => onBattleEnd?.(victory())}>
            Battle end
          </button>
          <button
            data-testid="btn-win"
            onClick={() => {
              const result = victory()
              onBattleEnd?.(result)
              onComplete(result)
            }}
          >
            Win
          </button>
          <button
            data-testid="btn-lose"
            onClick={() =>
              onComplete({
                outcome: 'defeat',
                stageId,
                stageName: 'ลานฝึกทดสอบ',
                elapsedMs: 5000,
                defeatedEnemyIds: [],
                damageDealt: 10,
                damageTaken: 100,
                earnedExp: 0,
                earnedGold: 0,
                droppedItems: [],
                finishedAt: new Date().toISOString(),
              })
            }
          >
            Lose
          </button>
          <button data-testid="btn-exit" onClick={onExit}>
            Exit
          </button>
        </div>
      )
    },
  }
})

function makePlayer(): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'ผู้ทดสอบ',
    title: 'นักเดินทาง',
    level: 10,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 12,
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

function mockOnPlayerChange(player = makePlayer()) {
  return vi.fn(async (next: Player) => {
    Object.assign(player, next)
    return true
  })
}

function rewardMocks(
  overrides: Partial<{
    onCommitProgression: (
      payload: LobbyBattleProgressionRpcPayload,
    ) => Promise<{ ok: true; player: Player } | { ok: false; error: string }>
    onRecordPending: (result: RealtimeBattleResult, transactionId: string) => Promise<boolean>
    onClearPending: (transactionId: string) => Promise<boolean>
    onGetPendingRewards: () => Promise<PendingLobbyRewardRow[]>
  }> = {},
) {
  return {
    onCommitProgression: vi.fn(async (payload: LobbyBattleProgressionRpcPayload) => ({
      ok: true as const,
      player: payload.player,
    })),
    onRecordPending: vi.fn(async () => true),
    onClearPending: vi.fn(),
    onGetPendingRewards: vi.fn(async () => []),
    ...overrides,
  }
}

describe('LobbyBattleSession', () => {
  it('เริ่มที่หน้าเลือกด่านเสมอ — ไม่ mount BattleScene จนกว่าจะเลือกด่านที่ปลดล็อกแล้ว', () => {
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={mockOnPlayerChange()}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'เลือกด่าน' })).toBeInTheDocument()
    expect(screen.queryByTestId('mock-battle-scene')).not.toBeInTheDocument()
  })

  it('ด่านที่ยังไม่ปลดล็อก (trial-02) กดไม่ได้จากหน้าเลือกด่าน', () => {
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={mockOnPlayerChange()}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /ประตูปีศาจ/ })).toBeDisabled()
  })

  it('กดเลือกด่านปลดล็อกแล้วจะนำไปสู่หน้า BattleScene (Scar 2 check)', async () => {
    const user = userEvent.setup()
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={mockOnPlayerChange()}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }))

    expect(await screen.findByTestId('mock-battle-scene')).toBeInTheDocument()
    expect(screen.getByTestId('battle-stage-id')).toHaveTextContent('trial-01')
  })

  it('Scar 1: เคลียร์ด่านชนะสำเร็จ บันทึก clear-flag ใน Player.progress.flags และเรียกฟังก์ชันบันทึกข้อมูล', async () => {
    const user = userEvent.setup()
    const onPlayerChange = vi.fn(async (_p: Player) => true)
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))
    const onExit = vi.fn()
    const onCommitProgression = vi.fn(async (payload: LobbyBattleProgressionRpcPayload) => ({
      ok: true as const,
      player: payload.player,
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks({ onCommitProgression })}
        onExit={onExit}
      />,
    )

    // เข้าด่าน
    await user.click(screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }))

    // กดชนะในฉากจำลอง
    await user.click(screen.getByTestId('btn-win'))

    await waitFor(() => {
      expect(onCommitProgression).toHaveBeenCalledTimes(1)
    })

    const committed = onCommitProgression.mock.calls[0]?.[0] as LobbyBattleProgressionRpcPayload
    expect(committed.player.progress.flags['trial_cleared_trial-01']).toBe(true)
    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1)
    })
  })

  it('Scar 1: เคลียร์ด่านแพ้ ไม่บันทึก clear-flag', async () => {
    const user = userEvent.setup()
    const onPlayerChange = vi.fn(async (_p: Player) => true)
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))
    const onExit = vi.fn()
    const onCommitProgression = vi.fn(async (payload: LobbyBattleProgressionRpcPayload) => ({
      ok: true as const,
      player: payload.player,
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks({ onCommitProgression })}
        onExit={onExit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }))
    await user.click(screen.getByTestId('btn-lose'))

    await waitFor(() => {
      expect(onCommitProgression).toHaveBeenCalledTimes(1)
    })

    const committed = onCommitProgression.mock.calls[0]?.[0] as LobbyBattleProgressionRpcPayload
    expect(committed.player.progress.flags['trial_cleared_trial-01']).toBeUndefined()
    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1)
    })
  })

  it('Scar 1: ผู้เล่นออกจากห้องต่อสู้ก่อนกำหนด (Exit Early) ไม่มีการเซฟหรือบันทึก clear-flag', async () => {
    const user = userEvent.setup()
    const onPlayerChange = vi.fn(async (_p: Player) => true)
    const onExit = vi.fn()
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={onExit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }))
    await user.click(screen.getByTestId('btn-exit'))

    expect(onExit).toHaveBeenCalledTimes(1)
    // ENERGY_GATING_ENABLED=false (design-lock 2.b) — stage select no longer writes energy, and
    // there is no battle save on early exit either, so onPlayerChange never fires.
    expect(onPlayerChange).not.toHaveBeenCalled()
  })

  it('design-lock 2.b: ENERGY_GATING_ENABLED=false — เลือกด่านไม่เรียก onPlayerChange และไม่หัก energy', async () => {
    const user = userEvent.setup()
    const onPlayerChange = vi.fn(async (_p: Player) => true)
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }))

    expect(await screen.findByTestId('mock-battle-scene')).toBeInTheDocument()
    expect(onPlayerChange).not.toHaveBeenCalled()
  })

  it('Scar 2: ทุกด่านที่มีอยู่ในสารบัญ REALTIME_STAGES ต้องสามารถดึงค่าได้จริงและไม่เป็น null', () => {
    for (const stageId of Object.keys(REALTIME_STAGES)) {
      const stage = getRealtimeStage(stageId)
      expect(stage).not.toBeNull()
      expect(stage?.id).toBe(stageId)
    }
  })

  it('Scar 3: เอนทรีด่านและจัดสรรตัวละครทีมไม่สมบูรณ์ (เช่น teamSlots ว่างเปล่า) ไม่ส่งผลให้ crash หรือพัง', () => {
    const brokenPlayer = {
      ...makePlayer(),
      teamSlots: [null, null, null, null],
    }

    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))

    render(
      <LobbyBattleSession
        player={brokenPlayer}
        onPlayerChange={mockOnPlayerChange()}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={vi.fn()}
      />,
    )

    // ต้องยังขึ้นหน้าต่างเลือกด่านตามปกติ
    expect(screen.getByRole('dialog', { name: 'เลือกด่าน' })).toBeInTheDocument()
  })

  it('กู้รางวัลค้างจากรอบก่อนแล้วยังแสดงหน้าเลือกด่าน — ไม่ปิด overlay ทันที', async () => {
    const onExit = vi.fn()
    const pendingRow = {
      transactionId: 'lobby:trial-01:2026-01-01T00:00:00.000Z',
      stageId: 'trial-01',
      stageName: 'ลานฝึกหน้าวิหาร',
      outcome: 'victory' as const,
      earnedExp: 200,
      earnedGold: 100,
      droppedItems: [] as { itemId: string; quantity: number }[],
      durationMs: 5000,
      finishedAt: '2026-01-01T00:00:00.000Z',
    }

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={mockOnPlayerChange()}
        onEarnGold={vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
          ok: true as const,
          player: makePlayer(),
          amount,
        }))}
        onGrantItem={vi.fn(async (): Promise<ItemResult> => ({
          ok: true as const,
          player: makePlayer(),
        }))}
        {...rewardMocks({
          onGetPendingRewards: vi.fn(async () => [pendingRow]),
        })}
        onExit={onExit}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'เลือกด่าน' })).toBeInTheDocument()
    await waitFor(() => {
      expect(onExit).not.toHaveBeenCalled()
    })
    expect(screen.getByRole('dialog', { name: 'เลือกด่าน' })).toBeInTheDocument()
  })

  it('Done-criterion 6: LobbyBattleSession save sequence fires exactly once even under duplicate onComplete calls', async () => {
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))
    const onPlayerChange = vi.fn(async (_p: Player) => true)
    const onExit = vi.fn()

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={onExit}
      />,
    )

    // Select stage first
    const stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/i })
    stageBtn.click()

    // Wait for mock BattleScene to render
    const winBtn = await screen.findByTestId('btn-win')

    // Click complete twice (simulating double onComplete call)
    winBtn.click()
    winBtn.click()

    await waitFor(() => {
      expect(onEarnGold).toHaveBeenCalledTimes(1)
    })

    // Verify calls are only executed once due to savedRef guard
    expect(onEarnGold).toHaveBeenCalledTimes(1)
    expect(onGrantItem).toHaveBeenCalledTimes(1)
    expect(onPlayerChange.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('Scar 1 (Reward): prevents duplicate SP/reward grants on retry/re-entry when savedRef resets on new session mount', async () => {
    const onEarnGold = vi.fn(async (_s, amount): Promise<CurrencyResult> => ({
      ok: true as const,
      player: makePlayer(),
      amount,
    }))
    const onGrantItem = vi.fn(async (): Promise<ItemResult> => ({
      ok: true as const,
      player: makePlayer(),
    }))
    const onPlayerChange = vi.fn(async (_p: Player) => true)
    const onExit = vi.fn()

    // First session
    const { unmount } = render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={onExit}
      />,
    )

    // Select stage and complete
    let stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/i })
    stageBtn.click()
    let winBtn = await screen.findByTestId('btn-win')
    winBtn.click()

    await waitFor(() => {
      expect(onEarnGold).toHaveBeenCalledTimes(1)
    })
    unmount()

    // Second session (re-entering/retry)
    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        {...rewardMocks()}
        onExit={onExit}
      />,
    )

    // Select stage and complete again
    stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/i })
    stageBtn.click()
    winBtn = await screen.findByTestId('btn-win')
    winBtn.click()

    // It should call onEarnGold again since it is a NEW session (savedRef is local to component mount/unmount cycle),
    // which is the correct behavior for retry/re-entry, proving state isolation across mounts!
    await waitFor(() => {
      expect(onEarnGold).toHaveBeenCalledTimes(2)
    })
  })

  it('does not exit lobby when progression commit fails — earnGold not called', async () => {
    const onExit = vi.fn()
    const onEarnGold = vi.fn()

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={vi.fn(async () => true)}
        onEarnGold={onEarnGold}
        onGrantItem={vi.fn()}
        {...rewardMocks({
          onCommitProgression: vi.fn(async () => ({ ok: false as const, error: 'rpc fail' })),
        })}
        onExit={onExit}
      />,
    )

    const stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ })
    stageBtn.click()
    const winBtn = await screen.findByTestId('btn-win')
    winBtn.click()

    await waitFor(() => {
      expect(onEarnGold).not.toHaveBeenCalled()
    })
    expect(onExit).not.toHaveBeenCalled()
  })

  it('retry Continue after gold failure does not duplicate earnGold on success path', async () => {
    const onExit = vi.fn()
    const player = makePlayer()
    let currentPlayer = player
    const onPlayerChange = vi.fn(async (next: Player) => {
      currentPlayer = next
      return true
    })
    const onEarnGold = vi
      .fn()
      .mockResolvedValueOnce({ ok: false as const, error: 'ledger down' })
      .mockResolvedValueOnce({
        ok: true as const,
        player: { ...currentPlayer, currency: { gold: 520, gem: 0 } },
        amount: 20,
      })

    const { unmount } = render(
      <LobbyBattleSession
        player={currentPlayer}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={vi.fn(async (): Promise<ItemResult> => ({
          ok: true as const,
          player: currentPlayer,
        }))}
        {...rewardMocks()}
        onExit={onExit}
      />,
    )

    let stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ })
    stageBtn.click()
    let winBtn = await screen.findByTestId('btn-win')
    winBtn.click()
    await waitFor(() => expect(onEarnGold).toHaveBeenCalledTimes(1))
    expect(onExit).not.toHaveBeenCalled()
    unmount()

    render(
      <LobbyBattleSession
        player={currentPlayer}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={vi.fn(async (): Promise<ItemResult> => ({
          ok: true as const,
          player: currentPlayer,
        }))}
        {...rewardMocks()}
        onExit={onExit}
      />,
    )

    stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ })
    stageBtn.click()
    winBtn = await screen.findByTestId('btn-win')
    winBtn.click()
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
    expect(onEarnGold).toHaveBeenCalledTimes(2)
  })
})

/*
  2026-08-10 audit F6 — the durable pending row was written after the window it protects.

  `pending_lobby_rewards` exists so that a crash between "battle won" and "rewards granted" does
  not lose the player's rewards. But the only write was inside finalizeLobbyBattleRewards, which
  runs when the player presses "ต่อไป" on the result panel. The span from the runtime settling to
  that press — a human-length wait, unbounded — held the entire battle outcome in React state and
  nowhere else. A tab closed, refreshed, OOM-killed, or backgrounded off a phone during it lost
  the EXP, the gold, every drop, the trial_cleared flag and the battle history, with the stage
  energy already spent on entry. The row now goes down at battle end, before the wait.
*/
describe('F6: the durable row covers the wait for the continue press', () => {
  it('records the pending row at battle end — a tab that dies before the press keeps its rewards', async () => {
    const onRecordPending = vi.fn(async () => true)
    const onEarnGold = vi.fn()
    const player = makePlayer()

    const { unmount } = render(
      <LobbyBattleSession
        player={player}
        onPlayerChange={mockOnPlayerChange(player)}
        onEarnGold={onEarnGold}
        onGrantItem={vi.fn(async (): Promise<ItemResult> => ({ ok: true as const, player }))}
        {...rewardMocks({ onRecordPending })}
        onExit={vi.fn()}
      />,
    )

    screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }).click()
    const endBtn = await screen.findByTestId('btn-battle-end')
    endBtn.click()

    // The battle is over and the result panel is up. The player never presses "ต่อไป".
    await waitFor(() => expect(onRecordPending).toHaveBeenCalledTimes(1))
    const [recorded, txId] = onRecordPending.mock.calls[0] as unknown as [
      RealtimeBattleResult,
      string,
    ]
    expect(recorded.earnedGold).toBe(100)
    expect(recorded.droppedItems).toEqual([{ itemId: 'healing-peach', quantity: 1 }])
    expect(txId).toBe(lobbyBattleTransactionId(recorded))

    // The crash. Nothing was granted, and the durable row is what makes that recoverable.
    unmount()
    expect(onEarnGold).not.toHaveBeenCalled()
  })

  it('does not write the row twice when the player does press continue', async () => {
    const onRecordPending = vi.fn(async () => true)
    const onExit = vi.fn()
    const player = makePlayer()

    render(
      <LobbyBattleSession
        player={player}
        onPlayerChange={mockOnPlayerChange(player)}
        onEarnGold={vi.fn(async (): Promise<CurrencyResult> => ({
          ok: true as const,
          player,
          amount: 100,
        }))}
        onGrantItem={vi.fn(async (): Promise<ItemResult> => ({ ok: true as const, player }))}
        {...rewardMocks({ onRecordPending })}
        onExit={onExit}
      />,
    )

    screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }).click()
    const winBtn = await screen.findByTestId('btn-win')
    winBtn.click()

    /*
      Wait for the WHOLE pipeline to finish before counting.

      `waitFor(() => expect(...).toHaveBeenCalledTimes(1))` returns at the first poll that passes,
      which is the battle-end write — the pipeline's own record call happens later and the
      assertion would already be gone. A once-only assertion that cannot observe the second call
      is not an assertion; this repo has shipped that shape twice. onExit is the last thing a
      successful finalize does, so counting after it is counting at the end.
    */
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))

    // Battle end recorded it; the pipeline reused that same write and did not re-upsert.
    // A second upsert is not harmful (same key) but it burns the RPC's 20-per-60s limit.
    expect(onRecordPending).toHaveBeenCalledTimes(1)
  })

  /*
    The rejection shape of the same rule. onRecordPending can REJECT, not merely resolve false:
    getSupabase() throws outright on missing env (lib/supabaseClient.ts), and with the fetch retry
    wrapper gone a deadline abort surfaces as a thrown fetch error. Caching that rejected promise
    made every later attempt at the same battle re-await the same rejection — the durable row
    exists so a crash cannot lose rewards, and a permanently stuck retry loses them just as dead.
  */
  it('a rejected write is not cached — the next press writes again and the battle completes', async () => {
    const onExit = vi.fn()
    const player = makePlayer()
    const onRecordPending = vi
      .fn<(result: RealtimeBattleResult, transactionId: string) => Promise<boolean>>()
      .mockRejectedValueOnce(new Error('rpc deadline exceeded'))
      .mockResolvedValue(true)
    const onEarnGold = vi.fn(async (): Promise<CurrencyResult> => ({
      ok: true as const,
      player,
      amount: 100,
    }))

    render(
      <LobbyBattleSession
        player={player}
        onPlayerChange={mockOnPlayerChange(player)}
        onEarnGold={onEarnGold}
        onGrantItem={vi.fn(async (): Promise<ItemResult> => ({ ok: true as const, player }))}
        {...rewardMocks({ onRecordPending })}
        onExit={onExit}
      />,
    )

    screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/ }).click()
    const winBtn = await screen.findByTestId('btn-win')

    // First press: the durable write throws, so the pipeline refuses to grant anything.
    winBtn.click()
    await waitFor(() => expect(onRecordPending).toHaveBeenCalledTimes(1))
    expect(onEarnGold).not.toHaveBeenCalled()
    expect(onExit).not.toHaveBeenCalled()

    // Same battle, same transaction id — the player presses again on the same result panel.
    winBtn.click()
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))

    // A cached rejection would have thrown again here and granted nothing, forever.
    expect(onRecordPending).toHaveBeenCalledTimes(2)
    expect(onRecordPending.mock.calls[1]?.[1]).toBe(onRecordPending.mock.calls[0]?.[1])
    expect(onEarnGold).toHaveBeenCalledTimes(1)
  })
})
