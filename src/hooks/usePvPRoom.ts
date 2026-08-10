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
import type {
  PvPAuthorityState,
  PvPInputFrame,
  PvPRoomSummary,
  RealtimePvPResult,
} from '../game/pvp/pvpTypes'
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
  const outboundFrame = useRef<PvPInputFrame | null>(null)
  const requestInFlight = useRef(false)
  const roomId = room?.roomId
  const roomStatus = room?.status

  const acceptAuthority = useCallback(
    (
      stateVersion: number,
      authoritative: PvPAuthorityState,
      nextResult: RealtimePvPResult | null = null,
    ): boolean => {
      if (!reconciler.current) {
        reconciler.current = new PvPReconciler(player.id, authoritative, stateVersion)
      } else if (!reconciler.current.reconcile(authoritative, stateVersion, Date.now()).accepted) {
        return false
      }
      setState(reconciler.current.getState())
      setRoom((current) =>
        current
          ? {
              ...current,
              stateVersion,
              status: authoritative.status,
              authoritativeState: authoritative,
            }
          : current,
      )
      const resolvedResult = nextResult ?? toRealtimePvPResult(authoritative)
      if (resolvedResult) setResult(resolvedResult)
      return true
    },
    [player.id],
  )

  useEffect(() => {
    if (!roomId) return
    const unsubscribe = subscribeToPrivatePvPRoom(
      roomId,
      (response) => {
        acceptAuthority(response.stateVersion, response.authoritativeState, response.result)
      },
      setConnected,
    )
    void invokePvPAuthority(roomId, { action: 'reconnect' })
      .then((response) =>
        acceptAuthority(response.stateVersion, response.authoritativeState, response.result),
      )
      .catch((cause: unknown) => reportError('PVP_RECONNECT_FAIL', 'silent', cause))

    return () => {
      unsubscribe()
      void invokePvPAuthority(roomId, { action: 'disconnect' }).catch((cause: unknown) =>
        reportError('PVP_DISCONNECT_FAIL', 'silent', cause),
      )
    }
  }, [acceptAuthority, roomId])

  useEffect(() => {
    if (!roomId || roomStatus === 'waiting' || state?.status === 'completed') return
    const timer = window.setInterval(() => {
      if (requestInFlight.current) return
      requestInFlight.current = true
      let frame = outboundFrame.current
      if (!frame) {
        sequence.current += 1
        frame = {
          playerId: player.id,
          sequence: sequence.current,
          clientTick: sequence.current,
          input: { ...input.current },
        }
        outboundFrame.current = frame
        input.current.basicAttackPressed = false
        input.current.skill1Pressed = false
        input.current.skill2Pressed = false
        input.current.skill3Pressed = false
        input.current.ultimatePressed = false
        if (reconciler.current) {
          setState(reconciler.current.predict(frame, Date.now()))
        }
      }
      void invokePvPAuthority(roomId, {
        action: 'input',
        sequence: frame.sequence,
        clientTick: frame.clientTick,
        input: frame.input,
      })
        .then((response) => {
          if (outboundFrame.current?.sequence === frame.sequence) outboundFrame.current = null
          acceptAuthority(response.stateVersion, response.authoritativeState, response.result)
          setError(null)
          return undefined
        })
        .catch((cause: unknown) => {
          reportError('PVP_INPUT_FAIL', 'silent', cause)
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
        .then((response) =>
          acceptAuthority(response.stateVersion, response.authoritativeState, response.result),
        )
        .catch((cause: unknown) => reportError('PVP_RECONNECT_FAIL', 'silent', cause))
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
        outboundFrame.current = null
        reconciler.current = null
        setRoom(nextRoom)
        if (nextRoom.authoritativeState) {
          acceptAuthority(nextRoom.stateVersion, nextRoom.authoritativeState)
        }
      } catch (cause) {
        // สร้าง/เข้าร่วมห้องล้มคือจุดที่ผู้เล่นเข้า PvP ไม่ได้เลย เดิมมีแต่ข้อความบนจอ
        // ไม่มีรายงานสักบรรทัด — อาการ "กดแล้วไม่เข้า" จึงมองไม่เห็นจากฝั่ง log ทั้งหมด
        reportError('PVP_ROOM_ACTION_FAIL', 'silent', cause)
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
