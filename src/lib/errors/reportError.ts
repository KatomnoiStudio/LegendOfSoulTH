import { ERROR_CODES, type ErrorCode } from './codes'

/**
 * จุดเดียวที่อนุญาตให้เรียก console.error/warn/debug ตรง ๆ ในทั้งแอป
 * (oxlint's no-console เปิดไว้ + exempt เฉพาะโฟลเดอร์นี้ ดู .oxlintrc.json)
 *
 * tier ตัดสินว่า error นี้ควรขึ้นกล่องแดงให้ผู้เล่นเห็นไหม:
 *   'silent'  — log ไว้ให้ grep เจอด้วย code เท่านั้น ไม่โผล่ UI (error ที่เกมรับมือ
 *               ได้เองอยู่แล้ว เช่น เสียงเล่นไม่ได้, localStorage เต็ม)
 *   'visible' — เกิดจริงและกระทบผู้เล่นเห็นชัด ผู้เรียกต้องเอา code ไปแสดงในกล่อง error
 *               เอง (ErrorBoundary/LobbyScene ทำแบบนี้อยู่แล้ว — reportError ไม่ได้
 *               จัดการ UI ให้ แค่ log ตรงตาม tier เดียวกัน)
 *
 * ── ทำไมถึงมีตัวส่งต่อกลาง (แก้คำตัดสินเดิม 2026-08-07) ──────────────────
 * เดิมไฟล์นี้เขียนว่า "ไม่มี store/context ส่วนกลาง — จุดที่เรียกรู้ code ของตัวเองอยู่แล้ว
 * แสดงเองได้ตรง ๆ" ซึ่งถูกตอนที่เขียน เพราะผู้เรียก 'visible' ทุกรายตอนนั้นเป็น component
 * ที่เรนเดอร์ ErrorCodeTag ของตัวเองได้
 *
 * ไม่จริงแล้ว canary สามตัวชี้ตรงกันว่ามีสามที่ที่ tier 'visible' ไม่โผล่บนจอเลย:
 * globalErrorHandlers อยู่นอก React ทั้งหมด (เรียกจาก main.tsx ก่อน createRoot),
 * useAuth.updatePlayer ถูกเรียกเหนือ ToastProvider จึงใช้ useToast ไม่ได้, และจอ error
 * ของห้องต่อสู้แสดงข้อความแต่ไม่แสดง code — 'visible' จึงกลายเป็นคำโกหกในสัญญาของตัวเอง
 *
 * ตัวส่งต่อด้านล่างเล็กที่สุดเท่าที่พอ: ไม่ใช่ store ไม่มี state ไม่มี context เป็นแค่รายชื่อ
 * callback กับการวนเรียก ผู้เรียกที่แสดงเองได้อยู่แล้วยังแสดงเองต่อไป ไม่ต้องแก้อะไร
 */

type VisibleErrorHandler = (code: ErrorCode, err?: unknown) => void

const visibleHandlers = new Set<VisibleErrorHandler>()

/**
 * รับแจ้งเมื่อมี error tier 'visible' — คืนฟังก์ชันเลิกรับ
 *
 * มีผู้ใช้จริงรายเดียวคือ GlobalErrorBanner ที่อยู่บนสุดของ tree ตั้งใจให้เป็นแบบนั้น:
 * ถ้ามีหลายที่รับแล้วต่างคนต่างแสดง ผู้เล่นจะเจอกล่องซ้อนกันจากเหตุการณ์เดียว
 */
export function subscribeToVisibleErrors(handler: VisibleErrorHandler): () => void {
  visibleHandlers.add(handler)
  return () => visibleHandlers.delete(handler)
}
export function reportError(
  code: ErrorCode,
  tier: 'silent' | 'visible',
  err?: unknown,
  context?: Record<string, unknown>,
): void {
  const label = `[${code}] ${ERROR_CODES[code]}`
  const method = tier === 'visible' ? 'error' : 'debug'
  if (context) {
    console[method](label, err, context)
  } else {
    console[method](label, err)
  }

  if (tier !== 'visible') return

  /*
    ตัวรับพังต้องไม่ลาก reportError ล้มไปด้วย

    ฟังก์ชันนี้ถูกเรียกจากใน catch เป็นส่วนใหญ่ ถ้ามันโยนข้อผิดพลาดเองจะกลบต้นเหตุจริง
    ที่กำลังจะถูกจัดการอยู่ แล้วกลายเป็นว่าตัวรายงานข้อผิดพลาดคือข้อผิดพลาดเสียเอง
  */
  for (const handler of visibleHandlers) {
    try {
      handler(code, err)
    } catch {
      console.error(`[reportError] ตัวรับแจ้ง error พังเองตอนจัดการ ${code}`)
    }
  }
}
