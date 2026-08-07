import type { ObjectiveProgress, StageResolution } from './dungeonSchema'
import type { StageBattleBridge } from './stageBattleBridge'

export interface StageObjectiveContext {
  bridge: StageBattleBridge
  deltaMs: number
  stageElapsedMs: number
}

export interface StageObjective {
  start(): void
  update(ctx: StageObjectiveContext): void
  getProgress(): ObjectiveProgress
  isComplete(): boolean
  isFailed(): boolean
  cleanup(): void
}

export function resolveObjectiveOutcome(
  objective: StageObjective,
  bridge: StageBattleBridge,
): StageResolution {
  if (bridge.isPlayerDead()) return 'lose'
  if (objective.isFailed()) return 'lose'
  if (objective.isComplete()) return 'win'
  return 'continue'
}

/** Player death + objective failure lose; simultaneous last-enemy + player death → player loses (Ring 0 safe default). */
export function resolveStagePrecedence(
  playerDead: boolean,
  objectiveWin: boolean,
  objectiveFail: boolean,
): StageResolution {
  if (playerDead) return 'lose'
  if (objectiveFail) return 'lose'
  if (objectiveWin) return 'win'
  return 'continue'
}
