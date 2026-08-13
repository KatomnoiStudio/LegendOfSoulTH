import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import { BattleScene } from './BattleScene'

// Audit 2026-08-12 §0b.2, the half a timeout cannot reach.
//
// The 'error' branch has always had a way out. The 'loading' branch had none — and it is entered
// not only while textures preload (which now has a deadline) but whenever `runtime` or `snapshot`
// is missing for any reason at all. On that screen "still working" and "stuck forever" look
// identical to the player, and the only escape was closing the tab.
//
// Held in loading deliberately: no onComplete, no runtime, no snapshot — the state the player was
// trapped in.

const { requestExitMock } = vi.hoisted(() => ({ requestExitMock: vi.fn() }))

vi.mock('../../hooks/useRealtimeBattle', () => ({
  useRealtimeBattle: () => ({
    phase: 'loading' as const,
    errorMessage: null,
    runtime: null,
    snapshot: null,
    requestExit: requestExitMock,
    setJoystick: vi.fn(),
    pressAttack: vi.fn(),
    pressSkill: vi.fn(),
  }),
}))

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

function renderLoadingScene(onExit = vi.fn()) {
  requestExitMock.mockClear()
  render(
    <BattleScene
      player={makePlayer()}
      stageId="trial-01"
      onComplete={vi.fn()}
      onBattleEnd={vi.fn()}
      onExit={onExit}
    />,
  )
  return { onExit }
}

describe('BattleScene loading screen is not a dead end', () => {
  it('offers a way back while still preparing the room', () => {
    renderLoadingScene()

    expect(screen.getByText('กำลังเตรียมห้องต่อสู้…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'กลับล็อบบี้' })).toBeInTheDocument()
  })

  it('stops the simulation before handing the player back, not after', async () => {
    const { onExit } = renderLoadingScene()

    await userEvent.click(screen.getByRole('button', { name: 'กลับล็อบบี้' }))

    // Order matters and is the reason handleExit exists rather than passing onExit straight to
    // the button: leaving the loop running through a scene change is its own defect.
    expect(requestExitMock).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(requestExitMock.mock.invocationCallOrder[0]).toBeLessThan(
      onExit.mock.invocationCallOrder[0],
    )
  })
})
