import { describe, expect, it } from 'vitest'
import { findNearestLivingEnemy } from './softTarget'
import type { RealtimeBattleEntity } from './types'

function enemy(id: string, x: number, hp = 100): RealtimeBattleEntity {
  return {
    id,
    entityType: 'enemy',
    name: id,
    position: { x, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'left',
    combatFacing: 'left',
    state: 'idle',
    hp,
    maxHp: hp,
    atk: 20,
    def: 5,
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
  }
}

describe('softTarget', () => {
  const playerPos = { x: 0, y: 0 }

  it('picks nearest living enemy', () => {
    const enemies = [enemy('far', 500), enemy('near', 80), enemy('dead', 50, 0)]
    const nearest = findNearestLivingEnemy(playerPos, enemies)
    expect(nearest?.id).toBe('near')
  })

  it('switches target when nearest dies', () => {
    const enemies = [enemy('a', 60), enemy('b', 120)]
    const first = findNearestLivingEnemy(playerPos, enemies)
    enemies[0].hp = 0
    enemies[0].state = 'dead'
    const second = findNearestLivingEnemy(playerPos, enemies)
    expect(first?.id).toBe('a')
    expect(second?.id).toBe('b')
  })
})
