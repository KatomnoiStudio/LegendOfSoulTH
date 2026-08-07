import type { AttackDefinition } from './attacks'
import {
  getExecutePhase,
  getMovePhase,
  type MovePhase,
  resolveInterruptible,
} from './combatMoveSchema'
import type { ComboState } from './ComboSystem'
import type { SkillState } from './SkillSystem'
import type { RealtimeBattleEntity } from './types'

export function getPlayerAttackPhase(
  attack: AttackDefinition,
  sinceStartMs: number,
): MovePhase | 'complete' {
  return getMovePhase(attack, sinceStartMs)
}

export function getPlayerSkillPhase(
  attack: AttackDefinition,
  sinceStartMs: number,
): MovePhase | 'complete' {
  return getMovePhase(attack, sinceStartMs)
}

export function getEnemyExecutePhase(
  attack: AttackDefinition,
  executeElapsedMs: number,
): MovePhase | 'complete' {
  return getExecutePhase(attack, executeElapsedMs)
}

/** Returns true when incoming hit should cancel the entity's current move. */
export function shouldInterruptMove(
  attack: AttackDefinition,
  phase: MovePhase | 'complete',
): boolean {
  if (phase === 'complete') return false
  return resolveInterruptible(attack, phase)
}

export function interruptPlayerCombo(player: RealtimeBattleEntity, combo: ComboState): void {
  combo.attack = null
  combo.chainIndex = 0
  combo.sinceStartMs = 0
  combo.sinceLastFinishMs = 0
  combo.bufferedInputAgeMs = null
  combo.hitTargets.clear()
  combo.hitStopRemainingMs = 0
  if (player.state === 'attack') player.state = 'hit'
  player.velocity = { x: 0, y: 0 }
}

export function interruptPlayerSkill(player: RealtimeBattleEntity, skill: SkillState): void {
  skill.definition = null
  skill.sinceStartMs = 0
  skill.hitTargets.clear()
  skill.lockedTargetId = null
  skill.strikeHits.clear()
  if (player.state === 'skill') player.state = 'hit'
  player.velocity = { x: 0, y: 0 }
}
