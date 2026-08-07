import type {
  DungeonDefinition,
  DungeonRunState,
  StageDefinition,
  StageResult,
} from './dungeonSchema'

export function getStageByIndex(dungeon: DungeonDefinition, index: number): StageDefinition | null {
  return dungeon.stages[index] ?? null
}

export function getStageById(dungeon: DungeonDefinition, stageId: string): StageDefinition | null {
  return dungeon.stages.find((s) => s.id === stageId) ?? null
}

export function createDungeonRun(dungeon: DungeonDefinition, startedAtMs = 0): DungeonRunState {
  return {
    dungeonId: dungeon.id,
    currentStageIndex: 0,
    status: 'active',
    stageResults: [],
    startedAtMs,
  }
}

export function recordStageResult(run: DungeonRunState, result: StageResult): DungeonRunState {
  return {
    ...run,
    stageResults: [...run.stageResults, result],
  }
}

export function advanceDungeonRun(
  run: DungeonRunState,
  dungeon: DungeonDefinition,
  stageSuccess: boolean,
  stageResult: StageResult,
): DungeonRunState {
  const next = recordStageResult(run, stageResult)
  if (!stageSuccess) {
    return { ...next, status: 'failed' }
  }
  const nextIndex = run.currentStageIndex + 1
  if (nextIndex >= dungeon.stages.length) {
    return { ...next, currentStageIndex: nextIndex, status: 'cleared' }
  }
  return { ...next, currentStageIndex: nextIndex, status: 'active' }
}

export function getCurrentStage(
  dungeon: DungeonDefinition,
  run: DungeonRunState,
): StageDefinition | null {
  if (run.status !== 'active') return null
  return getStageByIndex(dungeon, run.currentStageIndex)
}
