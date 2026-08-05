import type { BattleAction, BattleSnapshot } from './types'
import { getActiveUnit, getValidTargets } from './engine'

export function pickEnemyAction(snapshot: BattleSnapshot): BattleAction | null {
  const actor = getActiveUnit(snapshot)
  if (!actor || actor.isAlly) return null

  const targets = getValidTargets(snapshot, actor.id, 'attack')
  if (targets.length === 0) return null

  if (actor.hp / actor.maxHp < 0.3 && Math.random() < 0.35) {
    return { kind: 'defend', actorId: actor.id, targetId: actor.id }
  }

  const weakest = targets.reduce((best, unit) => (unit.hp < best.hp ? unit : best))
  return { kind: 'attack', actorId: actor.id, targetId: weakest.id }
}
