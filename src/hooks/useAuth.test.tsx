import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createDefaultSkillLevels } from '../game/realtimeBattle/SkillProgressionSystem'
import { EMPTY_PROGRESS, type Player } from '../types/player'
import { useAuth } from './useAuth'

/*
  ── 2026-08-10 audit, F4/F6 — the two ways this hook loses a player's data ────────────────

  F4: the session-restore `.then()` had no `.catch()`. `status` starts at 'loading', which is a
      DEAD state in the UI (App.tsx needs 'signed-in' or 'guest'), so a single rejected promise
      at boot pinned the game at a title screen whose Start button could never open the auth
      modal — no message, no retry, until the player refreshed by themselves.

  F6: `savePlayer` commits profiles, then owned_characters, then friends, then team_slots, each
      as its own commit. A failure at a later step still left the earlier ones written — and the
      old rollback threw the WHOLE screen back to `previous`, so committed values displayed as
      unsaved and the next save wrote those stale values back over the newer row. `previous` was
      also a stale closure snapshot, so a save that succeeded in between got clobbered too.

  This hook had ZERO tests before this file, while all four sibling hooks had one. The seam was
  always available — mock the repository module, which is the hook's real dependency boundary.
*/

const accounts = vi.hoisted(() => ({
  getSessionPlayer: vi.fn(),
  getSessionIsAdmin: vi.fn(() => false),
  getSessionIsGuest: vi.fn(() => false),
  getLinkedProviders: vi.fn(async () => [] as string[]),
  savePlayer: vi.fn(),
}))

const reportErrorMock = vi.hoisted(() => vi.fn())

vi.mock('../data/accountRepository.supabase', () => accounts)
vi.mock('../lib/errors/reportError', () => ({ reportError: reportErrorMock }))

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'profile-1',
    uid: '1234567890',
    name: 'Tester',
    title: 'ผู้จาริกหน้าใหม่',
    level: 7,
    exp: 40,
    expToNext: 100,
    currency: { gold: 500, gem: 20 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 5,
        exp: 10,
        expToNext: 200,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'arcane',
    progress: { ...EMPTY_PROGRESS, flags: {} },
    ...overrides,
  }
}

/** A promise a test resolves by hand, to control exactly when a save lands. */
function deferred<T>() {
  let settle!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

beforeEach(() => {
  vi.clearAllMocks()
  accounts.getSessionIsAdmin.mockReturnValue(false)
  accounts.getSessionIsGuest.mockReturnValue(false)
  accounts.getLinkedProviders.mockResolvedValue([])
  accounts.getSessionPlayer.mockResolvedValue(null)
  accounts.savePlayer.mockResolvedValue(true)
})

describe('F4: session restore never leaves the game stuck at loading', () => {
  it('falls back to guest and reports when the restore rejects', async () => {
    accounts.getSessionPlayer.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useAuth())

    // Old code: no .catch(), so status stayed 'loading' forever — a state no screen renders.
    await waitFor(() => {
      expect(result.current.status).toBe('guest')
    })
    expect(reportErrorMock).toHaveBeenCalledWith(
      'AUTH_SESSION_RESTORE_FAIL',
      'visible',
      expect.objectContaining({ message: 'network down' }),
    )
    expect(result.current.player).toBeNull()
  })

  it('still signs in normally when the restore resolves a player', async () => {
    const player = makePlayer()
    accounts.getSessionPlayer.mockResolvedValueOnce(player)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.status).toBe('signed-in')
    })
    expect(result.current.player).toEqual(player)
    expect(reportErrorMock).not.toHaveBeenCalled()
  })

  it('resolving no session lands on guest without reporting an error', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.status).toBe('guest')
    })
    expect(reportErrorMock).not.toHaveBeenCalled()
  })
})

describe('F6: a failed save shows what the server actually holds', () => {
  it('re-reads the authoritative player instead of rolling the screen back blindly', async () => {
    const restored = makePlayer({ name: 'Before' })
    // savePlayer got as far as committing the profile name, then failed on a later table.
    const authoritative = makePlayer({ name: 'After', title: 'ยังไม่บันทึก' })
    accounts.getSessionPlayer.mockResolvedValueOnce(restored)
    accounts.savePlayer.mockResolvedValueOnce(false)
    accounts.getSessionPlayer.mockResolvedValueOnce(authoritative)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in')
    })

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.updatePlayer(makePlayer({ name: 'After', title: 'ทั้งคู่' }))
    })

    expect(saved).toBe(false)
    expect(reportErrorMock).toHaveBeenCalledWith('PLAYER_SAVE_FAIL', 'visible')
    // Old code reverted to `restored` — showing the committed name as if it never saved, and
    // teeing up the next save to write that stale name back over the newer row.
    expect(result.current.player).toEqual(authoritative)
  })

  it('falls back to the previous value when the re-read itself fails', async () => {
    const restored = makePlayer({ name: 'Before' })
    accounts.getSessionPlayer.mockResolvedValueOnce(restored)
    accounts.savePlayer.mockResolvedValueOnce(false)
    accounts.getSessionPlayer.mockRejectedValueOnce(new Error('still down'))

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in')
    })

    await act(async () => {
      await result.current.updatePlayer(makePlayer({ name: 'After' }))
    })

    expect(result.current.player).toEqual(restored)
    expect(reportErrorMock).toHaveBeenCalledWith(
      'PLAYER_LOAD_FAIL',
      'silent',
      expect.objectContaining({ message: 'still down' }),
    )
  })

  it('a failed save does not clobber a newer save that succeeded while it was in flight', async () => {
    const restored = makePlayer({ name: 'Before' })
    accounts.getSessionPlayer.mockResolvedValueOnce(restored)

    const slowSave = deferred<boolean>()
    accounts.savePlayer.mockReturnValueOnce(slowSave.promise).mockResolvedValueOnce(true)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in')
    })

    const doomed = makePlayer({ name: 'Doomed' })
    const winner = makePlayer({ name: 'Winner' })

    let firstSave: Promise<boolean> | undefined
    act(() => {
      firstSave = result.current.updatePlayer(doomed)
    })
    // A second save starts and completes while the first is still hanging.
    await act(async () => {
      await result.current.updatePlayer(winner)
    })
    expect(result.current.player).toEqual(winner)

    // Now the first save comes back a failure.
    accounts.getSessionPlayer.mockResolvedValueOnce(makePlayer({ name: 'Before' }))
    await act(async () => {
      slowSave.settle(false)
      await firstSave
    })

    // Old code ran setPlayer(previous) unconditionally off a stale closure and erased 'Winner'.
    expect(result.current.player).toEqual(winner)
  })

  it('a successful save leaves the optimistic value alone and does not re-read', async () => {
    accounts.getSessionPlayer.mockResolvedValueOnce(makePlayer({ name: 'Before' }))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.status).toBe('signed-in')
    })
    accounts.getSessionPlayer.mockClear()

    const next = makePlayer({ name: 'After' })
    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.updatePlayer(next)
    })

    expect(saved).toBe(true)
    expect(result.current.player).toEqual(next)
    expect(accounts.getSessionPlayer).not.toHaveBeenCalled()
  })
})
