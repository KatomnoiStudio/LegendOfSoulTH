import type { CombatSummary } from '../dungeon/dungeonSchema'
import type { RealtimeBattleState } from '../realtimeBattle/createRealtimeBattle'

export interface CombatAccumulator {
  enemiesDefeated: number
  elitesDefeated: number
  bossesDefeated: number
  damageDealt: number
  damageTaken: number
}

export function createCombatAccumulator(): CombatAccumulator {
  return {
    enemiesDefeated: 0,
    elitesDefeated: 0,
    bossesDefeated: 0,
    damageDealt: 0,
    damageTaken: 0,
  }
}

export function mergeBattleStateIntoAccumulator(
  acc: CombatAccumulator,
  state: RealtimeBattleState,
): CombatAccumulator {
  const next = { ...acc }
  next.damageDealt += state.damageDealt
  next.damageTaken += state.damageTaken

  for (const enemy of state.enemies) {
    if (enemy.state !== 'dead' && enemy.hp > 0) continue
    next.enemiesDefeated += 1
    if (enemy.combatTier === 'elite') next.elitesDefeated += 1
    if (enemy.combatTier === 'boss' || enemy.entityType === 'boss') {
      next.bossesDefeated += 1
    }
  }

  return next
}

export function toCombatSummary(acc: CombatAccumulator): CombatSummary {
  return {
    enemiesDefeated: acc.enemiesDefeated,
    elitesDefeated: acc.elitesDefeated,
    bossesDefeated: acc.bossesDefeated,
    damageDealt: acc.damageDealt,
    damageTaken: acc.damageTaken,
  }
}
