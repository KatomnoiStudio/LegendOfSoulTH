import type {
  ObjectiveProgress,
  StageDefinition,
  StageLifecycle,
  StageResolution,
  StageResult,
} from './dungeonSchema'
import { WaveEncounterRuntime, type EncounterRuntime } from './encounterRuntime'
import { resolveStagePrecedence } from './stageObjective'
import { createStageObjective } from './stageObjectives'
import type { StageBattleBridge } from './stageBattleBridge'
import { StageTimer } from './stageTimer'

export interface StageRuntimeSnapshot {
  stageId: string
  stageName: string
  stageType: StageDefinition['stageType']
  lifecycle: StageLifecycle
  objective: ObjectiveProgress
  timerRemainingMs: number | null
  timerElapsedMs: number
  enemiesRemaining: number
}

/**
 * Authoritative stage lifecycle owner — does NOT own combat state.
 */
export class StageRuntime {
  private lifecycle: StageLifecycle = 'not_started'
  private stageElapsedMs = 0
  private encounter: EncounterRuntime
  private objective: ReturnType<typeof createStageObjective>
  private timer = new StageTimer()
  private cleanedUp = false
  private won = false
  private failureReason?: string
  private enemiesDefeated = 0
  private definition: StageDefinition
  private bridge: StageBattleBridge

  constructor(definition: StageDefinition, bridge: StageBattleBridge) {
    this.definition = definition
    this.bridge = bridge
    this.encounter = new WaveEncounterRuntime(() => this.bridge.getEnemies())
    this.objective = createStageObjective(definition, bridge)
    this.timer.configure(definition.timer)
  }

  enter(): void {
    if (this.lifecycle !== 'not_started') return
    this.lifecycle = 'entering'
    this.lifecycle = 'active'
    this.objective.start()
    this.encounter.start()
    this.timer.start()
  }

  tick(deltaMs: number): StageResolution {
    if (this.lifecycle !== 'active') return 'continue'

    this.stageElapsedMs += deltaMs
    this.timer.tick(deltaMs)
    this.encounter.update(deltaMs)
    const aliveBefore = this.bridge.getAliveEnemies().length
    this.objective.update({
      bridge: this.bridge,
      deltaMs,
      stageElapsedMs: this.stageElapsedMs,
    })
    const aliveAfter = this.bridge.getAliveEnemies().length
    if (aliveAfter < aliveBefore) {
      this.enemiesDefeated += aliveBefore - aliveAfter
    }

    const playerDead = this.bridge.isPlayerDead()
    const objectiveWin = this.objective.isComplete()
    const objectiveFail = this.objective.isFailed()
    const timerExpired = this.timer.isExpired()

    let resolution = resolveStagePrecedence(playerDead, objectiveWin, objectiveFail)

    if (resolution === 'continue' && timerExpired) {
      resolution = this.definition.stageType === 'defend' && !objectiveFail ? 'win' : 'lose'
    }

    if (resolution === 'win' || resolution === 'lose') {
      const failureReason = this.inferFailureReason(
        resolution === 'win',
        playerDead,
        objectiveFail,
        timerExpired,
      )
      this.resolve(resolution === 'win', failureReason)
    }

    return resolution
  }

  private inferFailureReason(
    won: boolean,
    playerDead: boolean,
    objectiveFail: boolean,
    timerExpired: boolean,
  ): string | undefined {
    if (won) return undefined
    if (playerDead) return 'playerDefeated'
    if (timerExpired) return 'timeout'
    if (objectiveFail) return 'objectiveFailed'
    if (this.definition.stageType === 'chase') return 'targetEscaped'
    return 'objectiveFailed'
  }

  private resolve(won: boolean, failureReason?: string): void {
    if (this.lifecycle !== 'active') return
    this.won = won
    this.failureReason = won ? undefined : failureReason
    this.lifecycle = 'resolving'
    this.timer.stop()
    this.lifecycle = won ? 'cleared' : 'failed'
    this.lifecycle = 'exiting'
    this.cleanup()
    this.lifecycle = 'complete'
  }

  cleanup(): void {
    if (this.cleanedUp) return
    this.cleanedUp = true
    this.timer.stop()
    this.objective.cleanup()
  }

  getSnapshot(): StageRuntimeSnapshot {
    return {
      stageId: this.definition.id,
      stageName: this.definition.name,
      stageType: this.definition.stageType,
      lifecycle: this.lifecycle,
      objective: this.objective.getProgress(),
      timerRemainingMs: this.timer.getSnapshot().remainingMs,
      timerElapsedMs: this.timer.getSnapshot().elapsedMs,
      enemiesRemaining: this.bridge.getAliveEnemies().length,
    }
  }

  getResult(): StageResult {
    const progress = this.objective.getProgress()
    const objectiveProgress =
      progress.target > 0 ? Math.min(1, progress.current / progress.target) : undefined

    return {
      stageId: this.definition.id,
      stageType: this.definition.stageType,
      success: this.won,
      clearTimeMs: this.stageElapsedMs,
      objectiveProgress,
      enemiesDefeated: this.enemiesDefeated,
      failureReason: this.failureReason,
    }
  }

  isComplete(): boolean {
    return this.lifecycle === 'complete'
  }

  isCleared(): boolean {
    return this.lifecycle === 'complete' && this.won
  }

  isFailed(): boolean {
    return this.lifecycle === 'complete' && !this.won
  }

  getDefinition(): StageDefinition {
    return this.definition
  }
}
