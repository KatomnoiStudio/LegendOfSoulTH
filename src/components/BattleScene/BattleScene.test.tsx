import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import { BattleScene } from './BattleScene'

const RESULT: RealtimeBattleResult = {
  outcome: 'victory',
  stageId: 'trial-01',
  stageName: 'ลานฝึกทดสอบ',
  elapsedMs: 5000,
  defeatedEnemyIds: ['shadow-soldier'],
  damageDealt: 100,
  damageTaken: 10,
  earnedExp: 200,
  earnedGold: 100,
  droppedItems: [{ itemId: 'healing-peach', quantity: 1 }],
  finishedAt: '2026-08-10T10:00:00.000Z',
}

/*
  The room reports "battle over" the instant the runtime settles. Holding the room in `loading`
  keeps three.js and the whole render tree out of this test — the only thing under test is WHEN
  BattleScene tells the outside world the battle ended.
*/
vi.mock('../../hooks/useRealtimeBattle', async () => {
  const { useEffect } = await import('react')
  return {
    useRealtimeBattle: ({ onComplete }: { onComplete: (r: RealtimeBattleResult) => void }) => {
      useEffect(() => {
        onComplete(RESULT)
      }, [onComplete])
      return {
        phase: 'loading' as const,
        errorMessage: null,
        runtime: null,
        snapshot: null,
        requestExit: vi.fn(),
        setJoystick: vi.fn(),
        pressAttack: vi.fn(),
        pressSkill: vi.fn(),
      }
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

/*
  2026-08-10 audit F6 — the durable pending row was written after the window it protects.

  `onComplete` fires when the player presses "ต่อไป" on the result panel, and only then did
  anything durable get written. The whole span between the runtime settling and that press —
  a human-length wait — had no record of the battle anywhere. This is the notification that
  lets the outside world close it, so it has to fire at battle END, not at the press.
*/
describe('F6: BattleScene reports the battle end before the player presses continue', () => {
  it('fires onBattleEnd as soon as the runtime settles — with no press at all', async () => {
    const onBattleEnd = vi.fn()
    const onComplete = vi.fn()

    render(
      <BattleScene
        player={makePlayer()}
        stageId="trial-01"
        onComplete={onComplete}
        onBattleEnd={onBattleEnd}
        onExit={vi.fn()}
      />,
    )

    await waitFor(() => expect(onBattleEnd).toHaveBeenCalledWith(RESULT))
    // The press has not happened, so the reward pipeline has NOT run — that is the whole point.
    expect(onComplete).not.toHaveBeenCalled()
  })
})
