import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  collectCriticalTextureUrls,
  collectDeferredTextureUrls,
} from '../game/battleSpriteSequences'
import type { CharacterModelKind } from '../game/characters'
import { getCharacter } from '../game/characters'
import { preloadBattleTextures } from '../game/realtimeBattle/battleAssets'
import { toRealtimeBattleResult } from '../game/realtimeBattle/BattleResultAdapter'
import { createRealtimeBattle } from '../game/realtimeBattle/createRealtimeBattle'
import { InputSystem } from '../game/realtimeBattle/InputSystem'
import { startBattleLoop, type BattleLoopHandle } from '../game/realtimeBattle/RealtimeBattleLoop'
import { RealtimeBattleRuntime } from '../game/realtimeBattle/RealtimeBattleRuntime'
import { getEnemyTemplate, getRealtimeStage } from '../game/realtimeBattle/stageConfig'
import type { RealtimeBattleResult, RealtimeBattleSnapshot, Vec2 } from '../game/realtimeBattle/types'
import type { Player } from '../types/player'

/**
 * เชื่อม RealtimeBattleRuntime เข้ากับ React
 *
 * ไฟล์นี้ตั้งใจไม่ยุ่งกับ useBattle.ts เดิมเลย — สเปกข้อ 4 ห้ามทำไฟล์เดียวรองรับทั้ง
 * turn-based และ real-time
 *
 * หน้าที่ทั้งหมดของ hook: เตรียม asset → สร้าง runtime → เปิดลูป → ส่ง snapshot ให้ UI
 * → ทำความสะอาดตอน unmount การจำลองไม่ได้อยู่ใน React state แม้แต่ค่าเดียว
 */

export type BattlePhase = 'loading' | 'error' | 'ready'

interface UseRealtimeBattleOptions {
  player: Player
  stageId: string
  onComplete: (result: RealtimeBattleResult) => void
}

interface UseRealtimeBattleValue {
  phase: BattlePhase
  errorMessage: string | null
  runtime: RealtimeBattleRuntime | null
  snapshot: RealtimeBattleSnapshot | null
  /** ขอออกจากห้อง — หยุดจำลองก่อน แล้วผู้เรียกค่อยพาผู้เล่นกลับ */
  requestExit: () => void
  /** จอยสติกบนจอสัมผัสส่งเวกเตอร์เดินเข้ามาทางนี้ (คีย์บอร์ดต่อตรงกับ InputSystem อยู่แล้ว) */
  setJoystick: (vector: Vec2) => void
  /** ปุ่มโจมตีบนจอสัมผัส */
  pressAttack: () => void
  /** ปุ่มพุ่งหลบบนจอสัมผัส */
  pressDash: () => void
}

/** ชุดเฟรมที่ห้องนี้ต้องใช้ = ตัวละครนำของผู้เล่น + ศัตรูทุกตัวในทุกคลื่นของด่าน */
function collectStageSpriteKinds(stageId: string, player: Player): CharacterModelKind[] {
  const kinds = new Set<CharacterModelKind>()

  const leadId = player.teamSlots.find((id): id is string => id !== null) ?? null
  const lead = getCharacter(leadId)
  if (lead) kinds.add(lead.model.kind)

  const stage = getRealtimeStage(stageId)
  for (const wave of stage?.waves ?? []) {
    for (const entry of wave.enemies) {
      const template = getEnemyTemplate(entry.templateId)
      if (template) kinds.add(template.spriteKind)
    }
  }

  return [...kinds]
}

