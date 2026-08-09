import { describe, expect, test } from 'vitest'
import type { OwnedCharacter, Player } from '../../types/player'
import { createEmptyPlayerInputState } from '../realtimeBattle/playerInput'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import { createPvPAuthorityState, PVP_FIXED_TICK_MS } from './PvPAuthorityEngine'
import { runPvPAuthorityCommand } from './PvPAuthorityService'
import { createRankedPlayerEntity } from './rankedNormalization'

function player(id: string): Player {
  const hero: OwnedCharacter = {
    characterId: 'monkey-king',
    level: 1,
    exp: 0,
    expToNext: 100,
    obtainedAt: '2026-08-09T00:00:00.000Z',
    skillLevels: createDefaultSkillLevels(),
    star: 1,
    shards: 0,
  }
  return {
    id,
    uid: id,
    name: id,
    title: '',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [hero],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
  }
}

function state() {
  const host = createRankedPlayerEntity(player('host'))!
  const guest = createRankedPlayerEntity(player('guest'))!
  return createPvPAuthorityState(
    'match-service',
    { playerId: 'host', entity: host },
    { playerId: 'guest', entity: guest },
    1_000,
  )
}

describe('PvPAuthorityService trust boundary', () => {
  test('server identity replaces client identity and clamps movement axes', () => {
    const next = runPvPAuthorityCommand(
      state(),
      'host',
      {
        action: 'input',
        sequence: 1,
        clientTick: 1,
        input: { ...createEmptyPlayerInputState(), moveX: 99, moveDepth: -99 },
      },
      1_000 + PVP_FIXED_TICK_MS,
    )
    expect(next.participants[0].latestInput.moveX).toBe(1)
    expect(next.participants[0].latestInput.moveDepth).toBe(-1)
    expect(next.participants[1].lastProcessedSequence).toBe(0)
  })

  test('spam cannot advance simulation faster than trusted server time', () => {
    const initial = state()
    const command = {
      action: 'input' as const,
      sequence: 1,
      clientTick: 1,
      input: { ...createEmptyPlayerInputState(), basicAttackPressed: true },
    }
    const first = runPvPAuthorityCommand(initial, 'host', command, 1_010)
    const spam = runPvPAuthorityCommand(
      first,
      'host',
      { ...command, sequence: 2, clientTick: 2 },
      1_020,
    )

    expect(first.tick).toBe(0)
    expect(spam.tick).toBe(0)
    expect(spam.participants[0].pendingActions).toEqual(['attack', 'attack'])
  })

  test('rejects non-participants and implausible sequence jumps', () => {
    const initial = state()
    const command = {
      action: 'input' as const,
      sequence: 121,
      clientTick: 1,
      input: createEmptyPlayerInputState(),
    }
    expect(() => runPvPAuthorityCommand(initial, 'intruder', command, 2_000)).toThrow(
      'PVP_NOT_A_PARTICIPANT',
    )
    expect(() => runPvPAuthorityCommand(initial, 'host', command, 2_000)).toThrow(
      'PVP_INPUT_SEQUENCE_GAP',
    )
  })
})
