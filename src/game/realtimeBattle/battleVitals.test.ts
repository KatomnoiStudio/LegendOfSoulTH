import { describe, expect, it } from 'vitest'
import { applyCombatReaction } from './combatReaction'
import { ENEMY_ATTACK_MELEE } from './attacks'
import { createRealtimeBattle } from './createRealtimeBattle'
import { deriveHpRatio, selectPrimaryEnemyHpTarget } from './battleVitals'
import { RealtimeBattleRuntime } from './RealtimeBattleRuntime'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'
import type { RealtimeBattleEntity } from './types'

function makePlayer(star = 1): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'ผู้ทดสอบ',
    title: 'นักเดินทาง',
    level: 10,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 12,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
        star,
        shards: 0,
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

function entity(
  partial: Partial<RealtimeBattleEntity> & Pick<RealtimeBattleEntity, 'id'>,
): RealtimeBattleEntity {
  return {
    entityType: 'enemy',
    name: 'ศัตรู',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'left',
    combatFacing: 'left',
    state: 'idle',
    hp: 100,
    maxHp: 100,
    atk: 10,
    def: 5,
    speed: 100,
    collisionRadius: 30,
    hurtboxRadius: 40,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    ...partial,
  }
}

describe('deriveHpRatio', () => {
  it('HP 334 damage 50 → runtime/snapshot/HUD ratio = 284/334', () => {
    const maxHp = 334
    const damage = 50
    const runtimeHp = maxHp - damage

    expect(deriveHpRatio(runtimeHp, maxHp)).toBeCloseTo(284 / 334, 5)

    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('missing battle state')
    state.player.hp = runtimeHp
    state.player.maxHp = maxHp
    const runtime = new RealtimeBattleRuntime(state)
    runtime.publish()

    const snapshot = runtime.getSnapshot()
    expect(snapshot.player.hp).toBe(284)
    expect(snapshot.player.maxHp).toBe(334)
    expect(deriveHpRatio(snapshot.player.hp, snapshot.player.maxHp)).toBeCloseTo(284 / 334, 5)
  })

  it('clamps ratio to [0, 1]', () => {
    expect(deriveHpRatio(-5, 100)).toBe(0)
    expect(deriveHpRatio(0, 100)).toBe(0)
    expect(deriveHpRatio(150, 100)).toBe(1)
    expect(deriveHpRatio(50, 0)).toBe(0)
  })
})

describe('RealtimeBattleRuntime HP → snapshot sync', () => {
  it('applies the locked ★6 multiplier to authoritative battle stats', () => {
    const star1 = createRealtimeBattle('trial-01', makePlayer(1))
    const star6 = createRealtimeBattle('trial-01', makePlayer(6))
    if (!star1 || !star6) throw new Error('missing battle state')

    expect(star6.player.maxHp).toBe(Math.floor(star1.player.maxHp * 1.3))
    expect(star6.player.atk).toBe(Math.floor(star1.player.atk * 1.3))
    expect(star6.player.def).toBe(Math.floor(star1.player.def * 1.3))
  })

  it('enemy hit on player publishes snapshot HP for HUD', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('missing battle state')
    const runtime = new RealtimeBattleRuntime(state, () => 0)
    runtime.step(1000)

    const player = runtime.getState().player
    const hpBefore = player.hp
    const enemy = runtime.getState().enemies[0]
    enemy.position = { x: player.position.x + 40, y: player.position.y }

    for (let t = 0; t < 4000; t += 16) {
      runtime.step(16)
      if (player.hp < hpBefore) break
    }

    expect(player.hp).toBeLessThan(hpBefore)
    expect(runtime.getSnapshot().player.hp).toBe(player.hp)
    expect(deriveHpRatio(runtime.getSnapshot().player.hp, runtime.getSnapshot().player.maxHp)).toBe(
      deriveHpRatio(player.hp, player.maxHp),
    )
  })

  it('environmental damage publishes snapshot HP', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('missing battle state')
    const runtime = new RealtimeBattleRuntime(state)
    runtime.step(1000)

    const before = runtime.getState().player.hp
    runtime.applyEnvironmentalDamage(25)

    expect(runtime.getSnapshot().player.hp).toBe(before - 25)
  })

  it('heal updates snapshot HP ratio', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('missing battle state')
    state.player.hp = 200
    const runtime = new RealtimeBattleRuntime(state)
    state.player.hp = 260
    runtime.publish()

    expect(
      deriveHpRatio(runtime.getSnapshot().player.hp, runtime.getSnapshot().player.maxHp),
    ).toBeCloseTo(260 / state.player.maxHp, 5)
  })

  it('death zeroes HUD ratio', () => {
    const state = createRealtimeBattle('trial-01', makePlayer())
    if (!state) throw new Error('missing battle state')
    const runtime = new RealtimeBattleRuntime(state)
    state.player.hp = 0
    state.player.state = 'dead'
    runtime.publish()

    expect(deriveHpRatio(runtime.getSnapshot().player.hp, runtime.getSnapshot().player.maxHp)).toBe(
      0,
    )
  })

  it('selectPrimaryEnemyHpTarget skips dead enemies', () => {
    const enemies = [
      entity({ id: 'a', hp: 0, state: 'dead' }),
      entity({ id: 'b', hp: 80, maxHp: 100, state: 'hit' }),
    ]
    expect(selectPrimaryEnemyHpTarget(enemies)?.id).toBe('b')
  })

  it('combat reaction damage matches snapshot enemy HP', () => {
    const attacker = entity({ id: 'p', entityType: 'player', atk: 50 })
    const target = entity({ id: 'e', hp: 334, maxHp: 334, def: 0 })
    const outcome = applyCombatReaction({
      attacker,
      target,
      attack: ENEMY_ATTACK_MELEE,
      elapsedMs: 1000,
      random: () => 0.5,
    })

    expect(target.hp).toBe(334 - outcome.amount)
    expect(deriveHpRatio(target.hp, target.maxHp)).toBeCloseTo(target.hp / 334, 5)
  })
})
