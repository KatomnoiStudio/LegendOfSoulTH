import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { CurrencyResult, GoldSource, ItemResult } from '../../data/accountRepository.shared'
import type { LobbyBattleProgressionRpcPayload } from '../../data/accountRepository.supabase'
import type { PendingLobbyRewardRow } from '../../data/accountRepository.supabase'
import { ErrorBoundary, SceneCrashFallback } from '../ErrorBoundary/ErrorBoundary'
import {
  consumeStageEnergy,
  normalizeEnergy,
  tickEnergyRegen,
} from '../../game/adventure/energySystem'
import {
  finalizeLobbyBattleRewards,
  lobbyBattleTransactionId,
  pendingLobbyRewardToResult,
  type LobbyBattleProgressionCommit,
} from '../../game/reward/lobbyBattleRewardPipeline'
import { ENERGY_GATING_ENABLED } from '../../game/featureFlags'
import { getRealtimeStage, isStageUnlocked } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import { reportError } from '../../lib/errors/reportError'
import type { Player } from '../../types/player'
import { StageSelect } from '../StageSelect/StageSelect'

/**
 * ทางเข้าห้องต่อสู้จากล็อบบี้ — กดปุ่มแล้วเลือกด่านก่อนเข้าห้อง
 *
 * ไฟล์นี้ตั้งใจให้บางที่สุด: เลือกด่าน → เปิดห้อง → แสดงผล → บันทึกรางวัล/ประวัติ → ปิด
 */

const BattleScene = lazy(() =>
  import('../BattleScene/BattleScene').then((m) => ({ default: m.BattleScene })),
)

