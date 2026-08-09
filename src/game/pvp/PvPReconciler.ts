import { advancePvPAuthority, hashPvPAuthorityState, PVP_FIXED_TICK_MS } from './PvPAuthorityEngine'
import type { PvPAuthorityState, PvPInputFrame } from './pvpTypes'

export interface PvPReconciliationReport {
  accepted: boolean
  stateVersion: number
  corrected: boolean
  previousHash: string
  authoritativeHash: string
  replayedInputCount: number
  maxPositionError: number
  maxHpError: number
}

/**
 * Client prediction is disposable: authoritative snapshots always win, then locally-acked input
 * frames are removed and the still-pending frames are replayed exactly once.
 */
export class PvPReconciler {
  private predicted: PvPAuthorityState
  private pendingInputs: PvPInputFrame[] = []
  private readonly localPlayerId: string
  private acceptedStateVersion: number

  constructor(localPlayerId: string, initial: PvPAuthorityState, initialStateVersion = 0) {
    this.localPlayerId = localPlayerId
    this.predicted = initial
    this.acceptedStateVersion = initialStateVersion
  }

  predict(frame: PvPInputFrame, nowMs: number): PvPAuthorityState {
    if (frame.playerId !== this.localPlayerId) {
      throw new Error('A client may only predict its own input')
    }
    this.pendingInputs.push(frame)
    this.predicted = advancePvPAuthority(this.predicted, [frame], PVP_FIXED_TICK_MS, nowMs)
    return this.predicted
  }

  reconcile(
    authoritative: PvPAuthorityState,
    stateVersion: number,
    nowMs: number,
  ): PvPReconciliationReport {
    const previous = this.predicted
    if (stateVersion <= this.acceptedStateVersion) {
      return {
        accepted: false,
        stateVersion: this.acceptedStateVersion,
        corrected: false,
        previousHash: hashPvPAuthorityState(previous),
        authoritativeHash: authoritative.stateHash,
        replayedInputCount: this.pendingInputs.length,
        maxPositionError: 0,
        maxHpError: 0,
      }
    }
    const acknowledged = authoritative.participants.find(
      (participant) => participant.playerId === this.localPlayerId,
    )?.lastProcessedSequence
    if (acknowledged === undefined) throw new Error('Local participant is absent from authority')

    this.pendingInputs = this.pendingInputs.filter((frame) => frame.sequence > acknowledged)
    if (authoritative.status === 'completed') this.pendingInputs = []
    this.predicted = authoritative
    this.acceptedStateVersion = stateVersion
    for (const frame of this.pendingInputs) {
      this.predicted = advancePvPAuthority(this.predicted, [frame], PVP_FIXED_TICK_MS, nowMs)
    }

    const maxPositionError = Math.max(
      ...authoritative.participants.map((participant, index) => {
        const predicted = previous.participants[index]
        return Math.hypot(
          participant.entity.position.x - predicted.entity.position.x,
          participant.entity.position.y - predicted.entity.position.y,
        )
      }),
    )
    const maxHpError = Math.max(
      ...authoritative.participants.map((participant, index) =>
        Math.abs(participant.entity.hp - previous.participants[index].entity.hp),
      ),
    )
    const previousHash = hashPvPAuthorityState(previous)
    return {
      accepted: true,
      stateVersion,
      corrected: previousHash !== authoritative.stateHash,
      previousHash,
      authoritativeHash: authoritative.stateHash,
      replayedInputCount: this.pendingInputs.length,
      maxPositionError,
      maxHpError,
    }
  }

  getState(): PvPAuthorityState {
    return this.predicted
  }

  getPendingInputCount(): number {
    return this.pendingInputs.length
  }

  getAcceptedStateVersion(): number {
    return this.acceptedStateVersion
  }
}
