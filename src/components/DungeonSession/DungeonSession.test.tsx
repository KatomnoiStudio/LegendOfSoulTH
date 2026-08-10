import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DungeonSession } from './DungeonSession'
import { P5_TEST_DUNGEON } from '../../game/dungeon/dungeonConfig'
import type { DungeonResult } from '../../game/dungeon/dungeonSchema'
import type { StageRuntimeSnapshot } from '../../game/dungeon/stageRuntime'
import type { ResultViewModel } from '../../game/reward/rewardSchema'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'

const clearedResult: DungeonResult = {
  dungeonId: P5_TEST_DUNGEON.id,
  runId: 'test-run',
  success: true,
  completedAt: Date.now(),
  clearTimeMs: 60_000,
  lifecycle: 'finalized',
  stageResults: P5_TEST_DUNGEON.stages.map((stage) => ({
    stageId: stage.id,
    stageType: stage.stageType,
    success: true,
    clearTimeMs: 15_000,
  })),
  combatSummary: {
    enemiesDefeated: 5,
    elitesDefeated: 1,
    bossesDefeated: 1,
    damageDealt: 0,
    damageTaken: 0,
  },
}

const resultViewModel: ResultViewModel = {
  status: 'clear',
  dungeonName: P5_TEST_DUNGEON.metadata?.name ?? P5_TEST_DUNGEON.id,
  clearTimeLabel: '1:00',
  stagesCleared: 4,
  stagesTotal: 4,
  stageSummary: [],
  rewards: [],
  canContinue: true,
  nonProductionBalance: true,
}

function stubPlayer(): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'Tester',
    title: 'Novice',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 1,
        exp: 0,
        expToNext: 100,
        obtainedAt: new Date().toISOString(),
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: { ...EMPTY_PROGRESS },
  }
}

const { hookControl } = vi.hoisted(() => ({
  hookControl: {
    mode: 'complete' as 'complete' | 'active',
    completionFired: false,
    stageSnapshot: null as StageRuntimeSnapshot | null,
  },
}))

vi.mock('../../hooks/useDungeonStageBattle', () => ({
  useDungeonStageBattle: ({
    onDungeonComplete,
  }: {
    onDungeonComplete: (result: DungeonResult) => void
  }) => {
    if (hookControl.mode === 'active') {
      return {
        phase: 'active' as const,
        errorMessage: null,
        runtime: {},
        snapshot: {},
        stageSnapshot: hookControl.stageSnapshot,
        requestExit: vi.fn(),
        setJoystick: vi.fn(),
        pressAttack: vi.fn(),
        pressSkill: vi.fn(),
      }
    }

    const justCompleted = !hookControl.completionFired
    if (justCompleted) {
      hookControl.completionFired = true
      queueMicrotask(() => onDungeonComplete(clearedResult))
    }
    return {
      phase: justCompleted ? ('loading' as const) : ('complete' as const),
      errorMessage: null,
      runtime: null,
      snapshot: null,
      stageSnapshot: null,
      requestExit: vi.fn(),
      setJoystick: vi.fn(),
      pressAttack: vi.fn(),
      pressSkill: vi.fn(),
    }
  },
}))

vi.mock('../BattleScene/RealtimeBattleRoom', () => ({
  RealtimeBattleRoom: ({ objectiveOverlay }: { objectiveOverlay?: ReactNode }) => (
    <section
      data-testid="battle-room"
      data-objective-owner={objectiveOverlay ? 'dungeon' : 'adventure'}
    >
      {objectiveOverlay}
    </section>
  ),
}))

vi.mock('../../game/reward/dungeonRewardPipeline', () => ({
  resolveDungeonRewards: () => ({
    resolved: { transactionId: 'tx', entries: [] },
    viewModel: resultViewModel,
  }),
  grantAndFinalizeDungeonRewards: vi.fn(),
}))

describe('DungeonSession', () => {
  beforeEach(() => {
    hookControl.mode = 'complete'
    hookControl.completionFired = false
    hookControl.stageSnapshot = null
  })

  it('shows the result panel after the final stage clears (not the loading screen)', async () => {
    render(
      <DungeonSession
        player={stubPlayer()}
        onPlayerChange={vi.fn(async () => true)}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(await screen.findByRole('dialog', { name: /เคลียร์ดันเจี้ยน/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /กลับล็อบบี้/i })).toBeEnabled()
    expect(screen.queryByText(/กำลังเข้าดันเจี้ยน/i)).not.toBeInTheDocument()
  })

  it('preserves the adventure objective fallback while the dungeon snapshot is unavailable', () => {
    hookControl.mode = 'active'

    render(
      <DungeonSession
        player={stubPlayer()}
        onPlayerChange={vi.fn(async () => true)}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByTestId('battle-room')).toHaveAttribute('data-objective-owner', 'adventure')
    expect(screen.queryByRole('region', { name: 'เป้าหมายด่าน' })).not.toBeInTheDocument()
  })

  it('replaces the adventure objective only after the dungeon snapshot is available', () => {
    hookControl.mode = 'active'
    hookControl.stageSnapshot = {
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
      <DungeonSession
        player={stubPlayer()}
        onPlayerChange={vi.fn(async () => true)}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByTestId('battle-room')).toHaveAttribute('data-objective-owner', 'dungeon')
    expect(screen.getByRole('region', { name: 'เป้าหมายด่าน' })).toHaveTextContent(
      'เป้าหมายดันเจี้ยน',
    )
  })
})
