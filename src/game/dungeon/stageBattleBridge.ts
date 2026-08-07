import type { RealtimeBattleRuntime } from '../realtimeBattle/RealtimeBattleRuntime'
import { createWaveEnemies } from '../realtimeBattle/createRealtimeBattle'
import type { RealtimeBattleEntity } from '../realtimeBattle/types'

/**
 * Thin adapter — Stage orchestration talks to P4 combat through this bridge only.
 * No damage/AI/targeting logic here.
 */
export interface StageBattleBridge {
  getPlayer(): RealtimeBattleEntity
  getEnemies(): RealtimeBattleEntity[]
  getAliveEnemies(): RealtimeBattleEntity[]
  isPlayerDead(): boolean
  getElapsedMs(): number
  setAutoWaveAdvance(enabled: boolean): void
  spawnWave(waveIndex: number): number
  forceVictory(): void
  forceDefeat(): void
  applyHazardDamage(amount: number): void
  moveEnemyTo(enemyId: string, x: number, y: number): void
}

export function createStageBattleBridge(runtime: RealtimeBattleRuntime): StageBattleBridge {
  return {
    getPlayer: () => runtime.getState().player,
    getEnemies: () => runtime.getState().enemies,
    getAliveEnemies: () => runtime.getState().enemies.filter((e) => e.hp > 0 && e.state !== 'dead'),
    isPlayerDead: () =>
      runtime.getState().player.state === 'dead' || runtime.getState().player.hp <= 0,
    getElapsedMs: () => runtime.getState().elapsedMs,
    setAutoWaveAdvance: (enabled) => runtime.setAutoWaveAdvance(enabled),
    spawnWave: (waveIndex) => runtime.spawnWaveAt(waveIndex),
    forceVictory: () => runtime.forceVictory(),
    forceDefeat: () => runtime.forceDefeat(),
    applyHazardDamage: (amount) => runtime.applyEnvironmentalDamage(amount),
    moveEnemyTo: (enemyId, x, y) => runtime.moveEntityTo(enemyId, x, y),
  }
}

/** Test-only bridge from mutable state */
export function createTestBattleBridge(state: {
  player: RealtimeBattleEntity
  enemies: RealtimeBattleEntity[]
  elapsedMs: number
}): StageBattleBridge {
  return {
    getPlayer: () => state.player,
    getEnemies: () => state.enemies,
    getAliveEnemies: () => state.enemies.filter((e) => e.hp > 0 && e.state !== 'dead'),
    isPlayerDead: () => state.player.state === 'dead' || state.player.hp <= 0,
    getElapsedMs: () => state.elapsedMs,
    setAutoWaveAdvance: () => {},
    spawnWave: () => 0,
    forceVictory: () => {},
    forceDefeat: () => {},
    applyHazardDamage: (amount) => {
      state.player.hp = Math.max(0, state.player.hp - amount)
      if (state.player.hp <= 0) state.player.state = 'dead'
    },
    moveEnemyTo: (enemyId, x, y) => {
      const enemy = state.enemies.find((e) => e.id === enemyId)
      if (enemy) {
        enemy.position.x = x
        enemy.position.y = y
      }
    },
  }
}

export { createWaveEnemies }
