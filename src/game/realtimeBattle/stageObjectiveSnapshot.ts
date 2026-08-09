import type { RealtimeBattleState } from './createRealtimeBattle'
import type { BattleObjectiveSnapshot } from './types'

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
      const target = stage.survival?.durationMs ?? 0
      return {
        kind: 'survival',
        current: Math.min(state.stageElapsedMs, target),
        target,
        remainingMs: Math.max(0, target - state.stageElapsedMs),
      }
    }
    case 'defend':
      return {
        kind: 'defend',
        current: state.objectiveHp,
        target: stage.defend?.objectiveHp ?? null,
        remainingMs: null,
      }
    case 'chase': {
      const params = stage.chase
      const distance = params
        ? Math.hypot(
            state.player.position.x - params.targetPosition.x,
            state.player.position.y - params.targetPosition.y,
          )
        : null
      return {
        kind: 'chase',
        current: distance,
        target: params?.arrivalRadius ?? null,
        remainingMs: params ? Math.max(0, params.timeBudgetMs - state.stageElapsedMs) : null,
      }
    }
    case 'hazard':
      return {
        kind: 'hazard',
        current: state.hazardHp,
        target: stage.hazard?.hazardHp ?? null,
        remainingMs: null,
      }
    case 'time-attack':
      return {
        kind: 'time-attack',
        current: state.currentWaveIndex + 1,
        target: stage.waves.length,
        remainingMs: stage.timeAttack
          ? Math.max(0, stage.timeAttack.timeBudgetMs - state.stageElapsedMs)
          : null,
      }
    case 'mini-boss':
      return { kind: 'mini-boss', current: null, target: null, remainingMs: null }
    case 'custom':
      return { kind: 'custom', current: null, target: null, remainingMs: null }
    case 'wave':
      return {
        kind: 'wave',
        current: state.currentWaveIndex + 1,
        target: stage.waves.length,
        remainingMs: null,
      }
  }
}
