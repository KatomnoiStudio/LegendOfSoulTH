import type {
  ChaseParams,
  CustomParams,
  DefendParams,
  HazardParams,
  MiniBossParams,
  ObjectiveProgress,
  StageDefinition,
  SurvivalParams,
  TimeAttackParams,
} from './dungeonSchema'
import type { StageBattleBridge } from './stageBattleBridge'
import { type StageObjective, type StageObjectiveContext } from './stageObjective'

const DEFAULT_SURVIVAL = { totalWaves: 3, waveIntervalMs: 2000 }

export function createStageObjective(
  definition: StageDefinition,
  bridge: StageBattleBridge,
): StageObjective {
  switch (definition.stageType) {
    case 'survival':
      return new SurvivalObjective(definition.params as SurvivalParams, bridge)
    case 'defend':
      return new DefendObjective(definition.params as DefendParams, bridge)
    case 'chase':
      return new ChaseObjective(definition.params as ChaseParams, bridge)
    case 'hazard':
      return new HazardObjective(definition.params as HazardParams, bridge)
    case 'mini-boss':
      return new MiniBossObjective(definition.params as MiniBossParams, bridge)
    case 'time-attack':
      return new TimeAttackObjective(definition.params as TimeAttackParams, bridge)
    case 'custom':
      return new CustomObjective(definition.params as CustomParams, bridge)
    default:
      return new DefeatAllObjective(bridge)
  }
}

class DefeatAllObjective implements StageObjective {
  private bridge: StageBattleBridge

  constructor(bridge: StageBattleBridge) {
    this.bridge = bridge
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(true)
  }

  update(_ctx: StageObjectiveContext): void {}

  getProgress(): ObjectiveProgress {
    const alive = this.bridge.getAliveEnemies().length
    return { label: 'ศัตรู', current: alive, target: 0, detail: `${alive} เหลือ` }
  }

  isComplete(): boolean {
    const enemies = this.bridge.getEnemies()
    return enemies.length > 0 && this.bridge.getAliveEnemies().length === 0
  }

  isFailed(): boolean {
    return false
  }

  cleanup(): void {}
}

export class SurvivalObjective implements StageObjective {
  private waveIndex = 0
  private wavesSpawned = 0
  private waitingIntervalMs = 0
  private finalWaveSpawned = false
  private finalWaveCleared = false
  private params: SurvivalParams
  private bridge: StageBattleBridge

  constructor(params: SurvivalParams, bridge: StageBattleBridge) {
    this.params = params
    this.bridge = bridge
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(false)
    if (this.bridge.getAliveEnemies().length === 0) {
      this.spawnWave(0)
    }
  }

  update(ctx: StageObjectiveContext): void {
    const totalWaves = this.params.totalWaves ?? DEFAULT_SURVIVAL.totalWaves
    const interval = this.params.waveIntervalMs ?? DEFAULT_SURVIVAL.waveIntervalMs
    const alive = this.bridge.getAliveEnemies()

    if (alive.length > 0) return

    if (this.wavesSpawned >= totalWaves && this.finalWaveSpawned) {
      this.finalWaveCleared = true
      return
    }

    if (this.wavesSpawned >= totalWaves) return

    this.waitingIntervalMs += ctx.deltaMs
    if (this.waitingIntervalMs >= interval) {
      this.waitingIntervalMs = 0
      this.spawnWave(this.waveIndex)
    }
  }

  private spawnWave(index: number): void {
    const count = this.bridge.spawnWave(index)
    if (count > 0) {
      this.waveIndex = index + 1
      this.wavesSpawned += 1
      const totalWaves = this.params.totalWaves ?? DEFAULT_SURVIVAL.totalWaves
      if (this.wavesSpawned >= totalWaves) this.finalWaveSpawned = true
    }
  }

  getProgress(): ObjectiveProgress {
    const total = this.params.totalWaves ?? DEFAULT_SURVIVAL.totalWaves
    return {
      label: 'คลื่น',
      current: Math.min(this.wavesSpawned, total),
      target: total,
      detail: this.finalWaveCleared ? 'เคลียร์แล้ว' : undefined,
    }
  }

