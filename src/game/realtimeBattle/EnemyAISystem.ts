import type { AttackDefinition } from './attacks'
import { getEnemyAttackById } from './attacks'
import {
  attackTotalDurationMs,
  isExecuteActiveWindow,
  resolveTelegraphMs,
} from './combatMoveSchema'
import { faceTargetHorizontally } from './combatFacing'
import { getEnemyTemplate, type RealtimeEnemyTemplate } from './stageConfig'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * สมองของศัตรู — P4 production loop:
 *   Observe → Evaluate → Select → Telegraph → Execute → Recover → Re-evaluate
 *
 * AI คืนเวกเตอร์เดินให้ MovementSystem เท่านั้น — ไม่อ่าน render coordinates
 */

export type EnemyAIState =
  'idle' | 'chase' | 'telegraph' | 'attack' | 'recover' | 'hit' | 'knockdown' | 'getUp' | 'dead'

export interface EnemyBrain {
  state: EnemyAIState
  stateElapsedMs: number
  hitTargets: Set<string>
  selectedAttack: AttackDefinition | null
}

export function createEnemyBrain(): EnemyBrain {
  return {
    state: 'idle',
    stateElapsedMs: 0,
    hitTargets: new Set(),
    selectedAttack: null,
  }
}

export interface EnemyDecision {
  move: Vec2
}

const RECOVER_MS = 260

const FALLBACK_RANGES = { detect: 500, attack: 80, attackCooldownMs: 1500 }

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function toState(brain: EnemyBrain, next: EnemyAIState): void {
  if (brain.state === next) return
  brain.state = next
  brain.stateElapsedMs = 0
}

function resolveRanges(template: RealtimeEnemyTemplate | null) {
  if (!template) return FALLBACK_RANGES
  return {
    detect: template.detectRange,
    attack: template.attackRange,
    attackCooldownMs: template.attackCooldownMs,
  }
}

function resolveAttack(template: RealtimeEnemyTemplate | null): AttackDefinition {
  if (!template) return getEnemyAttackById('enemy-melee')
  return getEnemyAttackById(template.attackId)
}

function executeDurationMs(attack: AttackDefinition): number {
  return attack.startupMs + attack.activeMs + attack.recoveryMs
}

function directionTowards(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: 0, y: 0 }
  return { x: dx / length, y: dy / length }
}

export function stepEnemyAI(
  enemy: RealtimeBattleEntity,
  brain: EnemyBrain,
  player: RealtimeBattleEntity,
  deltaMs: number,
): EnemyDecision {
  brain.stateElapsedMs += deltaMs

  if (enemy.hp <= 0 || enemy.state === 'dead') {
    toState(brain, 'dead')
    enemy.state = 'dead'
    return { move: { x: 0, y: 0 } }
  }

  if (enemy.state === 'knockdown' || enemy.state === 'getUp') {
    toState(brain, enemy.state === 'knockdown' ? 'knockdown' : 'getUp')
    return { move: { x: 0, y: 0 } }
  }

  if (enemy.hitStunRemainingMs > 0) {
    toState(brain, 'hit')
    brain.selectedAttack = null
    enemy.state = 'hit'
    return { move: { x: 0, y: 0 } }
  }

  const template = enemy.enemyId ? getEnemyTemplate(enemy.enemyId) : null
  const ranges = resolveRanges(template)
  const distance = distanceBetween(enemy.position, player.position)
  const playerAlive = player.hp > 0
  const attack = brain.selectedAttack ?? resolveAttack(template)

  switch (brain.state) {
    case 'telegraph': {
      enemy.state = 'attack'
      if (brain.stateElapsedMs >= resolveTelegraphMs(attack)) {
        toState(brain, 'attack')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'attack': {
      enemy.state = 'attack'
      if (brain.stateElapsedMs >= executeDurationMs(attack)) {
        brain.hitTargets.clear()
        brain.selectedAttack = null
        toState(brain, 'recover')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'recover': {
      enemy.state = 'idle'
      if (brain.stateElapsedMs >= RECOVER_MS) {
        toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'hit': {
      toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      enemy.state = 'idle'
      return { move: { x: 0, y: 0 } }
    }

    case 'knockdown':
    case 'getUp': {
      return { move: { x: 0, y: 0 } }
    }

    case 'chase': {
      if (!playerAlive || distance > ranges.detect) {
        toState(brain, 'idle')
        enemy.state = 'idle'
        return { move: { x: 0, y: 0 } }
      }

      if (distance <= ranges.attack && enemy.attackCooldownRemainingMs <= 0) {
        faceTargetHorizontally(enemy, player.position)
        brain.selectedAttack = resolveAttack(template)
        brain.hitTargets.clear()
        toState(brain, 'telegraph')
        enemy.state = 'attack'
        enemy.attackCooldownRemainingMs = ranges.attackCooldownMs
        return { move: { x: 0, y: 0 } }
      }

      if (distance <= ranges.attack) {
        enemy.state = 'idle'
        return { move: { x: 0, y: 0 } }
      }

      enemy.state = 'walk'
      return { move: directionTowards(enemy.position, player.position) }
    }

    case 'idle':
    case 'dead':
    default: {
      enemy.state = 'idle'
      if (playerAlive && distance <= ranges.detect) toState(brain, 'chase')
      return { move: { x: 0, y: 0 } }
    }
  }
}

/** True when enemy attack is in damage-active execute phase. */
export function isEnemyAttackDamageWindow(brain: EnemyBrain): boolean {
  if (brain.state !== 'attack' || !brain.selectedAttack) return false
  return isExecuteActiveWindow(brain.selectedAttack, brain.stateElapsedMs)
}

export function isEnemyTelegraphing(brain: EnemyBrain): boolean {
  return brain.state === 'telegraph'
}

export function getEnemySelectedAttack(brain: EnemyBrain): AttackDefinition | null {
  return brain.selectedAttack
}

/** @deprecated — use attack definition from brain */
export const ENEMY_ATTACK_TIMING = {
  startupMs: 120,
  activeMs: 140,
  recoveryMs: 420,
} as const

export function enemyAttackTotalMs(attack: AttackDefinition): number {
  return attackTotalDurationMs(attack)
}
