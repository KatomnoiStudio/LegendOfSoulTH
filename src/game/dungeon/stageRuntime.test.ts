import { describe, expect, it } from 'vitest'
import { P5_TEST_DUNGEON } from './dungeonConfig'
import { DungeonOrchestrator } from './dungeonOrchestrator'
import { StageRuntime } from './stageRuntime'
import { createTestBattleBridge } from './stageBattleBridge'
import { P5_STAGE_TYPE_FIXTURES } from './dungeonConfig'
import type { SurvivalParams } from './dungeonSchema'
import type { RealtimeBattleEntity } from '../realtimeBattle/types'
import { createWaveEnemies } from '../realtimeBattle/createRealtimeBattle'

function player(): RealtimeBattleEntity {
  return {
    id: 'player',
    entityType: 'player',
    name: 'Hero',
    position: { x: 400, y: 550 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    combatFacing: 'right',
    state: 'idle',
    hp: 500,
    maxHp: 500,
    atk: 80,
    def: 50,
    speed: 200,
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
  }
}

describe('StageRuntime lifecycle', () => {
  it('not started → active → complete on custom win', () => {
    const bridge = createTestBattleBridge({ player: player(), enemies: [], elapsedMs: 0 })
    const runtime = new StageRuntime(P5_STAGE_TYPE_FIXTURES.custom, bridge)
    expect(runtime.getSnapshot().lifecycle).toBe('not_started')
    runtime.enter()
    expect(runtime.getSnapshot().lifecycle).toBe('active')
    const res = runtime.tick(16)
    expect(res).toBe('win')
    expect(runtime.isComplete()).toBe(true)
    expect(runtime.isCleared()).toBe(true)
  })

  it('fails on player death', () => {
    const p = player()
    p.state = 'dead'
    p.hp = 0
    const bridge = createTestBattleBridge({ player: p, enemies: [], elapsedMs: 0 })
    const runtime = new StageRuntime(P5_STAGE_TYPE_FIXTURES.custom, bridge)
    runtime.enter()
    const res = runtime.tick(16)
    expect(res).toBe('lose')
    expect(runtime.isFailed()).toBe(true)
  })

  it('cannot restart after complete', () => {
    const bridge = createTestBattleBridge({ player: player(), enemies: [], elapsedMs: 0 })
    const runtime = new StageRuntime(P5_STAGE_TYPE_FIXTURES.custom, bridge)
    runtime.enter()
    runtime.tick(16)
    const res = runtime.tick(16)
    expect(res).toBe('continue')
  })
})

describe('DungeonOrchestrator', () => {
  it('starts dungeon run', () => {
    const orch = new DungeonOrchestrator(P5_TEST_DUNGEON, {
      teamSlots: ['monkey-king', null, null, null],
      ownedCharacters: [
        {
          characterId: 'monkey-king',
          level: 10,
          exp: 0,
          expToNext: 100,
        },
      ],
      progress: { flags: {}, battleHistory: [] },
      name: 'Test',
      gold: 0,
      gems: 0,
      inventory: [],
      friends: [],
    } as never)
    expect(orch.start()).toBe(true)
    expect(orch.getSnapshot().phase).toBe('stage_active')
    orch.dispose()
  })

  it('passes survival enemyHpScale through orchestrator to every spawned enemy', () => {
    const stage = P5_TEST_DUNGEON.stages[0]
    const orch = new DungeonOrchestrator(P5_TEST_DUNGEON, {
      teamSlots: ['monkey-king', null, null, null],
      ownedCharacters: [
        {
          characterId: 'monkey-king',
          level: 10,
          exp: 0,
          expToNext: 100,
        },
      ],
      progress: { flags: {}, battleHistory: [] },
      name: 'Test',
      gold: 0,
      gems: 0,
      inventory: [],
      friends: [],
    } as never)

    expect(orch.loadStage(stage)).toBe(true)
    const runtime = orch.getRuntime()
    if (!runtime) throw new Error('runtime was not created')

    // Read the scale from its one definition (dungeonConfig) rather than restating the
    // literal — retuning the stage must not turn this test red. NOT read from
    // `state.enemyHpScale`: that is the value under test, and asserting it against itself
    // would go green on exactly the bug this covers (the orchestrator forwarding 1).
    const scale = (stage.params as SurvivalParams).enemyHpScale ?? 1

    const state = runtime.getState()
    expect(state.enemyHpScale).toBe(scale)

    const initialUnscaled = createWaveEnemies(state.stage, 0, 1)
    expect(state.enemies).toHaveLength(initialUnscaled.length)
    expect(state.enemies.map((enemy) => enemy.maxHp)).toEqual(
      initialUnscaled.map((enemy) => Math.max(1, Math.round(enemy.maxHp * scale))),
    )

    const nextUnscaled = createWaveEnemies(state.stage, 1, 1)
    const initialCount = state.enemies.length
    expect(runtime.spawnWaveAt(1)).toBe(nextUnscaled.length)
    expect(state.enemies.slice(initialCount).map((enemy) => enemy.maxHp)).toEqual(
      nextUnscaled.map((enemy) => Math.max(1, Math.round(enemy.maxHp * scale))),
    )
    orch.dispose()
  })
})
