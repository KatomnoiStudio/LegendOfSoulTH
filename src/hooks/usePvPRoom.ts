import { useCallback, useEffect, useRef, useState } from 'react'
import type { Player } from '../types/player'
import { createEmptyPlayerInputState, type MovementInput } from '../game/realtimeBattle/playerInput'
import type { SkillSlot } from '../game/realtimeBattle/skills'
import { PvPReconciler } from '../game/pvp/PvPReconciler'
import {
  createPrivatePvPRoom,
  invokePvPAuthority,
  joinPrivatePvPRoom,
  subscribeToPrivatePvPRoom,
} from '../game/pvp/pvpRoomRepository.supabase'
import type { PvPAuthorityState, PvPRoomSummary, RealtimePvPResult } from '../game/pvp/pvpTypes'
import { toRealtimePvPResult } from '../game/pvp/PvPAuthorityEngine'
import { reportError } from '../lib/errors/reportError'

export interface PvPRoomController {
  room: PvPRoomSummary | null
  state: PvPAuthorityState | null
  result: RealtimePvPResult | null
  connected: boolean
  busy: boolean
  error: string | null
  createRoom: (heroId: string) => Promise<void>
  joinRoom: (roomCode: string, heroId: string) => Promise<void>
  setMovement: (movement: MovementInput) => void
  pressAttack: () => void
  pressSkill: (slot: SkillSlot) => void
}

export function usePvPRoom(player: Player): PvPRoomController {
  const [room, setRoom] = useState<PvPRoomSummary | null>(null)
  const [state, setState] = useState<PvPAuthorityState | null>(null)
  const [result, setResult] = useState<RealtimePvPResult | null>(null)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)
  const input = useRef(createEmptyPlayerInputState())
  const reconciler = useRef<PvPReconciler | null>(null)
  const requestInFlight = useRef(false)
  const roomId = room?.roomId
  const roomStatus = room?.status

  const acceptAuthority = useCallback(
    (authoritative: PvPAuthorityState, nextResult: RealtimePvPResult | null = null) => {
      if (!reconciler.current) reconciler.current = new PvPReconciler(player.id, authoritative)
      else reconciler.current.reconcile(authoritative, Date.now())
      setState(reconciler.current.getState())
      const resolvedResult = nextResult ?? toRealtimePvPResult(authoritative)
      if (resolvedResult) setResult(resolvedResult)
    },
    [player.id],
  )

  useEffect(() => {
    if (!roomId) return
    const unsubscribe = subscribeToPrivatePvPRoom(
      roomId,
      (response) => {
        setRoom((current) =>
          current
            ? {
                ...current,
                stateVersion: response.stateVersion,
                status: response.authoritativeState.status,
                authoritativeState: response.authoritativeState,
              }
            : current,
        )
        acceptAuthority(response.authoritativeState, response.result)
      },
      setConnected,
    )
    void invokePvPAuthority(roomId, { action: 'reconnect' })
      .then((response) => acceptAuthority(response.authoritativeState, response.result))
      .catch(() => undefined)

    return () => {
      unsubscribe()
      void invokePvPAuthority(roomId, { action: 'disconnect' }).catch(() => undefined)
    }
  }, [acceptAuthority, roomId])

  useEffect(() => {
    if (!roomId || roomStatus === 'waiting' || state?.status === 'completed') return
    const timer = window.setInterval(() => {
      if (requestInFlight.current) return
      requestInFlight.current = true
      sequence.current += 1
      const frameInput = { ...input.current }
      input.current.basicAttackPressed = false
      input.current.skill1Pressed = false
      input.current.skill2Pressed = false
      input.current.skill3Pressed = false
      input.current.ultimatePressed = false

      const frame = {
        playerId: player.id,
        sequence: sequence.current,
        clientTick: sequence.current,
        input: frameInput,
      }
      if (reconciler.current) {
        setState(reconciler.current.predict(frame, Date.now()))
      }
      void invokePvPAuthority(roomId, {
        action: 'input',
        sequence: frame.sequence,
        clientTick: frame.clientTick,
        input: frame.input,
      })
        .then((response) => {
          acceptAuthority(response.authoritativeState, response.result)
          setError(null)
          return undefined
        })
        .catch((cause: unknown) => {
          reportError('PVP_AUTHORITY_FAIL', 'silent', cause)
          setError('การเชื่อมต่อห้อง PvP สะดุด กำลังรอเชื่อมใหม่')
        })
        .finally(() => {
          requestInFlight.current = false
        })
    }, 50)
    return () => window.clearInterval(timer)
  }, [acceptAuthority, player.id, roomId, roomStatus, state?.status])

  useEffect(() => {
    if (!roomId) return
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      void invokePvPAuthority(roomId, { action: 'reconnect' })
        .then((response) => acceptAuthority(response.authoritativeState, response.result))
        .catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [acceptAuthority, roomId])

  const runRoomAction = useCallback(
    async (action: () => Promise<PvPRoomSummary>) => {
      setBusy(true)
      setError(null)
      try {
        const nextRoom = await action()
        sequence.current = 0
        reconciler.current = null
        setRoom(nextRoom)
        if (nextRoom.authoritativeState) acceptAuthority(nextRoom.authoritativeState)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'ทำรายการห้อง PvP ไม่สำเร็จ')
      } finally {
        setBusy(false)
      }
    },
    [acceptAuthority],
  )

  return {
    room,
    state,
    result,
    connected,
    busy,
    error,
    createRoom: (heroId) => runRoomAction(() => createPrivatePvPRoom(heroId)),
    joinRoom: (roomCode, heroId) => runRoomAction(() => joinPrivatePvPRoom(roomCode, heroId)),
    setMovement: (movement) => {
      input.current.moveX = movement.x
      input.current.moveDepth = movement.depth
    },
    pressAttack: () => {
      input.current.basicAttackPressed = true
    },
    pressSkill: (slot) => {
      if (slot === 'skill1') input.current.skill1Pressed = true
      else if (slot === 'skill2') input.current.skill2Pressed = true
      else if (slot === 'skill3') input.current.skill3Pressed = true
      else input.current.ultimatePressed = true
    },
  }
}
