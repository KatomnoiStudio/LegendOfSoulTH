import type { DungeonFailureReason } from '../dungeon/dungeonSchema'
import type { DungeonDefinition } from '../dungeon/dungeonSchema'
import type { DungeonRunState } from '../dungeon/dungeonSchema'
import type { CombatSummary, DungeonResult, ResultLifecycle, StageResult } from './rewardSchema'
import { toCombatSummary, type CombatAccumulator } from './combatSummary'

export function createRunId(dungeonId: string, startedAtMs: number): string {
  return `${dungeonId}-${startedAtMs}`
}

export function inferFailureReason(
  stageResults: StageResult[],
  aborted?: boolean,
): DungeonFailureReason | undefined {
  if (aborted) return 'aborted'
  const failed = stageResults.find((s) => !s.success)
  if (!failed) return undefined
  const reason = failed.failureReason
  if (reason === 'timeout') return 'timeout'
  if (reason === 'targetEscaped') return 'targetEscaped'
  if (reason === 'objectiveFailed') return 'objectiveFailed'
  return 'playerDefeated'
}

export interface FinalizeInput {
  dungeon: DungeonDefinition
  run: DungeonRunState
  clearTimeMs: number
  combatAccumulator: CombatAccumulator
  aborted?: boolean
  lifecycle?: ResultLifecycle
}

let finalizeGuard = new Set<string>()

/** Test-only reset */
export function resetFinalizeGuard(): void {
  finalizeGuard = new Set()
}

/**
 * Finalize dungeon result once per runId — immutable after finalize.
 */
export function finalizeDungeonResult(input: FinalizeInput): DungeonResult {
  const runId = createRunId(input.dungeon.id, input.run.startedAtMs)
  if (finalizeGuard.has(runId)) {
    throw new Error(`Result already finalized for run ${runId}`)
  }
  finalizeGuard.add(runId)

  const success = input.run.status === 'cleared'
  const stageResults: StageResult[] = input.run.stageResults.map((s) => ({
    stageId: s.stageId,
    stageType: s.stageType,
    success: s.success,
    clearTimeMs: s.clearTimeMs,
    enemiesDefeated: s.enemiesDefeated,
    objectiveProgress: s.objectiveProgress,
    score: s.score,
    failureReason: s.failureReason,
  }))

  const combatSummary: CombatSummary = toCombatSummary(input.combatAccumulator)

  return {
    dungeonId: input.dungeon.id,
    runId,
    success,
    clearTimeMs: input.clearTimeMs,
    stageResults,
    combatSummary,
    failureReason: success ? undefined : inferFailureReason(stageResults, input.aborted),
    completedAt: Date.now(),
    lifecycle: input.lifecycle ?? 'finalized',
  }
}

export function isFirstClear(progressFlags: Record<string, boolean>, dungeonId: string): boolean {
  return !progressFlags[`dungeon_cleared_${dungeonId}`]
}

export function rewardTransactionFlagKey(transactionId: string): string {
  return `reward_tx_${transactionId}`
}

export function hasRewardTransaction(
  progressFlags: Record<string, boolean>,
  transactionId: string,
): boolean {
  return progressFlags[rewardTransactionFlagKey(transactionId)] === true
}
