import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StageRuntimeSnapshot } from '../../game/dungeon/stageRuntime'
import { createRealtimeBattle } from '../../game/realtimeBattle/createRealtimeBattle'
import { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import { StageObjectiveHud } from '../DungeonSession/StageObjectiveHud'
import { BattleObjectiveLayer } from './AdventureObjectiveHud'
import { BattleHud } from './BattleHud'

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

function makeSurvivalSnapshot() {
  const state = createRealtimeBattle('trial-03', makePlayer())
  if (!state) throw new Error('เตรียม fixture ไม่สำเร็จ')
  return new RealtimeBattleRuntime(state).getSnapshot()
}

describe('battle objective HUD composition', () => {
  it('renders one objective region and one survival label across the whole battle HUD', () => {
    const snapshot = makeSurvivalSnapshot()

    render(
      <>
        <BattleHud snapshot={snapshot} onExit={vi.fn()} />
        <BattleObjectiveLayer snapshot={snapshot} />
      </>,
    )

    expect(screen.getAllByRole('region', { name: 'เป้าหมายด่าน' })).toHaveLength(1)
    expect(screen.getAllByText(/เอาชีวิตรอด/)).toHaveLength(1)
  })

  it('lets the dungeon objective replace the adventure default instead of overlapping it', () => {
    const snapshot = makeSurvivalSnapshot()
    const dungeonObjective: StageRuntimeSnapshot = {
      stageId: 'dungeon-stage-1',
      stageName: 'เป้าหมายดันเจี้ยน',
      stageType: 'defend',
      lifecycle: 'active',
      objective: { label: 'ปกป้องแกนกลาง', current: 75, target: 100 },
      timerRemainingMs: 30_000,
      timerElapsedMs: 10_000,
      enemiesRemaining: 2,
    }

    render(
      <>
        <BattleHud snapshot={snapshot} onExit={vi.fn()} />
        <BattleObjectiveLayer
          snapshot={snapshot}
          objectiveOverlay={<StageObjectiveHud snapshot={dungeonObjective} />}
        />
      </>,
    )

    expect(screen.getAllByRole('region', { name: 'เป้าหมายด่าน' })).toHaveLength(1)
    expect(screen.getByText('เป้าหมายดันเจี้ยน')).toBeInTheDocument()
    expect(screen.queryByText(/เอาชีวิตรอด/)).not.toBeInTheDocument()
  })
})