export function LobbyBattleSession({
  player,
  onPlayerChange,
  onEarnGold,
  onGrantItem,
  onCommitProgression,
  onRecordPending,
  onClearPending,
  onGetPendingRewards,
  onExit,
}: {
  player: Player
  /** คืน true เมื่อบันทึกลงที่เก็บข้อมูลจริง — false แปลว่าหน้าจอถูกย้อนกลับแล้ว */
  onPlayerChange: (next: Player) => Promise<boolean>
  /** ทองจากการเล่น — ต้องผ่าน ledger (earnGold) ไม่ใช่เซตตรง */
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  /** ไอเทมดรอป — ต้องผ่าน grantItem */
  onGrantItem: (
    itemId: string,
    quantity: number,
    source: GoldSource,
    refId?: string,
  ) => Promise<ItemResult>
  onCommitProgression: (
    payload: LobbyBattleProgressionRpcPayload,
  ) => Promise<{ ok: true; player: Player } | { ok: false; error: string }>
  onRecordPending: (result: RealtimeBattleResult, transactionId: string) => Promise<boolean>
  /** คืน false เมื่อลบแถวรางวัลค้างไม่สำเร็จ — pipeline ใช้ค่านี้ ห้ามลดกลับเป็น Promise<void> */
  onClearPending: (transactionId: string) => Promise<boolean>
  onGetPendingRewards: () => Promise<PendingLobbyRewardRow[]>
  onExit: () => void
}) {
  /*
    กันบันทึกผลซ้ำ

    BattleScene เรียก onComplete ครั้งเดียวตอนผู้เล่นกด "กลับล็อบบี้" จากแผงผล
    แต่ตัวนี้เขียนลงข้อมูลผู้เล่นจริง จึงกันไว้อีกชั้น
  */
  const savedRef = useRef(false)
  const playerRef = useRef(player)
  playerRef.current = player
  /** ยังไม่เลือกด่าน = null → แสดงหน้าเลือกด่านก่อน ยังไม่ mount BattleScene */
  const [stageId, setStageId] = useState<string | null>(null)

  /** แถวรางวัลค้างของรอบนี้ที่เขียนไปแล้ว (หรือกำลังเขียน) — คีย์คือรหัสรายการ */
  const recordedRef = useRef<{ txId: string; write: Promise<boolean> } | null>(null)
  /** กู้แถวค้างครั้งเดียวต่อการ mount — ป้องกัน effect ที่ rerun จากการบันทึกซ้ำ */
  const recoveryStartedRef = useRef(false)

  /*
    เขียนแถวรางวัลค้างครั้งเดียวต่อการต่อสู้หนึ่งครั้ง

    The row now goes down at battle end (handleBattleEnd), and the pipeline asks for it again when
    the player presses continue. Handing back the SAME in-flight promise does two things: the
    pipeline waits for the battle-end write instead of racing it (a second write landing after the
    pipeline's clear would resurrect the row it just removed), and a completed write is not
    re-sent — upsert_pending_lobby_reward allows only 20 calls per 60s.

    A write that FAILED is not cached: the player is offline or the RPC is down, and the pipeline
    must be free to try again rather than inherit a permanent false. FAILED covers BOTH shapes —
    a resolved `false` AND a rejection. onRecordPending really can reject: getSupabase() throws
    outright when the env vars are missing (lib/supabaseClient.ts), and with the fetch retry
    wrapper gone a deadline abort surfaces as a thrown fetch error. Caching a rejected promise
    would hand every later retry of this battle the same rejection forever — the durable row
    exists to stop a crash losing rewards, so letting a failed write lose them permanently
    instead is the same bug wearing a different hat.
  */
  const recordPendingOnce = useCallback(
    (result: RealtimeBattleResult, transactionId: string) => {
      const cached = recordedRef.current
      if (cached?.txId === transactionId) return cached.write

      const write = onRecordPending(result, transactionId).then(
        (ok) => {
          if (!ok) recordedRef.current = null
          return ok
        },
        (cause: unknown) => {
          recordedRef.current = null
          // Rethrown, not swallowed: the pipeline reported RPC throws before this cache existed
          // and must keep doing so — handleComplete turns it into a visible BATTLE_REWARD_FAIL.
          throw cause
        },
      )
      recordedRef.current = { txId: transactionId, write }
      return write
    },
    [onRecordPending],
  )

  const buildRewardDeps = useCallback(
    () => ({
      onPlayerChange,
      onEarnGold,
      onGrantItem,
      onCommitProgression: async (payload: LobbyBattleProgressionCommit) => {
        const result = await onCommitProgression(payload)
        if (!result.ok) return { ok: false as const, error: result.error }
        return { ok: true as const, player: result.player }
      },
      onRecordPending: recordPendingOnce,
      onClearPending,
    }),
    [
      onClearPending,
      onCommitProgression,
      onEarnGold,
      onGrantItem,
      onPlayerChange,
      recordPendingOnce,
    ],
  )

  /*
    บันทึกผลลง DB ทันทีที่จบการต่อสู้ ไม่รอผู้เล่นกด

    onComplete ยิงตอนผู้เล่นกด "ต่อไป" บนแผงผล ซึ่งอาจนานเท่าไรก็ได้ — ช่วงนั้นผลการต่อสู้
    อยู่ใน React state ที่เดียว ปิดแท็บ/รีเฟรช/โดนระบบฆ่า = รางวัลทั้งชุดหาย ทั้งที่จ่ายพลังงาน
    เข้าด่านไปแล้ว แถวรางวัลค้างมีไว้กันเรื่องนี้โดยตรง จึงต้องลงก่อนช่วงรอ ไม่ใช่หลัง

    ล้มเหลวตรงนี้ไม่ใช่เรื่องคอขาดบาดตาย — pipeline จะลองเขียนใหม่ตอนกดต่อ (recordPendingOnce
    ไม่แคชผลที่ล้มเหลว) และปฏิเสธการจ่ายรางวัลถ้ายังเขียนไม่ได้ตามเดิม
  */
  const handleBattleEnd = useCallback(
    (result: RealtimeBattleResult) => {
      void recordPendingOnce(result, lobbyBattleTransactionId(result)).catch((cause: unknown) => {
        reportError('REWARD_PENDING_RECORD_FAIL', 'silent', cause)
      })
    },
    [recordPendingOnce],
  )

  useEffect(() => {
    if (recoveryStartedRef.current) return
    recoveryStartedRef.current = true

    let cancelled = false
    void (async () => {
      const pending = await onGetPendingRewards()
      if (cancelled || pending.length === 0 || savedRef.current) return

      for (const row of pending) {
        const result = pendingLobbyRewardToResult(row)
        const pipeline = await finalizeLobbyBattleRewards(
          result,
          playerRef.current,
          buildRewardDeps(),
        )
        // กู้รางวัลค้างจากรอบก่อน — อย่าปิด overlay ทันที ผู้เล่นกด "ต่อสู้" เพื่อเลือกด่าน
        // ถ้า onExit() ตรงนี้จะเห็นแค่กลับล็อบบี้ทันที (ไม่มีหน้าเลือกด่านเลย)
        if (pipeline.ok) return
      }
    })()

    return () => {
      cancelled = true
    }
  }, [buildRewardDeps, onGetPendingRewards])

  const handleSelectStage = useCallback(
    (id: string) => {
      const stage = getRealtimeStage(id)
      if (!stage || !isStageUnlocked(id, player.progress.flags)) return

      if (!ENERGY_GATING_ENABLED) {
        setStageId(id)
        return
      }

      const energy = tickEnergyRegen(normalizeEnergy(player.progress.energy))
      const nextEnergy = consumeStageEnergy(energy, stage)
      void onPlayerChange({
        ...player,
        progress: { ...player.progress, energy: nextEnergy },
      }).then((ok) => {
        if (ok) setStageId(id)
        return ok
      })
    },
    [onPlayerChange, player],
  )

  const handleComplete = useCallback(
    (result: RealtimeBattleResult) => {
      if (savedRef.current) return
      savedRef.current = true

      void (async () => {
        try {
          const pipeline = await finalizeLobbyBattleRewards(
            result,
            playerRef.current,
            buildRewardDeps(),
          )

          if (!pipeline.ok) {
            savedRef.current = false
            if (pipeline.failure === 'progression_save') {
              // updatePlayer แสดง PLAYER_SAVE_FAIL แล้ว — อย่าออกจากห้อง
              return
            }
            if (pipeline.failure === 'gold_grant') {
              reportError('REWARD_GOLD_FAIL', 'visible')
              return
            }
            if (pipeline.failure === 'item_grant') {
              reportError('REWARD_ITEM_FAIL', 'visible')
              return
            }
            return
          }

          onExit()
        } catch (cause: unknown) {
          savedRef.current = false
          reportError('BATTLE_REWARD_FAIL', 'visible', cause)
        }
      })()
    },
    [buildRewardDeps, onExit],
  )

  // เช็คซ้ำก่อน mount เสมอ (ไม่ใช่แค่ตอนแสดงรายการ) — กันด่านล็อกหลุดเข้าห้องต่อสู้แม้ผ่าน
  // ทางที่ไม่ได้กดจากรายการนี้ตรง ๆ (เช่น state ค้างจาก re-render)
  if (!stageId || !isStageUnlocked(stageId, player.progress.flags)) {
    return <StageSelect progress={player.progress} onSelect={handleSelectStage} onClose={onExit} />
  }

  return (
    <ErrorBoundary
      fallback={
        <SceneCrashFallback
          message="ห้องต่อสู้ขัดข้อง กลับล็อบบี้แล้วลองใหม่"
          onBack={onExit}
          backLabel="กลับล็อบบี้"
        />
      }
    >
      <Suspense fallback={null}>
        <BattleScene
          player={player}
          stageId={stageId}
          onComplete={handleComplete}
          onBattleEnd={handleBattleEnd}
          onExit={onExit}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
