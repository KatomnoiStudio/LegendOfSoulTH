import { describe, expect, test } from 'vitest'
import type { OwnedCharacter, Player } from '../../types/player'
import { canApplyKnockdown } from '../realtimeBattle/combatReaction'
import { getPlayerAttackChain } from '../heroes/attackChains'
import { createEmptyPlayerInputState } from '../realtimeBattle/playerInput'
import { createDefaultSkillLevels } from '../realtimeBattle/SkillProgressionSystem'
import { createRankedPlayerEntity, RANKED_BASELINE } from './rankedNormalization'
import {
  advancePvPAuthority,
  createPvPAuthorityState,
  hashPvPAuthorityState,
  markPvPParticipantConnected,
  markPvPParticipantDisconnected,
  PVP_FIXED_TICK_MS,
  PVP_MAX_PENDING_ACTIONS,
  PVP_RECONNECT_GRACE_MS,
  toRealtimePvPResult,
} from './PvPAuthorityEngine'
import { PvPReconciler } from './PvPReconciler'
import type { PvPAuthorityState, PvPInputFrame } from './pvpTypes'

function owned(star = 1): OwnedCharacter {
  return {
    characterId: 'monkey-king',
    level: 1,
    exp: 0,
    expToNext: 100,
    obtainedAt: '2026-08-09T00:00:00.000Z',
    skillLevels: createDefaultSkillLevels(),
    star,
    shards: 0,
  }
}

function player(id: string, star = 1): Player {
  const character = owned(star)
  return {
    id,
    uid: id,
    name: id,
    title: 'PvP tester',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [character],
    inventory: [],
    friends: [],
    teamSlots: [character.characterId, null, null, null],
    frameId: 'default',
    progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
  }
}

function matchState(): PvPAuthorityState {
  const host = createRankedPlayerEntity(player('host'))
  const guest = createRankedPlayerEntity(player('guest'))
  if (!host || !guest) throw new Error('ranked entity setup failed')
  return createPvPAuthorityState(
    'match-1',
    { playerId: 'host', entity: host },
    { playerId: 'guest', entity: guest },
  )
}

function inputFrame(
  playerId: string,
  sequence: number,
  clientTick: number,
  overrides: Partial<PvPInputFrame['input']> = {},
): PvPInputFrame {
  return {
    playerId,
    sequence,
    clientTick,
    input: { ...createEmptyPlayerInputState(), ...overrides },
  }
}

