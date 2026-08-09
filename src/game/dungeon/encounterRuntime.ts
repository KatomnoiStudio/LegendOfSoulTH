import type { RealtimeBattleEntity } from '../realtimeBattle/types'

/**
 * Encounter — bridge between Stage orchestration and P4 combat entities.
 * Stage never queries DOM; it reads entity state from the battle bridge.
 */
export interface EncounterRuntime {
  start(): void
  update(deltaMs: number): void
  isComplete(): boolean
  getAliveEnemies(): RealtimeBattleEntity[]
  getDefeatedCount(): number
  getTotalSpawned(): number
}

export class WaveEncounterRuntime implements EncounterRuntime {
  private started = false
  private totalSpawned = 0
  private defeatedCount = 0
  private lastAliveCount = 0
  private getEnemies: () => RealtimeBattleEntity[]
  private onWaveCleared?: () => void

  constructor(getEnemies: () => RealtimeBattleEntity[], onWaveCleared?: () => void) {
    this.getEnemies = getEnemies
    this.onWaveCleared = onWaveCleared
  }

  start(): void {
    this.started = true
    this.totalSpawned = this.getEnemies().filter((e) => e.state !== 'dead').length
    this.lastAliveCount = this.totalSpawned
  }

  update(_deltaMs: number): void {
    if (!this.started) return
    const alive = this.getAliveEnemies()
    if (alive.length < this.lastAliveCount && alive.length === 0) {
      this.onWaveCleared?.()
    }
    this.lastAliveCount = alive.length
    this.defeatedCount = this.getEnemies().filter((e) => e.state === 'dead').length
  }

  isComplete(): boolean {
    return this.getAliveEnemies().length === 0
  }

  getAliveEnemies(): RealtimeBattleEntity[] {
    return this.getEnemies().filter((e) => e.hp > 0 && e.state !== 'dead')
  }

  getDefeatedCount(): number {
    return this.defeatedCount
  }

  getTotalSpawned(): number {
    return this.totalSpawned
  }

  noteSpawned(count: number): void {
    this.totalSpawned += count
    this.lastAliveCount = this.getAliveEnemies().length
  }
}