  isComplete(): boolean {
    const totalWaves = this.params.totalWaves ?? DEFAULT_SURVIVAL.totalWaves
    return this.finalWaveSpawned && this.finalWaveCleared && this.wavesSpawned >= totalWaves
  }

  isFailed(): boolean {
    return false
  }

  cleanup(): void {}
}

export class DefendObjective implements StageObjective {
  private objectiveHp: number
  private stageElapsedMs = 0
  private params: DefendParams
  private bridge: StageBattleBridge

  constructor(params: DefendParams, bridge: StageBattleBridge) {
    this.params = params
    this.bridge = bridge
    this.objectiveHp = params.objectiveHP ?? 100
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(true)
    this.stageElapsedMs = 0
  }

  update(ctx: StageObjectiveContext): void {
    this.stageElapsedMs = ctx.stageElapsedMs
    const alive = this.bridge.getAliveEnemies()
    if (alive.length > 0) {
      this.objectiveHp = Math.max(0, this.objectiveHp - alive.length * 0.05 * (ctx.deltaMs / 100))
    }
  }

  getProgress(): ObjectiveProgress {
    const max = this.params.objectiveHP ?? 100
    return { label: 'วัตถุประสงค์', current: Math.round(this.objectiveHp), target: max }
  }

  isComplete(): boolean {
    const limit = this.params.timeLimitMs
    if (!limit) {
      return this.bridge.getAliveEnemies().length === 0 && this.bridge.getEnemies().length > 0
    }
    return this.stageElapsedMs >= limit && this.objectiveHp > 0
  }

  isFailed(): boolean {
    return this.objectiveHp <= 0
  }

  cleanup(): void {}
}

export class ChaseObjective implements StageObjective {
  private escaped = false
  private params: ChaseParams
  private bridge: StageBattleBridge

  constructor(params: ChaseParams, bridge: StageBattleBridge) {
    this.params = params
    this.bridge = bridge
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(true)
  }

  update(ctx: StageObjectiveContext): void {
    const enemies = this.bridge.getAliveEnemies()
    const target =
      enemies.find((e) => e.enemyId === this.params.targetTemplateId) ?? enemies[0] ?? null
    if (!target) return
    const threshold = this.params.escapeThresholdX ?? 200
    if (target.position.x <= threshold) {
      this.escaped = true
      return
    }
    this.bridge.moveEnemyTo(
      target.id,
      target.position.x - 20 * (ctx.deltaMs / 1000),
      target.position.y,
    )
  }

  getProgress(): ObjectiveProgress {
    return {
      label: 'เป้าหมาย',
      current: this.escaped ? 0 : 1,
      target: 1,
      detail: this.escaped ? 'หลุดรอด!' : 'ไล่ล่า',
    }
  }

  isComplete(): boolean {
    if (this.escaped) return false
    const templateId = this.params.targetTemplateId ?? 'shadow-soldier'
    const targets = this.bridge.getEnemies().filter((e) => e.enemyId === templateId)
    if (targets.length === 0) return false
    return targets.every((e) => e.state === 'dead' || e.hp <= 0)
  }

  isFailed(): boolean {
    return this.escaped
  }

  cleanup(): void {}
}

export class HazardObjective implements StageObjective {
  private hazardActive = false
  private tickMs = 0
  private params: HazardParams
  private bridge: StageBattleBridge

  constructor(params: HazardParams, bridge: StageBattleBridge) {
    this.params = params
    this.bridge = bridge
  }

  start(): void {
    this.hazardActive = true
    this.bridge.setAutoWaveAdvance(true)
  }

  update(ctx: StageObjectiveContext): void {
    if (!this.hazardActive) return
    const dps = this.params.hazardDamagePerSec ?? 8
    const safeY = this.params.safeZoneCenterY ?? 550
    const radius = this.params.safeZoneRadius ?? 180
    const player = ctx.bridge.getPlayer()
    const dist = Math.abs(player.position.y - safeY)
    if (dist > radius) {
      this.tickMs += ctx.deltaMs
      if (this.tickMs >= 500) {
        this.tickMs = 0
        ctx.bridge.applyHazardDamage(dps * 0.5)
      }
    }
  }

