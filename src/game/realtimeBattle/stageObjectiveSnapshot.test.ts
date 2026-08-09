import { describe, expect, it } from 'vitest'
import { createRealtimeBattle } from './createRealtimeBattle'
import { buildStageObjectiveSnapshot } from './stageObjectiveSnapshot'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import type { Player } from '../../types/player'

const player: Player = {
  id: 'profile-1',
  uid: 'LOS-1111-1111',
  name: 'ผู้ทดสอบ',
  title: 'ผู้จาริก',
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
    },
  ],
  teamSlots: ['monkey-king', null, null, null],
  inventory: [],
  friends: [],
  frameId: 'arcane',
  progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
}

describe('stage objective snapshot lobby-to-runtime feedback', () => {
  it('survival exposes a countdown instead of presenting itself as a normal Wave stage', () => {
    const state = createRealtimeBattle('trial-03', player)
    expect(state).not.toBeNull()
    if (!state) return
    // นาฬิกาที่ objective ใช้คือ stageElapsedMs (ไม่รวมฉากเปิด) ไม่ใช่ elapsedMs
    state.stageElapsedMs = 30_000

    expect(buildStageObjectiveSnapshot(state)).toEqual({
      kind: 'survival',
      current: 30_000,
      target: 90_000,
      remainingMs: 60_000,
    })
  })

  it('chase reports distance and time to the visible target marker', () => {
    const state = createRealtimeBattle('trial-07', player)
    expect(state).not.toBeNull()
    if (!state) return

    const snapshot = buildStageObjectiveSnapshot(state)
    expect(snapshot.kind).toBe('chase')
    expect(snapshot.current).toBeGreaterThan(snapshot.target ?? 0)
    expect(snapshot.remainingMs).toBe(90_000)
  })

  it('defend and hazard expose their live objective health', () => {
    const defend = createRealtimeBattle('trial-04', player)
    const hazard = createRealtimeBattle('trial-06', player)
    expect(defend && buildStageObjectiveSnapshot(defend)).toMatchObject({
      kind: 'defend',
      current: 300,
      target: 300,
    })
    expect(hazard && buildStageObjectiveSnapshot(hazard)).toMatchObject({
      kind: 'hazard',
      current: 200,
      target: 200,
    })
  })
})
