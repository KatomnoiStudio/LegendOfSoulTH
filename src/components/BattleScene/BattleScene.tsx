import { useCallback } from 'react'
import { useRealtimeBattle } from '../../hooks/useRealtimeBattle'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import type { Player } from '../../types/player'
import { RealtimeBattleRoom } from './RealtimeBattleRoom'
import styles from './BattleScene.module.css'

/**
 * ทางเข้าห้องต่อสู้ — ห้องเดียวของเกมที่การต่อสู้เกิดขึ้น
 *
 * ระบบเดิมเป็น Turn-based (การ์ดตัวละคร + ปุ่มเลือกคำสั่ง) ถูกแทนที่ด้วย
 * ห้อง Top-down Hack & Slash แบบเรียลไทม์ทั้งหมด — ไม่มี snapshot แบบเทิร์น,
 * ไม่มีการเลือกเป้าหมาย, ไม่มี activeUnit ส่งเข้ามาที่นี่อีกแล้ว
 *
 * Contract กับระบบนอกห้องต่อสู้ยังเหมือนเดิมเป๊ะ: เปิดเมื่อ flow.mode === 'battle'
 * รับ player/stageId แล้วคืนผลผ่าน onComplete หรือ onExit เท่านั้น
 * ห้ามไฟล์นี้ (หรืออะไรใต้มัน) เขียน localStorage / Player / ทอง / กระเป๋าไอเทมเอง
 */
interface BattleSceneProps {
  player: Player
  stageId: string
  onComplete: (result: RealtimeBattleResult) => void
  onExit: () => void
}

export function BattleScene({ player, stageId, onComplete, onExit }: BattleSceneProps) {
  const {
    phase,
    errorMessage,
    runtime,
    snapshot,
    requestExit,
    setJoystick,
    pressAttack,
    pressDash,
  } = useRealtimeBattle({
    player,
    stageId,
    onComplete,
  })

  // หยุดจำลองก่อนเสมอ แล้วค่อยให้ระบบเกมพาผู้เล่นกลับ — กันไม่ให้ลูปเดินต่อระหว่างเปลี่ยนฉาก
  const handleExit = useCallback(() => {
    requestExit()
    onExit()
  }, [onExit, requestExit])

  if (phase === 'error') {
    return (
      <div className={styles.scene}>
        <div className={styles.fallback} role="alert">
          <p>{errorMessage}</p>
          <button type="button" className={styles.exitBtn} onClick={handleExit}>
            กลับไปสำรวจ
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading' || !runtime || !snapshot) {
    return (
      <div className={styles.scene}>
        <div className={styles.fallback} aria-live="polite">
          <p>กำลังเตรียมห้องต่อสู้…</p>
        </div>
      </div>
    )
  }

  return (
    <RealtimeBattleRoom
      runtime={runtime}
      snapshot={snapshot}
      onExit={handleExit}
      onMove={setJoystick}
      onAttack={pressAttack}
      onDash={pressDash}
    />
  )
}
