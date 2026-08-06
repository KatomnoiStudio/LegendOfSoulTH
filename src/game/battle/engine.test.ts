import { describe, expect, test } from 'vitest'
import { advanceTurn, beginBattle, createBattle, getActiveUnit, submitAction } from './engine'
import type { TeamSlots } from '../team'
import type { OwnedCharacter } from '../../types/player'

const OWNED: OwnedCharacter[] = [
  { characterId: 'monkey-king', level: 5, exp: 0, expToNext: 100, obtainedAt: new Date(0).toISOString() },
]
const TEAM: TeamSlots = ['monkey-king', null, null, null]

function freshBattle() {
  const created = createBattle('trial-01', TEAM, OWNED)
  if (!created) throw new Error('setup failed: trial-01/monkey-king must exist for this test')
  return beginBattle(created)
}

describe('createBattle', () => {
  test('returns null for an unknown stage', () => {
    expect(createBattle('does-not-exist', TEAM, OWNED)).toBeNull()
  })

  test('returns null when the team has no living roster entry', () => {
    expect(createBattle('trial-01', [null, null, null, null], OWNED)).toBeNull()
  })

  test('builds a snapshot with the ally in the queue and starts ongoing', () => {
    const snapshot = createBattle('trial-01', TEAM, OWNED)
    expect(snapshot).not.toBeNull()
    expect(snapshot?.result).toBe('ongoing')
    expect(snapshot?.allies).toHaveLength(1)
    expect(snapshot?.enemies.length).toBeGreaterThan(0)
    expect(snapshot?.turnQueue.length).toBe(1 + (snapshot?.enemies.length ?? 0))
  })
})

describe('beginBattle', () => {
  test('moves to awaiting_input when the ally goes first, or resolving when an enemy is faster', () => {
    const snapshot = freshBattle()
    const active = getActiveUnit(snapshot)
    expect(active).not.toBeNull()
    expect(snapshot.phase).toBe(active?.isAlly ? 'awaiting_input' : 'resolving')
  })
})

describe('submitAction', () => {
  test('ignores actions once the battle already has a result', () => {
    let snapshot = freshBattle()
    // บังคับจบศึกด้วยการลบ enemy ทั้งหมดตรง ๆ (ทดสอบ guard ไม่ใช่ทดสอบดาเมจ)
    snapshot = { ...snapshot, enemies: snapshot.enemies.map((e) => ({ ...e, hp: 0 })), result: 'victory' }
    const before = snapshot
    const after = submitAction(snapshot, { kind: 'defend', actorId: snapshot.allies[0].id, targetId: snapshot.allies[0].id })
    expect(after).toBe(before)
  })

  test('a defend action logs an entry and advances the turn without crashing', () => {
    const snapshot = freshBattle()
    const ally = snapshot.allies[0]
    const after = submitAction(snapshot, { kind: 'defend', actorId: ally.id, targetId: ally.id })
    expect(after.turnCount).toBe(1)
    expect(after.log.length).toBeGreaterThan(snapshot.log.length)
  })

  test('an attack reduces the target enemy HP and can defeat it', () => {
    const snapshot = freshBattle()
    const ally = snapshot.allies[0]
    const enemy = snapshot.enemies[0]
    // ทำให้ตายแน่ ๆ ในนัดเดียวเพื่อทดสอบ path defeated ไม่ต้องพึ่ง RNG
    const weakened = { ...snapshot, enemies: snapshot.enemies.map((e) => (e.id === enemy.id ? { ...e, hp: 1 } : e)) }
    const after = submitAction(weakened, { kind: 'attack', actorId: ally.id, targetId: enemy.id })
    const enemyAfter = [...after.allies, ...after.enemies].find((u) => u.id === enemy.id)
    expect(enemyAfter?.hp).toBe(0)
  })
})

describe('advanceTurn', () => {
  test('wraps to a new round and clears defending flags once the queue is exhausted', () => {
    let snapshot = freshBattle()
    const queueLength = snapshot.turnQueue.length
    for (let i = 0; i < queueLength; i++) {
      const active = getActiveUnit(snapshot)
      if (!active) break
      snapshot = submitAction(snapshot, { kind: 'defend', actorId: active.id, targetId: active.id })
    }
    expect(snapshot.round).toBeGreaterThanOrEqual(2)
    expect(snapshot.allies.every((unit) => !unit.defending)).toBe(true)
  })

  test('does nothing once the battle already has a result', () => {
    const snapshot = freshBattle()
    const finished = { ...snapshot, result: 'defeat' as const }
    expect(advanceTurn(finished)).toBe(finished)
  })
})
