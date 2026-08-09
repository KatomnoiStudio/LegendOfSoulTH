import type { PlayerInputState } from '../realtimeBattle/playerInput'
import type { RealtimeBattleEntity } from '../realtimeBattle/types'

export type PvPMatchStatus = 'waiting' | 'active' | 'reconnecting' | 'completed'
export type PvPResultReason = 'knockout' | 'forfeit' | 'double-forfeit' | 'simultaneous-knockout'

export interface PvPInputFrame {
  playerId: string
  sequence: number
  clientTick: number
  input: PlayerInputState
}

export interface SerializableComboState {
  attackId: string | null
  chainIndex: number
  sinceStartMs: number
  sinceLastFinishMs: number
  bufferedInputAgeMs: number | null
  hitTargetIds: string[]
  hitStopRemainingMs: number
}

export interface SerializableSkillState {
  slot: 'skill1' | 'skill2' | 'skill3' | 'ultimate' | null
  sinceStartMs: number
  hitTargetIds: string[]
  strikeHitIds: string[]
  lockedTargetId: string | null
  sideEffectsApplied: boolean
}

export interface PvPParticipantState {
  playerId: string
  heroId: string
  entity: RealtimeBattleEntity
  summons: RealtimeBattleEntity[]
  combo: SerializableComboState
  skill: SerializableSkillState
  latestInput: PlayerInputState
  pendingActions: Array<'attack' | 'skill1' | 'skill2' | 'skill3' | 'ultimate'>
  lastProcessedSequence: number
  connected: boolean
  lastSeenAtMs: number
  disconnectedAtMs: number | null
}

export interface PvPAuthorityState {
  matchId: string
  stageId: string
  tick: number
  elapsedMs: number
  /** Trusted wall-clock checkpoint; clients cannot advance fixed ticks faster than this. */
  lastAdvancedAtMs: number
  status: PvPMatchStatus
  participants: [PvPParticipantState, PvPParticipantState]
  winnerPlayerId: string | null
  loserPlayerId: string | null
  resultReason: PvPResultReason | null
  /** Authority wall-clock timestamp; null until the match is completed. */
  finishedAt: string | null
  rngSeed: number
  stateHash: string
}

export interface RealtimePvPResult {
  matchId: string
  participants: [string, string]
  winnerPlayerId: string | null
  loserPlayerId: string | null
  reason: PvPResultReason
  finalStateHash: string
  elapsedMs: number
  finishedAt: string
}

export interface PvPRoomSummary {
  roomId: string
  roomCode: string
  status: PvPMatchStatus
  hostPlayerId: string
  guestPlayerId: string | null
  hostHeroId: string
  guestHeroId: string | null
  stateVersion: number
  authoritativeState: PvPAuthorityState | null
}
