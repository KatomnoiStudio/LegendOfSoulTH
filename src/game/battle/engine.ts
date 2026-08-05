import { applyOutcomes, resolveAction } from './actions'
import { createAlliesFromTeam, createEnemiesFromStage } from './combatants'
import { getStage } from './stages'
import type { BattleAction, BattleSnapshot, BattleResult } from './types'
import type { OwnedCharacter } from '../../types/player'
import type { TeamSlots } from '../team'

let logCounter = 0

function makeLog(text: string, tone: BattleSnapshot['log'][number]['tone'] = 'system') {
  logCounter += 1
  return { id: `log-${logCounter}`, text, tone }
}

function buildTurnQueue(snapshot: BattleSnapshot): string[] {
  const living = [...snapshot.allies, ...snapshot.enemies].filter((unit) => unit.hp > 0)
  return living
    .sort((a, b) => {
      if (b.spd !== a.spd) return b.spd - a.spd
      if (a.isAlly !== b.isAlly) return a.isAlly ? -1 : 1
      return a.slot - b.slot
    })
    .map((unit) => unit.id)
}

function checkEnd(snapshot: BattleSnapshot): BattleSnapshot['result'] {
  const alliesAlive = snapshot.allies.some((unit) => unit.hp > 0)
  const enemiesAlive = snapshot.enemies.some((unit) => unit.hp > 0)
  if (!alliesAlive) return 'defeat'
  if (!enemiesAlive) return 'victory'
  return 'ongoing'
}

function syncPhase(snapshot: BattleSnapshot): BattleSnapshot {
  const result = checkEnd(snapshot)
  if (result !== 'ongoing') {
    return {
      ...snapshot,
      result,
      phase: result === 'victory' ? 'victory' : 'defeat',
      activeUnitId: null,
    }
  }

  const activeUnitId = snapshot.turnQueue[snapshot.turnIndex] ?? null
  const active = [...snapshot.allies, ...snapshot.enemies].find((unit) => unit.id === activeUnitId)
  const phase = active?.isAlly ? 'awaiting_input' : 'resolving'

  return { ...snapshot, result, phase, activeUnitId }
}

function clearDefendingFlags(snapshot: BattleSnapshot): BattleSnapshot {
  return {
    ...snapshot,
    allies: snapshot.allies.map((unit) => ({ ...unit, defending: false })),
    enemies: snapshot.enemies.map((unit) => ({ ...unit, defending: false })),
  }
}

export function createBattle(
  stageId: string,
  teamSlots: TeamSlots,
  ownedCharacters: OwnedCharacter[],
): BattleSnapshot | null {
  const stage = getStage(stageId)
  if (!stage) return null

  const allies = createAlliesFromTeam(teamSlots, ownedCharacters)
  if (allies.length === 0) return null

  const enemies = createEnemiesFromStage(stageId)
  logCounter = 0

  const base: BattleSnapshot = {
    stageId,
    stageName: stage.name,
    round: 1,
    phase: 'intro',
    allies,
    enemies,
    turnQueue: [],
    turnIndex: 0,
    activeUnitId: null,
    log: [makeLog(`เริ่มการต่อสู้ — ${stage.name}`)],
    result: 'ongoing',
    turnCount: 0,
  }

  const withQueue = { ...base, turnQueue: buildTurnQueue(base) }
  return syncPhase({ ...withQueue, phase: 'intro' })
}

export function beginBattle(snapshot: BattleSnapshot): BattleSnapshot {
  return syncPhase({ ...snapshot, phase: 'awaiting_input' })
}

export function submitAction(snapshot: BattleSnapshot, action: BattleAction): BattleSnapshot {
  if (snapshot.result !== 'ongoing') return snapshot

  const resolution = resolveAction(snapshot, action)
  let next = applyOutcomes(snapshot, action.actorId, resolution)
  next = {
    ...next,
    turnCount: next.turnCount + 1,
    log: [...next.log, ...resolution.logLines.map((entry) => makeLog(entry.text, entry.tone))],
    phase: 'resolving',
  }

  const ended = checkEnd(next)
  if (ended !== 'ongoing') {
    return syncPhase(next)
  }

  return advanceTurn(next)
}

export function advanceTurn(snapshot: BattleSnapshot): BattleSnapshot {
  if (snapshot.result !== 'ongoing') return snapshot

  let turnIndex = snapshot.turnIndex + 1
  let round = snapshot.round
  let turnQueue = snapshot.turnQueue

  if (turnIndex >= turnQueue.length) {
    round += 1
    const refreshed = clearDefendingFlags(snapshot)
    turnQueue = buildTurnQueue(refreshed)
    turnIndex = 0
    snapshot = { ...refreshed, round, turnQueue, turnIndex }
  } else {
    snapshot = { ...snapshot, turnIndex }
  }

  return syncPhase({ ...snapshot, turnQueue, turnIndex, round })
}

export function toBattleResult(snapshot: BattleSnapshot): BattleResult | null {
  if (snapshot.result === 'ongoing') return null
  return {
    outcome: snapshot.result,
    stageId: snapshot.stageId,
    stageName: snapshot.stageName,
    turns: snapshot.turnCount,
    finishedAt: new Date().toISOString(),
  }
}

export function getActiveUnit(snapshot: BattleSnapshot) {
  if (!snapshot.activeUnitId) return null
  return [...snapshot.allies, ...snapshot.enemies].find((unit) => unit.id === snapshot.activeUnitId) ?? null
}

export function getValidTargets(snapshot: BattleSnapshot, actorId: string, kind: BattleAction['kind']) {
  const actor = [...snapshot.allies, ...snapshot.enemies].find((unit) => unit.id === actorId)
  if (!actor) return []

  if (kind === 'defend') return [actor]
  if (kind === 'attack' || kind === 'skill') {
    const pool = actor.isAlly ? snapshot.enemies : snapshot.allies
    return pool.filter((unit) => unit.hp > 0)
  }
  return []
}
