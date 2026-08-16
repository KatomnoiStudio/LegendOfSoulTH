import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPvPAuthorityState } from '../../game/pvp/PvPAuthorityEngine'
import { createRankedPlayerEntity } from '../../game/pvp/rankedNormalization'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import { EMPTY_PROGRESS, type Player } from '../../types/player'
import { PvPRoomModal } from './PvPRoomModal'

const mocks = vi.hoisted(() => ({
  usePvPRoom: vi.fn(),
}))

vi.mock('../../hooks/usePvPRoom', () => ({ usePvPRoom: mocks.usePvPRoom }))
vi.mock('../BattleScene/BattleJoystick', () => ({
  BattleJoystick: () => <div aria-label="จอยควบคุม" />,
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

function controller(overrides: Record<string, unknown> = {}) {
  return {
    room: null,
    state: null,
    result: null,
    connected: false,
    busy: false,
    error: null,
    createRoom: vi.fn().mockResolvedValue(undefined),
    joinRoom: vi.fn().mockResolvedValue(undefined),
    setMovement: vi.fn(),
    pressAttack: vi.fn(),
    pressSkill: vi.fn(),
    ...overrides,
  }
}

describe('PvPRoomModal', () => {
  beforeEach(() => mocks.usePvPRoom.mockReset())

  test('creates a selected-Hero room and normalizes a typed invite code before joining', async () => {
    const user = userEvent.setup({ delay: null })
    const roomController = controller()
    mocks.usePvPRoom.mockReturnValue(roomController)
    render(<PvPRoomModal player={player('host')} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'สร้างห้องใหม่' }))
    expect(roomController.createRoom).toHaveBeenCalledWith('monkey-king')

    const code = screen.getByRole('textbox', { name: 'รหัสห้อง 6 ตัว' })
    await user.type(code, 'ab01z9')
    expect(code).toHaveValue('ABZ9')
    await user.type(code, 'k2')
    await user.click(screen.getByRole('button', { name: 'เข้าห้อง' }))
    expect(roomController.joinRoom).toHaveBeenCalledWith('ABZ9K2', 'monkey-king')
  })

  test('renders both normalized clients and an authority-confirmed result', () => {
    const host = player('host')
    const guest = player('guest')
    const authority = createPvPAuthorityState(
      'room-1',
      { playerId: host.id, entity: createRankedPlayerEntity(host)! },
      { playerId: guest.id, entity: createRankedPlayerEntity(guest)! },
    )
    authority.status = 'completed'
    authority.winnerPlayerId = host.id
    authority.loserPlayerId = guest.id
    authority.resultReason = 'forfeit'
    authority.finishedAt = '2026-08-09T00:00:00.000Z'
    mocks.usePvPRoom.mockReturnValue(
      controller({
        room: {
          roomId: 'room-1',
          roomCode: 'ABC2D3',
          status: 'completed',
          hostPlayerId: host.id,
          guestPlayerId: guest.id,
          hostHeroId: 'monkey-king',
          guestHeroId: 'monkey-king',
          stateVersion: 4,
          authoritativeState: authority,
        },
        state: authority,
        result: {
          matchId: 'room-1',
          participants: ['host', 'guest'],
          winnerPlayerId: 'host',
          loserPlayerId: 'guest',
          reason: 'forfeit',
          finalStateHash: authority.stateHash,
          elapsedMs: authority.elapsedMs,
          finishedAt: '2026-08-09T00:00:00.000Z',
        },
        connected: true,
      }),
    )

    render(<PvPRoomModal player={host} onClose={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'สถานะการต่อสู้ PvP' })).toBeInTheDocument()
    expect(screen.getByText('ชนะ')).toBeInTheDocument()
    expect(screen.getByText(/ผลยืนยันโดย server authority/)).toBeInTheDocument()
  })

  test('surfaces the ten-second reconnect grace when the opponent heartbeat stops', () => {
    const host = player('host')
    const guest = player('guest')
    const authority = createPvPAuthorityState(
      'room-reconnect',
      { playerId: host.id, entity: createRankedPlayerEntity(host)! },
      { playerId: guest.id, entity: createRankedPlayerEntity(guest)! },
    )
    authority.status = 'reconnecting'
    authority.participants[1].connected = false
    authority.participants[1].disconnectedAtMs = 1_000
    mocks.usePvPRoom.mockReturnValue(
      controller({
        room: {
          roomId: 'room-reconnect',
          roomCode: 'ABC2D3',
          status: 'reconnecting',
          hostPlayerId: host.id,
          guestPlayerId: guest.id,
          hostHeroId: 'monkey-king',
          guestHeroId: 'monkey-king',
          stateVersion: 2,
          authoritativeState: authority,
        },
        state: authority,
        connected: true,
      }),
    )

    render(<PvPRoomModal player={host} onClose={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('รอกลับเข้าห้องภายใน 10 วินาที')
  })
})
