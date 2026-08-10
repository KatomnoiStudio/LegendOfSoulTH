import type { RealtimeBattleState } from './createRealtimeBattle'
import {
  isValidChaseParams,
  isValidDefendParams,
  isValidHazardParams,
  isValidObjectiveValue,
  isValidSurvivalParams,
  isValidTimeAttackParams,
} from './stageObjectiveConfig'
import type { BattleObjectiveSnapshot } from './types'

function buildWaveObjectiveSnapshot(state: RealtimeBattleState): BattleObjectiveSnapshot {
  return {
    kind: 'wave',
    current: state.currentWaveIndex + 1,
    target: state.stage.waves.length,
    remainingMs: null,
  }
}

/**
 * Converts mutable runtime objective state into the small immutable shape consumed by React.
 *
 * Every timer here reads `stageElapsedMs`, the same intro-exclusive clock
 * `StageVariationSystem.resolveStageOutcome()` judges win/lose on — reading the intro-inclusive
 * `elapsedMs` instead would put the on-screen countdown ~700ms out of step with the verdict.
 */
export function buildStageObjectiveSnapshot(state: RealtimeBattleState): BattleObjectiveSnapshot {
  const { stage } = state

  switch (stage.stageType) {
    case 'survival': {
      if (!isValidSurvivalParams(stage.survival)) return buildWaveObjectiveSnapshot(state)
      const target = stage.survival.durationMs
      return {
        kind: 'survival',
        current: Math.min(state.stageElapsedMs, target),
        target,
        remainingMs: Math.max(0, target - state.stageElapsedMs),
      }
    }
    case 'defend':
      if (!isValidDefendParams(stage.defend) || !isValidObjectiveValue(state.objectiveHp)) {
        return buildWaveObjectiveSnapshot(state)
      }
      return {
        kind: 'defend',
        current: state.objectiveHp,
        target: stage.defend.objectiveHp,
        remainingMs: null,
      }
    case 'chase': {
      const params = stage.chase
      if (!isValidChaseParams(params)) return buildWaveObjectiveSnapshot(state)
      const distance = Math.hypot(
        state.player.position.x - params.targetPosition.x,
        state.player.position.y - params.targetPosition.y,
      )
      return {
        kind: 'chase',
        current: distance,
        target: params.arrivalRadius,
        remainingMs: Math.max(0, params.timeBudgetMs - state.stageElapsedMs),
      }
    }
    case 'hazard':
      if (!isValidHazardParams(stage.hazard) || !isValidObjectiveValue(state.hazardHp)) {
        return buildWaveObjectiveSnapshot(state)
      }
      return {
        kind: 'hazard',
        current: state.hazardHp,
        target: stage.hazard.hazardHp,
        remainingMs: null,
      }
    case 'time-attack':
      if (!isValidTimeAttackParams(stage.timeAttack)) return buildWaveObjectiveSnapshot(state)
      return {
        kind: 'time-attack',
        current: state.currentWaveIndex + 1,
        target: stage.waves.length,
        remainingMs: Math.max(0, stage.timeAttack.timeBudgetMs - state.stageElapsedMs),
      }
    case 'mini-boss':
      return { kind: 'mini-boss', current: null, target: null, remainingMs: null }
    case 'custom':
      return { kind: 'custom', current: null, target: null, remainingMs: null }
    case 'wave':
      return buildWaveObjectiveSnapshot(state)
    default:
      return buildWaveObjectiveSnapshot(state)
  }
}
