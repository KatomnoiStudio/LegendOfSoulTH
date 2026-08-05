/**
 * ตัวขับเวลาของห้องต่อสู้ — Fixed-step simulation บน requestAnimationFrame
 *
 * ทำไมต้อง fixed-step: ถ้าเอา delta ดิบของแต่ละเฟรมไปคูณความเร็ว ผลลัพธ์จะต่างกัน
 * ระหว่างเครื่อง 60 FPS กับ 30 FPS (และกระตุกตอนเฟรมตก) การจำลองจึงเดินเป็นก้าวคงที่
 * 60 Hz แล้วสะสมเศษเวลาไว้ในตัวแปร accumulator — เครื่องช้าเรียก step หลายครั้งต่อเฟรม
 * เครื่องเร็วอาจไม่เรียกเลยในบางเฟรม แต่ผลจำลองเท่ากัน (§8, §21 deterministic)
 *
 * ห้ามใช้ setInterval แยกตามระบบเด็ดขาด (§8) — ทุกระบบเดินจากลูปเดียวนี้
 */

export const FIXED_STEP_MS = 1000 / 60

/**
 * เพดานเวลาที่ยอมไล่เก็บย้อนหลังในหนึ่งเฟรม
 *
 * กันอาการ "spiral of death": ถ้าสลับแท็บกลับมาแล้ว delta เป็นหลายวินาที
 * การไล่ step ให้ครบจะกินเวลานานกว่าหนึ่งเฟรม ทำให้ delta ถัดไปยิ่งใหญ่ขึ้นอีก
 */
const MAX_ACCUMULATED_MS = 200

export interface BattleLoopOptions {
  /** เดินการจำลองหนึ่งก้าวคงที่ */
  step: (fixedDeltaMs: number) => void
  /** เรียกหนึ่งครั้งต่อเฟรมภาพ หลัง step ครบแล้ว — ใช้สำหรับงานที่อิงเฟรมจริง */
  onFrame?: () => void
}

export interface BattleLoopHandle {
  stop: () => void
}

/**
 * เริ่มลูปจำลอง คืน handle ไว้หยุด
 *
 * หยุดจำลองอัตโนมัติเมื่อแท็บถูกซ่อน (§28 pause เมื่ออยู่ background) และเมื่อกลับมา
 * จะรีเซ็ตเวลาอ้างอิงก่อน ไม่งั้นจะได้ delta ก้อนใหญ่แล้วตัวละครกระโดดข้ามห้อง
 */
export function startBattleLoop({ step, onFrame }: BattleLoopOptions): BattleLoopHandle {
  let frameId = 0
  let lastTimeMs = 0
  let accumulatorMs = 0
  let stopped = false

  const onVisibilityChange = () => {
    // กลับมาจาก background: ทิ้งเวลาที่หายไป ไม่เอามาไล่ step ย้อนหลัง
    if (document.visibilityState === 'visible') lastTimeMs = 0
  }

  const tick = (nowMs: number) => {
    if (stopped) return
    frameId = window.requestAnimationFrame(tick)

    if (document.visibilityState === 'hidden') return

    if (lastTimeMs === 0) {
      lastTimeMs = nowMs
      return
    }

    accumulatorMs = Math.min(MAX_ACCUMULATED_MS, accumulatorMs + (nowMs - lastTimeMs))
    lastTimeMs = nowMs

    while (accumulatorMs >= FIXED_STEP_MS) {
      accumulatorMs -= FIXED_STEP_MS
      step(FIXED_STEP_MS)
    }

    onFrame?.()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  frameId = window.requestAnimationFrame(tick)

  return {
    stop: () => {
      stopped = true
      window.cancelAnimationFrame(frameId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    },
  }
}
