import type {
  ChaseStageParams,
  DefendStageParams,
  HazardStageParams,
  SurvivalStageParams,
  TimeAttackStageParams,
} from './stageConfig'
import type { Vec2 } from './types'

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return isFiniteNumber(value) && value > 0
}

function isFinitePosition(position: Vec2 | null | undefined): position is Vec2 {
  return Boolean(position && isFiniteNumber(position.x) && isFiniteNumber(position.y))
}

export function isValidObjectiveValue(value: number | null): value is number {
  return isFiniteNumber(value) && value >= 0
}

export function isValidSurvivalParams(
  params: SurvivalStageParams | null | undefined,
): params is SurvivalStageParams {
  return isPositiveFinite(params?.durationMs)
}

export function isValidDefendParams(
  params: DefendStageParams | null | undefined,
): params is DefendStageParams {
  return isPositiveFinite(params?.objectiveHp) && isFinitePosition(params?.position)
}

export function isValidTimeAttackParams(
  params: TimeAttackStageParams | null | undefined,
): params is TimeAttackStageParams {
  return isPositiveFinite(params?.timeBudgetMs)
}

export function isValidChaseParams(
  params: ChaseStageParams | null | undefined,
): params is ChaseStageParams {
  return (
    isFinitePosition(params?.targetPosition) &&
    isPositiveFinite(params?.arrivalRadius) &&
    isPositiveFinite(params?.timeBudgetMs)
  )
}

export function isValidHazardParams(
  params: HazardStageParams | null | undefined,
): params is HazardStageParams {
  return isPositiveFinite(params?.hazardHp) && isPositiveFinite(params?.decayPerSecond)
}
