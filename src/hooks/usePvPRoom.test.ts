import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

/*
  ── 2026-08-19 gold-standard audit, rank 12 — reports the server log cannot be joined to ──

  `pvp-authority` logs `roomId` and `playerId` on every failure branch it owns. The client
  reported the same failures with the cause and nothing else, so a client-side PVP_INPUT_FAIL
  and the server line that explains it had no field in common — the two halves of one incident
  sat in two places with no way to match them.

  Structural rather than behavioural: the defect is a missing argument at a call site, not a
  wrong value flowing through one. Driving each branch would need four separate rejection
  scenarios to assert something a regex reads directly, and would still not fail when a FIFTH
  call site is added without context, which is the way this recurs.
*/
describe('PvP failure reports carry the id the server logs', () => {
  const source = readFileSync(join(process.cwd(), 'src/hooks/usePvPRoom.ts'), 'utf8')

  /*
    PVP_ROOM_ACTION_FAIL is the create/join path: it runs BEFORE a room exists, so there is no
    roomId to pass and inventing one would be noise wearing the shape of evidence. Named here
    so the exemption is a decision on the record rather than an oversight the regex missed.
  */
  const NO_ROOM_YET = ['PVP_ROOM_ACTION_FAIL']

  test('every PvP report that can name its room does', () => {
    const calls = [...source.matchAll(/reportError\(\s*'(PVP_[A-Z_]+)'[^)]*\)/g)]

    expect(calls.length).toBeGreaterThan(0)

    const contextless = calls
      .filter(([, code]) => !NO_ROOM_YET.includes(code))
      // Pre-fix: all four of these ended at `cause)` with no fourth argument.
      .filter(([call]) => !call.includes('roomId'))
      .map(([, code]) => code)

    expect(contextless).toEqual([])
  })

  test('the exempt codes still exist in the file, so the exemption cannot outlive them', () => {
    for (const code of NO_ROOM_YET) {
      expect(source).toContain(code)
    }
  })
})
