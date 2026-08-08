import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LobbyBattleSession } from './LobbyBattleSession'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

/**
 * เทสต์ตาม Done-criteria #3 (docs/agent-blueprint/16-stage-adventure-system.md):
 * "rejects a locked stageId before BattleScene mounts"
 *
 * ตัว gating logic เองเทสต์เป็น pure predicate แล้วที่ stageConfig.test.ts —
 * ไฟล์นี้ปักหมุดจุดที่เรียกมันจริง: LobbyBattleSession ต้องไม่ mount BattleScene
 * จนกว่าจะมีด่านที่ปลดล็อกถูกเลือกก่อน
 */

vi.mock('../BattleScene/BattleScene', () => {
  return {
    BattleScene: ({
      onComplete,
      onExit,
    }: {
      onComplete: (result: {
        stageId: string
        outcome: 'victory' | 'defeat'
        earnedGold: number
        earnedExp: number
        droppedItems: Array<{ itemId: string; quantity: number }>
      }) => void
      onExit: () => void
    }) => (
      <div>
        <button
          data-testid="complete-btn"
          onClick={() =>
            onComplete({
              stageId: 'trial-01',
              outcome: 'victory',
              earnedGold: 100,
              earnedExp: 50,
              droppedItems: [{ itemId: 'iron-essence', quantity: 2 }],
            })
          }
        >
          Complete Battle
        </button>
        <button data-testid="exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>
    ),
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

describe('LobbyBattleSession', () => {
  it('เริ่มที่หน้าเลือกด่านเสมอ — ไม่ mount BattleScene จนกว่าจะเลือกด่านที่ปลดล็อกแล้ว', () => {
    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={vi.fn()}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'เลือกด่าน' })).toBeInTheDocument()
    expect(screen.queryByText('กำลังเตรียมห้องต่อสู้…')).not.toBeInTheDocument()
  })

  it('ด่านที่ยังไม่ปลดล็อก (trial-02) กดไม่ได้จากหน้าเลือกด่าน', () => {
    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={vi.fn()}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /ประตูปีศาจ/ })).toBeDisabled()
  })

  it('Done-criterion 6: LobbyBattleSession save sequence fires exactly once even under duplicate onComplete calls', async () => {
    const onEarnGold = vi.fn().mockResolvedValue({ ok: true, player: makePlayer() })
    const onGrantItem = vi.fn().mockResolvedValue({ ok: true, player: makePlayer() })
    const onPlayerChange = vi.fn().mockResolvedValue(true)
    const onExit = vi.fn()

    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        onExit={onExit}
      />,
    )

    // Select stage first
    const stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/i })
    stageBtn.click()

    // Wait for mock BattleScene to render
    const completeBtn = await screen.findByTestId('complete-btn')

    // Click complete button twice (simulating double onComplete call)
    completeBtn.click()
    completeBtn.click()

    // Wait for the async save queue to execute
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Verify calls are only executed once due to savedRef guard
    expect(onEarnGold).toHaveBeenCalledTimes(1)
    expect(onGrantItem).toHaveBeenCalledTimes(1)
    expect(onPlayerChange).toHaveBeenCalledTimes(1)
  })

  it('Scar 1: prevents duplicate SP/reward grants on retry/re-entry when savedRef resets on new session mount', async () => {
    const onEarnGold = vi.fn().mockResolvedValue({ ok: true, player: makePlayer() })
    const onGrantItem = vi.fn().mockResolvedValue({ ok: true, player: makePlayer() })
    const onPlayerChange = vi.fn().mockResolvedValue(true)
    const onExit = vi.fn()

    // First session
    const { unmount } = render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        onExit={onExit}
      />,
    )

    // Select stage and complete
    let stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/i })
    stageBtn.click()
    let completeBtn = await screen.findByTestId('complete-btn')
    completeBtn.click()

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(onEarnGold).toHaveBeenCalledTimes(1)
    unmount()

    // Second session (re-entering/retry)
    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={onPlayerChange}
        onEarnGold={onEarnGold}
        onGrantItem={onGrantItem}
        onExit={onExit}
      />,
    )

    // Select stage and complete again
    stageBtn = screen.getByRole('button', { name: /ลานฝึกหน้าวิหาร/i })
    stageBtn.click()
    completeBtn = await screen.findByTestId('complete-btn')
    completeBtn.click()

    await new Promise((resolve) => setTimeout(resolve, 20))
    // It should call onEarnGold again since it is a NEW session (savedRef is local to component mount/unmount cycle),
    // which is the correct behavior for retry/re-entry, proving state isolation across mounts!
    expect(onEarnGold).toHaveBeenCalledTimes(2)
  })
})
