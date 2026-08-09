import {
  advancePvPAuthority,
  markPvPParticipantConnected,
  markPvPParticipantDisconnected,
  PVP_FIXED_TICK_MS,
} from './PvPAuthorityEngine'
import type { PvPAuthorityState, PvPInputFrame } from './pvpTypes'

export type PvPAuthorityCommand =
  | { action: 'input'; sequence: number; clientTick: number; input: PvPInputFrame['input'] }
  | { action: 'disconnect' }
  | { action: 'reconnect' }

const MAX_SEQUENCE_AHEAD = 120
const MAX_CATCH_UP_TICKS = 4

function assertParticipant(state: PvPAuthorityState, playerId: string): void {
  if (!state.participants.some((participant) => participant.playerId === playerId)) {
    throw new Error('PVP_NOT_A_PARTICIPANT')
  }
}

function clampAxis(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(-1, value))
}

function normalizeInput(input: PvPInputFrame['input']): PvPInputFrame['input'] {
  return {
    moveX: clampAxis(input.moveX),
    moveDepth: clampAxis(input.moveDepth),
    basicAttackPressed: input.basicAttackPressed === true,
    skill1Pressed: input.skill1Pressed === true,
    skill2Pressed: input.skill2Pressed === true,
    skill3Pressed: input.skill3Pressed === true,
    ultimatePressed: input.ultimatePressed === true,
  }
}

/** Server-only command reducer. The authenticated playerId is injected by the Edge Function. */
export function runPvPAuthorityCommand(
  source: PvPAuthorityState,
  playerId: string,
  command: PvPAuthorityCommand,
  nowMs: number,
): PvPAuthorityState {
  assertParticipant(source, playerId)
  if (command.action === 'disconnect') {
    return markPvPParticipantDisconnected(source, playerId, nowMs)
  }
  if (command.action === 'reconnect') {
    return markPvPParticipantConnected(source, playerId, nowMs)
  }

  if (!Number.isSafeInteger(command.sequence) || command.sequence <= 0) {
    throw new Error('PVP_INVALID_INPUT_SEQUENCE')
  }
  if (!Number.isSafeInteger(command.clientTick) || command.clientTick < 0) {
    throw new Error('PVP_INVALID_CLIENT_TICK')
  }
  const participant = source.participants.find((entry) => entry.playerId === playerId)!
  if (command.sequence > participant.lastProcessedSequence + MAX_SEQUENCE_AHEAD) {
    throw new Error('PVP_INPUT_SEQUENCE_GAP')
  }

  const frame: PvPInputFrame = {
    playerId,
    sequence: command.sequence,
    clientTick: command.clientTick,
    input: normalizeInput(command.input),
  }
  const elapsedSinceAuthority = Math.max(0, nowMs - source.lastAdvancedAtMs)
  const tickCount = Math.min(
    MAX_CATCH_UP_TICKS,
    Math.floor(elapsedSinceAuthority / PVP_FIXED_TICK_MS),
  )
  if (tickCount === 0) return advancePvPAuthority(source, [frame], 0, nowMs)

  let state = source
  for (let tick = 0; tick < tickCount && state.status !== 'completed'; tick += 1) {
    const tickNow = state.lastAdvancedAtMs + PVP_FIXED_TICK_MS
    state = advancePvPAuthority(state, tick === 0 ? [frame] : [], PVP_FIXED_TICK_MS, tickNow)
  }
  return state
}
