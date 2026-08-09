import { describe, expect, it } from 'vitest'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import { createRealtimeBattle } from './createRealtimeBattle'
import { RealtimeBattleRuntime } from './RealtimeBattleRuntime'
import { EMPTY_PROGRESS, type Player } from '../../types/player'

function erlangPlayer(): Player {
  return {
    id: 'erlang-account',
    uid: 'erlang-test',
    name: 'Erlang test',
    title: 'Tester',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'spear-warrior',
        level: 1,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-08-09T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['spear-warrior', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

describe('Erlang Shen Skill 2 runtime event', () => {
  it('starts the dedicated three-hound cast and consumes its cooldown', () => {
    const state = createRealtimeBattle('trial-01', erlangPlayer())
    if (!state) throw new Error('expected battle state')
    const runtime = new RealtimeBattleRuntime(state)

    runtime.step(1000)
    runtime.requestSkill('skill2')
    runtime.step(16)

    expect(runtime.getSnapshot().castingSkillSlot).toBe('skill2')
    expect(runtime.getSnapshot().player.skillCooldownsMs.skill2).toBeGreaterThan(0)
    expect(runtime.getSnapshot().effectEvents.map((event) => event.kind)).toContain('erlang-hound')

    runtime.step(1500)
    expect(runtime.getSnapshot().effectEvents.map((event) => event.kind)).toContain('erlang-hound')
  })
})
