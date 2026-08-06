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
  /**
   * ตัวจ่ายเฟรมและสถานะการมองเห็น — ปกติไม่ต้องส่ง ใช้ของเบราว์เซอร์
   *
   * มีไว้ให้เทสต์สั่งเวลาได้ตรง ๆ ว่าเฟรมถัดไปมาถึงตอนไหน แทนที่จะต้อง stub global
   * รูปแบบเดียวกับ `attachKeyboard(target: Window = window)` ใน InputSystem และ
   * `random: RandomFn = Math.random` ใน RealtimeBattleRuntime — ไฟล์อื่นในโฟลเดอร์นี้
   * เทสต์ได้ง่ายเพราะมี seam แบบนี้ ลูปเป็นตัวเดียวที่ยังไม่มี
   */
  scheduler?: BattleLoopScheduler
}

export interface BattleLoopScheduler {
  requestFrame: (cb: (nowMs: number) => void) => number
  cancelFrame: (id: number) => void
  /** true เมื่อแท็บถูกซ่อน — ลูปหยุดจำลองระหว่างนั้น */
  isHidden: () => boolean
  /** สมัครฟังการเปลี่ยนสถานะการมองเห็น คืนฟังก์ชันถอด */
  onVisibilityChange: (handler: () => void) => () => void
}

const browserScheduler: BattleLoopScheduler = {
  requestFrame: (cb) => window.requestAnimationFrame(cb),
  cancelFrame: (id) => window.cancelAnimationFrame(id),
  isHidden: () => document.visibilityState === 'hidden',
  onVisibilityChange: (handler) => {
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  },
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
export function startBattleLoop({
  step,
  onFrame,
  scheduler = browserScheduler,
}: BattleLoopOptions): BattleLoopHandle {
  let frameId = 0
  /*
    null = ยังไม่ได้ตั้งเวลาอ้างอิง (ตอนเริ่ม และตอนกลับจากแท็บที่ถูกซ่อน)

    เดิมใช้เลข 0 เป็นสัญญาณนี้ ซึ่งชนกับค่าเวลาจริงที่เป็นไปได้ — requestAnimationFrame
    นับจากตอนโหลดหน้าจึงแทบไม่มีทางเป็น 0 พอดี แต่ "แทบไม่มีทาง" กับ "ไม่มีทาง" ต่างกัน
    และ scheduler ที่ฉีดเข้ามาได้ก็ป้อน 0 ได้เต็มที่ ใช้ null แยกสองความหมายออกจากกันชัด ๆ
  */
  let lastTimeMs: number | null = null
  let accumulatorMs = 0
  let stopped = false

  const handleVisibilityChange = () => {
    // กลับมาจาก background: ทิ้งเวลาที่หายไป ไม่เอามาไล่ step ย้อนหลัง
    if (!scheduler.isHidden()) lastTimeMs = null
  }

  const tick = (nowMs: number) => {
    if (stopped) return
    frameId = scheduler.requestFrame(tick)

    if (scheduler.isHidden()) return

    if (lastTimeMs === null) {
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

  const detachVisibility = scheduler.onVisibilityChange(handleVisibilityChange)
  frameId = scheduler.requestFrame(tick)

  return {
    stop: () => {
      stopped = true
      scheduler.cancelFrame(frameId)
      detachVisibility()
    },
  }
}
