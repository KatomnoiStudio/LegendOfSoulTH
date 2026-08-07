import { describe, expect, it } from 'vitest'
import { PLAYER_ATTACK_CHAIN } from './attacks'
import { createComboState, pressAttack } from './ComboSystem'
import { getPlayerAttackPhase, interruptPlayerCombo, shouldInterruptMove } from './combatInterrupt'
import { createSkillState, isSkillPhaseInterruptible, startSkill } from './SkillSystem'
import { REALTIME_CHARACTER_KITS } from './skills'
import type { RealtimeBattleEntity } from './types'

function player(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'player',
    entityType: 'player',
    name: 'p',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    combatFacing: 'right',
    state: 'idle',
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 10,
    speed: 100,
    collisionRadius: 30,
    hurtboxRadius: 36,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 100,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    characterId: 'monkey-king',
    ...overrides,
  }
}

describe('combatInterrupt', () => {
  it('interruptible move is cancelled on hit during startup', () => {
    const p = player()
    const combo = createComboState()
    pressAttack(p, combo)
    const phase = getPlayerAttackPhase(combo.attack!, combo.sinceStartMs)
    expect(shouldInterruptMove(combo.attack!, phase)).toBe(true)

    p.hitStunRemainingMs = 50
    interruptPlayerCombo(p, combo)
    expect(combo.attack).toBeNull()
    expect(p.state).toBe('hit')
  })

  it('ultimate setup is not interruptible during startup', () => {
    const p = player()
    const skill = createSkillState()
    const ult = REALTIME_CHARACTER_KITS['monkey-king'].ultimate
    startSkill(p, skill, ult, 0, 'e1')

    expect(isSkillPhaseInterruptible(skill)).toBe(false)
  })

  it('basic attack chain first hit is interruptible in recovery', () => {
    const attack = PLAYER_ATTACK_CHAIN[0]
    const phase = getPlayerAttackPhase(attack, attack.startupMs + attack.activeMs + 10)
    expect(phase).toBe('recovery')
    expect(shouldInterruptMove(attack, phase)).toBe(true)
  })
})
