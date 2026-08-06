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
 * ไม่มี store/context ส่วนกลาง — จุดที่เรียกรู้ code ของตัวเองอยู่แล้ว แสดงเองได้ตรง ๆ
 * ไม่ต้องมีกลไกกลางมาส่งต่อ (คุยกันไว้ตอน ask-CB แล้วว่า over-engineer ถ้ามี)
 */
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
}