describe('P12 PvP authoritative simulation', () => {
  test('consumes #20 ranked entities and explicitly maps both heroes to elite-like reactions', () => {
    const state = matchState()
    const [host, guest] = state.participants
    const finisher = getPlayerAttackChain(host.heroId).find((attack) => attack.knockdown)

    expect(host.entity.entityType).toBe('pvp-player')
    expect(guest.entity.entityType).toBe('pvp-player')
    expect(host.entity.controllerId).toBe('host')
    expect(host.entity.combatTier).toBe('elite')
    expect(finisher).toBeDefined()
    expect(canApplyKnockdown(guest.entity, finisher!)).toBe(true)
    expect(createRankedPlayerEntity(player('fresh'))?.maxHp).toBe(host.entity.maxHp)
    expect(RANKED_BASELINE.heroLevel).toBe(60)
  })

  test('deduplicates replayed input sequence and never double-applies an action', () => {
    const initial = matchState()
    const frame = inputFrame('host', 1, 1, { basicAttackPressed: true })
    const next = advancePvPAuthority(initial, [frame, frame])

    expect(next.participants[0].lastProcessedSequence).toBe(1)
    expect(next.participants[0].combo.attackId).not.toBeNull()
    expect(next.participants[0].pendingActions).toHaveLength(0)
  })

  test('hash covers future-affecting cooldown/action state and action backlog is bounded', () => {
    const initial = matchState()
    const hiddenDifference = structuredClone(initial)
    hiddenDifference.participants[0].entity.skillCooldownsMs.skill1 = 500
    expect(hashPvPAuthorityState(hiddenDifference)).not.toBe(initial.stateHash)

    const frames = Array.from({ length: 20 }, (_, index) =>
      inputFrame('host', index + 1, index + 1, { basicAttackPressed: true }),
    )
    const queued = advancePvPAuthority(initial, frames, 0, 1)
    expect(queued.participants[0].pendingActions).toHaveLength(PVP_MAX_PENDING_ACTIONS)
  })

  test('identical recorded inputs are deterministic frame-by-frame', () => {
    let left = matchState()
    let right = matchState()
    for (let tick = 1; tick <= 80; tick += 1) {
      const frames = [
        inputFrame('host', tick, tick, {
          moveX: 1,
          basicAttackPressed: tick % 9 === 0,
        }),
        inputFrame('guest', tick, tick, {
          moveX: -1,
          skill1Pressed: tick % 17 === 0,
        }),
      ]
      left = advancePvPAuthority(left, frames, PVP_FIXED_TICK_MS, tick * PVP_FIXED_TICK_MS)
      right = advancePvPAuthority(right, frames, PVP_FIXED_TICK_MS, tick * PVP_FIXED_TICK_MS)
      expect(right.stateHash).toBe(left.stateHash)
    }
  })

  test('two clients converge under asymmetric 50/200ms latency, loss, retries, and burst reordering', () => {
    let authority = matchState()
    const hostClient = new PvPReconciler('host', authority)
    const guestClient = new PvPReconciler('guest', authority)
    const inputTransit: Array<{ deliverAt: number; frame: PvPInputFrame }> = []
    const hostSnapshots: Array<{ deliverAt: number; state: PvPAuthorityState }> = []
    const guestSnapshots: Array<{ deliverAt: number; state: PvPAuthorityState }> = []
    let hostCorrections = 0
    let guestCorrections = 0

    for (let tick = 1; tick <= 420 && authority.status !== 'completed'; tick += 1) {
      const nowMs = tick * PVP_FIXED_TICK_MS
      const hostFrame = inputFrame('host', tick, tick, {
        moveX: 1,
        basicAttackPressed: tick % 8 === 0,
      })
      const guestFrame = inputFrame('guest', tick, tick, {
        moveX: -1,
        basicAttackPressed: tick % 8 === 0,
      })

      hostClient.predict(hostFrame, nowMs)
      guestClient.predict(guestFrame, nowMs)

      inputTransit.push({ deliverAt: nowMs + 50, frame: hostFrame })
      inputTransit.push({
        deliverAt: nowMs + (tick % 7 === 0 ? 300 : 200),
        frame: guestFrame,
      })
      if (tick % 10 === 0) {
        inputTransit.push({ deliverAt: nowMs + 300, frame: guestFrame })
      }

      const arrived = inputTransit
        .filter((packet) => packet.deliverAt <= nowMs)
        .map((packet) => packet.frame)
        .toReversed()
      for (let index = inputTransit.length - 1; index >= 0; index -= 1) {
        if (inputTransit[index].deliverAt <= nowMs) inputTransit.splice(index, 1)
      }
      authority = advancePvPAuthority(authority, arrived, PVP_FIXED_TICK_MS, nowMs)
      hostSnapshots.push({ deliverAt: nowMs + 50, state: structuredClone(authority) })
      guestSnapshots.push({ deliverAt: nowMs + 200, state: structuredClone(authority) })

      for (const queue of [hostSnapshots, guestSnapshots]) {
        const client = queue === hostSnapshots ? hostClient : guestClient
        const ready = queue.filter((packet) => packet.deliverAt <= nowMs)
        for (const packet of ready) {
          if (client.reconcile(packet.state, nowMs).corrected) {
            if (client === hostClient) hostCorrections += 1
            else guestCorrections += 1
          }
        }
        for (let index = queue.length - 1; index >= 0; index -= 1) {
          if (queue[index].deliverAt <= nowMs) queue.splice(index, 1)
        }
      }
    }

    hostClient.reconcile(authority, authority.elapsedMs + 1_000)
    guestClient.reconcile(authority, authority.elapsedMs + 1_000)

    expect(authority.status).toBe('completed')
    expect(hostCorrections).toBeGreaterThan(0)
    expect(guestCorrections).toBeGreaterThan(0)
    expect(hostClient.getState().stateHash).toBe(authority.stateHash)
    expect(guestClient.getState().stateHash).toBe(authority.stateHash)
    expect(hashPvPAuthorityState(hostClient.getState())).toBe(authority.stateHash)
    expect(hashPvPAuthorityState(guestClient.getState())).toBe(authority.stateHash)
  })

  test('reconnect inside grace resumes; expiry produces an authority-signed forfeit result', () => {
    const initial = matchState()
    const droppedAt = 1_000
    const disconnected = markPvPParticipantDisconnected(initial, 'guest', droppedAt)

    expect(disconnected.status).toBe('reconnecting')
    const resumed = markPvPParticipantConnected(
      advancePvPAuthority(disconnected, [], PVP_FIXED_TICK_MS, droppedAt + 5_000),
      'guest',
      droppedAt + 5_001,
    )
    expect(resumed.status).toBe('active')

    const droppedAgain = markPvPParticipantDisconnected(resumed, 'guest', droppedAt + 6_000)
    const expired = advancePvPAuthority(
      droppedAgain,
      [],
      PVP_FIXED_TICK_MS,
      droppedAt + 6_000 + PVP_RECONNECT_GRACE_MS,
    )
    const result = toRealtimePvPResult(expired)

    expect(expired.status).toBe('completed')
    expect(result).toMatchObject({
      matchId: 'match-1',
      winnerPlayerId: 'host',
      loserPlayerId: 'guest',
      reason: 'forfeit',
      finalStateHash: expired.stateHash,
      finishedAt: new Date(droppedAt + 6_000 + PVP_RECONNECT_GRACE_MS).toISOString(),
    })
  })
})
