import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPvPAuthorityState } from '../game/pvp/PvPAuthorityEngine'
import { createRankedPlayerEntity } from '../game/pvp/rankedNormalization'
import { createDefaultSkillLevels } from '../game/realtimeBattle/SkillProgressionSystem'
import { EMPTY_PROGRESS, type Player } from '../types/player'
import { usePvPRoom } from './usePvPRoom'

const mocks = vi.hoisted(() => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  invokeAuthority: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
}))

vi.mock('../game/pvp/pvpRoomRepository.supabase', () => ({
  createPrivatePvPRoom: mocks.createRoom,
  joinPrivatePvPRoom: mocks.joinRoom,
  invokePvPAuthority: mocks.invokeAuthority,
  subscribeToPrivatePvPRoom: mocks.subscribe,
}))

function player(id: string): Player {
  return {
    id,
    uid: id,
    name: id,
    title: '',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 1,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-08-09T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
        star: 1,
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

describe('usePvPRoom reliable authority input', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.createRoom.mockReset()
    mocks.joinRoom.mockReset()
    mocks.invokeAuthority.mockReset()
    mocks.subscribe.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('retries the identical sequence and button press after a failed POST', async () => {
    const host = player('host')
    const guest = player('guest')
    const authority = createPvPAuthorityState(
      'room-1',
      { playerId: host.id, entity: createRankedPlayerEntity(host)! },
      { playerId: guest.id, entity: createRankedPlayerEntity(guest)! },
      Date.now(),
    )
    mocks.createRoom.mockResolvedValue({
      roomId: 'room-1',
      roomCode: 'ABC2D3',
      status: 'active',
      hostPlayerId: host.id,
      guestPlayerId: guest.id,
      hostHeroId: 'monkey-king',
      guestHeroId: 'monkey-king',
      stateVersion: 0,
      authoritativeState: authority,
    })
    let inputAttempts = 0
    mocks.invokeAuthority.mockImplementation(
      (_roomId: string, command: { action: string; sequence?: number }) => {
        if (command.action !== 'input') {
          return Promise.resolve({ stateVersion: 1, authoritativeState: authority, result: null })
        }
        inputAttempts += 1
        if (inputAttempts === 1) return Promise.reject(new Error('network dropped'))
        const acknowledged = structuredClone(authority)
        acknowledged.participants[0].lastProcessedSequence = command.sequence ?? 0
        return Promise.resolve({
          stateVersion: 2,
          authoritativeState: acknowledged,
          result: null,
        })
      },
    )

    const { result, unmount } = renderHook(() => usePvPRoom(host))
    await act(async () => {
      await result.current.createRoom('monkey-king')
    })
    act(() => result.current.pressAttack())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    const inputCalls = mocks.invokeAuthority.mock.calls.filter(
      ([, command]) => command.action === 'input',
    )
    expect(inputCalls).toHaveLength(2)
    expect(inputCalls[0]?.[1]).toEqual(inputCalls[1]?.[1])
    expect(inputCalls[1]?.[1]).toMatchObject({
      sequence: 1,
      input: { basicAttackPressed: true },
    })
    unmount()
  })
})