export function useRealtimeBattle({
  player,
  stageId,
  onComplete,
}: UseRealtimeBattleOptions): UseRealtimeBattleValue {
  const [runtime, setRuntime] = useState<RealtimeBattleRuntime | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /*
    ผู้เล่นถูกอ่านครั้งเดียวตอนเข้าห้อง แล้วเก็บไว้ใน ref

    ถ้าใส่ player ลงใน dependency ของ effect ด้านล่าง การบันทึกข้อมูลผู้เล่นระหว่าง
    ต่อสู้ (ซึ่งสร้าง object ใหม่ทุกครั้ง) จะทำให้ห้องต่อสู้ถูกสร้างใหม่ทั้งห้องกลางคัน
  */
  const playerRef = useRef(player)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  /** กันเรียก onComplete ซ้ำมากกว่าหนึ่งครั้ง (§24) */
  const completedRef = useRef(false)

  /*
    InputSystem อยู่ใน ref ไม่ใช่ state

    มันถูกอ่านทุกเฟรมจำลองและถูกเขียนทุกครั้งที่นิ้วขยับบนจอย — ถ้าเก็บใน state
    จะเกิด re-render ทั้งห้องต่อสู้ทุกการขยับนิ้ว ซึ่งเป็นสิ่งที่สเปกข้อ 8 ห้ามไว้ตรง ๆ
  */
  const inputRef = useRef<InputSystem | null>(null)
  inputRef.current ??= new InputSystem()

  useEffect(() => {
    let cancelled = false
    let created: RealtimeBattleRuntime | null = null
    let loop: BattleLoopHandle | null = null
    let detachKeyboard: (() => void) | null = null
    const input = inputRef.current ?? new InputSystem()

    const state = createRealtimeBattle(stageId, playerRef.current)
    if (!state) {
      setErrorMessage('เริ่มการต่อสู้ไม่ได้ — ไม่พบด่านนี้ หรือยังไม่ได้จัดตัวละครลงทีม')
      return
    }

    const kinds = collectStageSpriteKinds(stageId, playerRef.current)

    const criticalUrls = collectCriticalTextureUrls(kinds)
    // ฉากหลังต้องพร้อมด้วย ไม่งั้นจะเห็นห้องโล่ง ๆ วาบหนึ่งตอนเข้า
    if (state.stage.backgroundAsset) criticalUrls.push(state.stage.backgroundAsset)

    const start = async () => {
      try {
        await preloadBattleTextures(criticalUrls)
        if (cancelled) return
        created = new RealtimeBattleRuntime(state)
        detachKeyboard = input.attachKeyboard()

        loop = startBattleLoop({
          step: (deltaMs) => {
            // ป้อนอินพุตล่าสุดก่อนเดินการจำลองทุกก้าว — runtime ไม่รู้จักคีย์บอร์ด/จอย
            created?.setMoveInput(input.getMoveVector())
            if (input.consumeAttack()) created?.requestAttack()
            if (input.consumeDash()) created?.requestDash()
            created?.step(deltaMs)
          },
        })
        setRuntime(created)

        /*
          ท่าที่เหลือโหลดต่อเบื้องหลัง ไม่กั้นการเปิดห้อง

          ถ้าเฟรมของท่าไหนยังมาไม่ถึงตอนถูกเรียกใช้ ชั้นวาดจะคาเฟรมล่าสุดไว้ก่อน
          (ดู EntitySprite: เปลี่ยน material.map ก็ต่อเมื่อ texture พร้อมแล้วเท่านั้น)
          จึงไม่มีทางเห็นตัวละครหายไปเป็นช่องว่าง
        */
        preloadBattleTextures(collectDeferredTextureUrls(kinds)).catch((cause: unknown) => {
          console.warn('[useRealtimeBattle] โหลดชุดเฟรมส่วนที่เหลือไม่ครบ', cause)
        })
      } catch (cause: unknown) {
        if (cancelled) return
        const detail = cause instanceof Error ? cause.message : String(cause)
        setErrorMessage(`โหลดภาพของห้องต่อสู้ไม่สำเร็จ — ${detail}`)
      }
    }

    void start()

    return () => {
      cancelled = true
      loop?.stop()
      detachKeyboard?.()
      input.reset()
      created?.dispose()
      setRuntime(null)
    }
  }, [stageId])

  const subscribe = useCallback(
    (listener: () => void) => (runtime ? runtime.subscribe(listener) : () => {}),
    [runtime],
  )
  const getSnapshot = useCallback(() => (runtime ? runtime.getSnapshot() : null), [runtime])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  /*
    ส่งผลกลับเมื่อการต่อสู้จบ

    ตอนนี้ runtime ยังไปไม่ถึงสถานะ victory/defeat (ยังไม่มีระบบดาเมจ) — เงื่อนไขนี้
    ใส่ไว้ตั้งแต่ต้นเพราะมันคือ contract ของ hook และเป็นจุดที่ต้องมี guard กันเรียกซ้ำ
    ระบบที่ทำให้สถานะไปถึงจริงจะเข้ามาในงาน Enemy AI / Damage / Battle End ถัดไป
  */
  useEffect(() => {
    if (!runtime || !snapshot) return
    if (snapshot.status !== 'victory' && snapshot.status !== 'defeat') return
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current(toRealtimeBattleResult(runtime.getState(), snapshot.status))
  }, [runtime, snapshot])

  const requestExit = useCallback(() => {
    runtime?.requestExit()
  }, [runtime])

  const setJoystick = useCallback((vector: Vec2) => {
    inputRef.current?.setJoystick(vector)
  }, [])

  const pressAttack = useCallback(() => {
    inputRef.current?.pressAttack()
  }, [])

  const pressDash = useCallback(() => {
    inputRef.current?.pressDash()
  }, [])

  const phase: BattlePhase = errorMessage ? 'error' : runtime && snapshot ? 'ready' : 'loading'

  return { phase, errorMessage, runtime, snapshot, requestExit, setJoystick, pressAttack, pressDash }
}
