import { describe, expect, it } from 'vitest'
import { P5_STAGE_TYPE_FIXTURES } from './dungeonConfig'
import { createTestBattleBridge } from './stageBattleBridge'
import {
  ChaseObjective,
  CustomObjective,
  DefendObjective,
  HazardObjective,
  MiniBossObjective,
  SurvivalObjective,
  TimeAttackObjective,
} from './stageObjectives'
import type { RealtimeBattleEntity } from '../realtimeBattle/types'

function entity(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'e1',
    entityType: 'enemy',
    name: 'Enemy',
    position: { x: 900, y: 550 },
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
    hurtboxRadius: 35,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    enemyId: 'shadow-soldier',
    ...overrides,
  }
}

function player(): RealtimeBattleEntity {
  return entity({
    id: 'player',
    entityType: 'player',
    name: 'Hero',
    position: { x: 400, y: 550 },
    enemyId: undefined,
  })
}

describe('SurvivalObjective', () => {
  it('does not complete before final wave cleared', () => {
    const enemies = [entity()]
    const bridge = createTestBattleBridge({ player: player(), enemies, elapsedMs: 0 })
    const obj = new SurvivalObjective({ totalWaves: 2, waveIntervalMs: 100 }, bridge)
    obj.start()
    enemies[0].hp = 0
    enemies[0].state = 'dead'
    obj.update({ bridge, deltaMs: 16, stageElapsedMs: 16 })
    expect(obj.isComplete()).toBe(false)
  })
})

describe('DefendObjective', () => {
  it('wins when timer expires and objective alive', () => {
    const bridge = createTestBattleBridge({ player: player(), enemies: [], elapsedMs: 0 })
    const obj = new DefendObjective({ objectiveHP: 50, timeLimitMs: 1000 }, bridge)
    obj.start()
    obj.update({ bridge, deltaMs: 1100, stageElapsedMs: 1100 })
    expect(obj.isComplete()).toBe(true)
  })

  it('loses when objective destroyed', () => {
    const bridge = createTestBattleBridge({
      player: player(),
      enemies: [entity(), entity({ id: 'e2' })],
      elapsedMs: 0,
    })
    const obj = new DefendObjective({ objectiveHP: 1, timeLimitMs: 10_000 }, bridge)
    obj.start()
    for (let i = 0; i < 50; i++) {
      obj.update({ bridge, deltaMs: 100, stageElapsedMs: i * 100 })
    }
    expect(obj.isFailed()).toBe(true)
  })
})

describe('ChaseObjective', () => {
  it('fails when target escapes', () => {
    const target = entity({ id: 'target', position: { x: 250, y: 550 } })
    const bridge = createTestBattleBridge({ player: player(), enemies: [target], elapsedMs: 0 })
    const obj = new ChaseObjective(
      { targetTemplateId: 'shadow-soldier', escapeThresholdX: 300 },
      bridge,
    )
    obj.start()
    obj.update({ bridge, deltaMs: 16, stageElapsedMs: 16 })
    expect(obj.isFailed()).toBe(true)
  })

  it('wins when target defeated', () => {
    const target = entity({ id: 'target', hp: 0, state: 'dead' })
    const bridge = createTestBattleBridge({ player: player(), enemies: [target], elapsedMs: 0 })
    const obj = new ChaseObjective({ targetTemplateId: 'shadow-soldier' }, bridge)
    obj.start()
    expect(obj.isComplete()).toBe(true)
  })
})

describe('HazardObjective', () => {
  it('applies hazard damage outside safe zone', () => {
    const p = player()
    p.position.y = 900
    const bridge = createTestBattleBridge({ player: p, enemies: [entity()], elapsedMs: 0 })
    const obj = new HazardObjective(
      { hazardDamagePerSec: 20, safeZoneCenterY: 550, safeZoneRadius: 100 },
      bridge,
    )
    obj.start()
    const hpBefore = p.hp
    obj.update({ bridge, deltaMs: 600, stageElapsedMs: 600 })
    expect(p.hp).toBeLessThan(hpBefore)
  })

  it('cleans up hazard on cleanup', () => {
    const bridge = createTestBattleBridge({ player: player(), enemies: [], elapsedMs: 0 })
    const obj = new HazardObjective({}, bridge)
    obj.start()
    obj.cleanup()
    expect(obj.getProgress().current).toBe(0)
  })
})

describe('MiniBossObjective', () => {
  it('completes when boss dies', () => {
    const boss = entity({ id: 'boss', enemyId: 'demon-captain', hp: 0, state: 'dead' })
    const bridge = createTestBattleBridge({ player: player(), enemies: [boss], elapsedMs: 0 })
    const obj = new MiniBossObjective({ bossTemplateId: 'demon-captain' }, bridge)
    obj.start()
    expect(obj.isComplete()).toBe(true)
  })
})

describe('TimeAttackObjective', () => {
  it('completes when all enemies defeated', () => {
    const dead = entity({ hp: 0, state: 'dead' })
    const bridge = createTestBattleBridge({ player: player(), enemies: [dead], elapsedMs: 0 })
    const obj = new TimeAttackObjective({}, bridge)
    obj.start()
    obj.update({ bridge, deltaMs: 16, stageElapsedMs: 16 })
    expect(obj.isComplete()).toBe(true)
  })
})

describe('CustomObjective', () => {
  it('resolves instant-win ruleset', () => {
    const bridge = createTestBattleBridge({ player: player(), enemies: [], elapsedMs: 0 })
    const obj = new CustomObjective({ rulesetId: 'instant-win' }, bridge)
    obj.start()
    obj.update({ bridge, deltaMs: 16, stageElapsedMs: 16 })
    expect(obj.isComplete()).toBe(true)
  })

  it('fails safely on unknown ruleset', () => {
    const bridge = createTestBattleBridge({ player: player(), enemies: [], elapsedMs: 0 })
    const obj = new CustomObjective({ rulesetId: 'does-not-exist' }, bridge)
    obj.start()
    expect(obj.isFailed()).toBe(true)
  })
})

describe('P5 stage type fixtures', () => {
  it('has all 7 stage types', () => {
    expect(Object.keys(P5_STAGE_TYPE_FIXTURES)).toHaveLength(7)
  })
})