  getProgress(): ObjectiveProgress {
    return { label: 'อันตราย', current: this.hazardActive ? 1 : 0, target: 1 }
  }

  isComplete(): boolean {
    return this.bridge.getAliveEnemies().length === 0 && this.bridge.getEnemies().length > 0
  }

  isFailed(): boolean {
    return false
  }

  cleanup(): void {
    this.hazardActive = false
  }
}

export class MiniBossObjective implements StageObjective {
  private params: MiniBossParams
  private bridge: StageBattleBridge

  constructor(params: MiniBossParams, bridge: StageBattleBridge) {
    this.params = params
    this.bridge = bridge
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(true)
  }

  update(_ctx: StageObjectiveContext): void {}

  getProgress(): ObjectiveProgress {
    const boss = this.findBoss()
    return {
      label: 'มินิบอส',
      current: boss ? boss.hp : 0,
      target: boss?.maxHp ?? 1,
    }
  }

  isComplete(): boolean {
    const boss = this.findBoss()
    return boss !== null && (boss.state === 'dead' || boss.hp <= 0)
  }

  isFailed(): boolean {
    return false
  }

  cleanup(): void {}

  private findBoss() {
    const id = this.params.bossTemplateId ?? 'demon-captain'
    return (
      this.bridge.getEnemies().find((e) => e.enemyId === id) ??
      this.bridge.getEnemies().find((e) => e.entityType === 'boss') ??
      null
    )
  }
}

export class TimeAttackObjective implements StageObjective {
  private goalMet = false
  private bridge: StageBattleBridge

  constructor(_params: TimeAttackParams, bridge: StageBattleBridge) {
    this.bridge = bridge
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(true)
  }

  update(_ctx: StageObjectiveContext): void {
    if (this.bridge.getAliveEnemies().length === 0 && this.bridge.getEnemies().length > 0) {
      this.goalMet = true
    }
  }

  getProgress(): ObjectiveProgress {
    return { label: 'เป้าหมาย', current: this.goalMet ? 1 : 0, target: 1 }
  }

  isComplete(): boolean {
    return this.goalMet
  }

  isFailed(): boolean {
    return false
  }

  cleanup(): void {}
}

const CUSTOM_RULESETS: Record<
  string,
  (
    params: Record<string, unknown> | undefined,
    bridge: StageBattleBridge,
  ) => 'win' | 'lose' | 'continue'
> = {
  'instant-win': () => 'win',
  'instant-lose': () => 'lose',
  'defeat-all': (_p, bridge) =>
    bridge.getAliveEnemies().length === 0 && bridge.getEnemies().length > 0 ? 'win' : 'continue',
}

export class CustomObjective implements StageObjective {
  private outcome: 'continue' | 'win' | 'lose' = 'continue'
  private params: CustomParams
  private bridge: StageBattleBridge

  constructor(params: CustomParams, bridge: StageBattleBridge) {
    this.params = params
    this.bridge = bridge
  }

  start(): void {
    this.bridge.setAutoWaveAdvance(true)
    if (!CUSTOM_RULESETS[this.params.rulesetId]) {
      this.outcome = 'lose'
    }
  }

  update(ctx: StageObjectiveContext): void {
    const fn = CUSTOM_RULESETS[this.params.rulesetId]
    if (!fn) return
    const result = fn(this.params.customParams, ctx.bridge)
    if (result !== 'continue') this.outcome = result
  }

  getProgress(): ObjectiveProgress {
    return { label: 'Custom', current: this.outcome === 'win' ? 1 : 0, target: 1 }
  }

  isComplete(): boolean {
    return this.outcome === 'win'
  }

  isFailed(): boolean {
    return this.outcome === 'lose'
  }

  cleanup(): void {}
}
