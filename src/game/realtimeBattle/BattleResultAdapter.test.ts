import { afterEach, describe, expect, it, vi } from 'vitest'
import { toRealtimeBattleResult } from './BattleResultAdapter'
import { createRealtimeBattle } from './createRealtimeBattle'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import { lobbyBattleTransactionId } from '../reward/lobbyBattleRewardPipeline'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

function makePlayer(): Player {
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
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

function finishBattle() {
  const state = createRealtimeBattle('trial-01', makePlayer())
  if (!state) throw new Error('trial-01 must exist')
  return toRealtimeBattleResult(state, 'victory')
}

afterEach(() => {
  vi.useRealTimers()
})

/*
  2026-08-10 audit F7 — the client-clock transaction id.

  Every idempotency guard for a battle (progression flag, gold refId, per-item grant refId) hangs
  off one transaction id. While that id was derived from `stageId + finishedAt`, the client's own
  wall clock decided whether two battles were "the same" battle. A backwards jump — an NTP
  correction, a manual clock change, a timezone edit — reproduces an earlier `finishedAt`, and the
  pipeline then reads a genuinely new battle as already processed: `alreadyComplete: true`, no
  grant, success reported. The player wins and receives nothing.
*/
describe('F7: the transaction id does not come from the clock', () => {
  it('two battles that finish at the SAME wall-clock instant get different ids', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-08-10T10:00:00.000Z'))
    const first = finishBattle()

    // The clock jumps back: the next battle reports the exact same finishedAt as the first.
    vi.setSystemTime(new Date('2026-08-10T10:00:00.000Z'))
    const second = finishBattle()

    // The scenario is real, not hypothetical — the old derivation collides outright.
    expect(`lobby:${first.stageId}:${first.finishedAt}`).toBe(
      `lobby:${second.stageId}:${second.finishedAt}`,
    )

    // ...and the id the pipeline actually keys on must still tell them apart.
    expect(lobbyBattleTransactionId(second)).not.toBe(lobbyBattleTransactionId(first))
  })

  it('one battle result keeps ONE id across every finalize attempt', () => {
    const result = finishBattle()

    // finalizeLobbyBattleRewards calls this on every attempt; a fresh mint per call would defeat
    // the flag guards and grant the same battle twice.
    expect(lobbyBattleTransactionId(result)).toBe(lobbyBattleTransactionId(result))
    expect(lobbyBattleTransactionId({ ...result })).toBe(lobbyBattleTransactionId(result))
  })

  it('the minted id stays inside the RPC argument bound (200 chars)', () => {
    expect(lobbyBattleTransactionId(finishBattle()).length).toBeLessThanOrEqual(200)
  })
})
