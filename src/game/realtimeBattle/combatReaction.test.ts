import { describe, expect, it } from 'vitest'
import { MONKEY_GOLDEN_FURY, PLAYER_ATTACK_CHAIN } from './attacks'
import { applyCombatReaction, canApplyKnockdown, tickKnockdownState } from './combatReaction'
import type { RealtimeBattleEntity } from './types'

function entity(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 't1',
    entityType: 'enemy',
    name: 'test',
    position: { x: 100, y: 100 },
    velocity: { x: 0, y: 0 },
    facing: 'left',
    combatFacing: 'left',
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
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    ...overrides,
  }
}

describe('combatReaction', () => {
  const attacker = entity({ id: 'atk', entityType: 'player', combatFacing: 'right' })

  it('applies 200ms hitstun on normal hit', () => {
    const target = entity()
    applyCombatReaction({
      attacker,
      target,
      attack: PLAYER_ATTACK_CHAIN[0],
      elapsedMs: 1000,
      random: () => 0.5,
    })
    expect(target.state).toBe('hit')
    expect(target.hitStunRemainingMs).toBe(200)
  })

  it('mob cannot be knocked down even with knockdown move', () => {
    const target = entity({ combatTier: 'mob' })
    expect(canApplyKnockdown(target, PLAYER_ATTACK_CHAIN[2])).toBe(false)
  })

  it('elite can be knocked down by flagged move', () => {
    const target = entity({ combatTier: 'elite' })
    expect(canApplyKnockdown(target, PLAYER_ATTACK_CHAIN[2])).toBe(true)

    applyCombatReaction({
      attacker,
      target,
      attack: PLAYER_ATTACK_CHAIN[2],
      elapsedMs: 0,
      random: () => 0.5,
    })
    expect(target.state).toBe('knockdown')
    expect(target.knockdownRemainingMs).toBeGreaterThan(0)
  })

  it('knockdown → getUp → idle restores control', () => {
    const target = entity({ combatTier: 'elite', state: 'knockdown', knockdownRemainingMs: 50 })
    tickKnockdownState(target, 60, 100)
    expect(target.state).toBe('getUp')
    expect(target.getUpRemainingMs).toBeGreaterThan(0)

    tickKnockdownState(target, 500, 600)
    expect(target.state).toBe('idle')
  })

  it('ultimate high damage can defeat mob without knockdown state', () => {
    const target = entity({ combatTier: 'mob', hp: 500, maxHp: 500 })
    applyCombatReaction({
      attacker,
      target,
      attack: MONKEY_GOLDEN_FURY,
      elapsedMs: 0,
      random: () => 0.5,
    })
    expect(['hit', 'dead']).toContain(target.state)
    expect(target.state).not.toBe('knockdown')
  })
})
