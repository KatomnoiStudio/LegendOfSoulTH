import { GAME_INFO } from '../../game/gameInfo'
import { ERROR_CODES, type ErrorCode } from './codes'
import { normalizeError, scrubContext, type NormalizedError } from './normalizeError'

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

export type ErrorTier = 'silent' | 'visible'

/**
 * ก้อนรายงานหนึ่งใบ — ทุกฟิลด์ serialize ได้และผ่านการล้างข้อมูลอ่อนไหวแล้ว
 *
 * มีเวอร์ชันเกมติดมาด้วยเสมอ เพราะรายงานที่ไม่รู้ว่ามาจากรุ่นไหนแทบใช้วินิจฉัยไม่ได้
 * (บั๊กที่แก้ไปแล้วสองรุ่นก่อนกับบั๊กที่เพิ่งเกิด หน้าตาเหมือนกันทุกอย่าง) และมี
 * correlationId ไว้ให้ผู้เล่นอ้างอิงรายงานใบเดียวได้ตรง ๆ ตอนแจ้งปัญหา
 */
export interface ErrorReport {
  code: ErrorCode
  /** ข้อความไทยประจำรหัสจาก ERROR_CODES */
  message: string
  tier: ErrorTier
  version: string
  correlationId: string
  timestamp: string
  error: NormalizedError | null
  context?: Record<string, unknown>
}

/**
 * ปลายทางของรายงาน — จุดต่อเดียวสำหรับ "ส่ง error ออกนอกเบราว์เซอร์" ถ้าวันหนึ่งจะทำ
 *
 * ตอนนี้ค่าเริ่มต้นคือ console เหมือนเดิมทุกประการ ยังไม่มีการส่งออกไปไหนทั้งสิ้น —
 * โปรเจกต์นี้ตัดสินใจไว้แล้วว่าไม่เอา telemetry ภายนอก (ดู .agents/rules/ecc/web/observability.md)
 * ที่ทำไว้คือ "รู" ให้เสียบได้เมื่อเจ้าของโปรเจกต์เลือกปลายทางเอง ไม่ใช่การเลือกแทน
 */
export type ErrorSink = (report: ErrorReport) => void

export const consoleErrorSink: ErrorSink = (report) => {
  const label = `[${report.code}] ${report.message}`
  if (report.tier === 'visible') console.error(label, report)
  else console.debug(label, report)
}

let activeSink: ErrorSink = consoleErrorSink

/** เปลี่ยนปลายทางรายงาน — ส่ง null เพื่อกลับไปใช้ console ตามค่าเริ่มต้น */
export function setErrorSink(sink: ErrorSink | null): void {
  activeSink = sink ?? consoleErrorSink
}

function createCorrelationId(): string {
  /*
    randomUUID ไม่มีในทุก runtime (secure context เท่านั้น, jsdom รุ่นเก่า) — ตัวรายงาน error
    ต้องไม่พังเพราะสร้าง id ไม่ได้ ทางถอยไม่ต้องแข็งแรงเชิงเข้ารหัส แค่ต้องแยกใบได้พอ
  */
  const webCrypto = globalThis.crypto
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID()
  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

type VisibleErrorHandler = (code: ErrorCode, error: NormalizedError | null) => void

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
  tier: ErrorTier,
  err?: unknown,
  context?: Record<string, unknown>,
): void {
  /*
    normalize ก่อนส่งต่อทุกทาง ไม่ใช่ปล่อยค่าดิบ

    ค่าดิบพอไปถึงปลายทางที่ไม่ใช่ console (sink, ไฟล์, ข้อความที่ผู้เล่นก๊อป) จะกลายเป็น {}
    เพราะฟิลด์ของ Error เป็น non-enumerable — และ error ของ Supabase จะเหลือแต่ message
    กว้าง ๆ โดยทิ้ง code/details/hint ที่บอกสาเหตุจริงไปทั้งหมด (ดู normalizeError.ts)
  */
  /*
    ตัวแปลงมี guard ของมันเองอยู่แล้ว (ดู readProperty ใน normalizeError.ts) ตรงนี้เป็นชั้นที่สอง

    ไม่ได้ซ้ำซ้อนเปล่า ๆ — มันทำให้ "reportError โยนไม่ได้" เป็นคุณสมบัติเชิงโครงสร้างของฟังก์ชันนี้
    แทนที่จะเป็นสัญญาที่ต้องไปไล่ตรวจว่าทุกจุดที่อ่านฟิลด์ในไฟล์อื่นยัง guard ครบอยู่ไหม
    ฟังก์ชันนี้คือตาข่ายชั้นสุดท้าย ถ้ามันโยนเองก็ไม่เหลืออะไรมารับต่อแล้ว
  */
  let error: NormalizedError | null = null
  let safeContext: Record<string, unknown> | undefined
  try {
    error = normalizeError(err)
    safeContext = context ? scrubContext(context) : undefined
  } catch {
    error = { value: '[unreadable]' }
  }

  const report: ErrorReport = {
    code,
    message: ERROR_CODES[code],
    tier,
    version: GAME_INFO.version,
    correlationId: createCorrelationId(),
    timestamp: new Date().toISOString(),
    error,
    ...(safeContext ? { context: safeContext } : {}),
  }

  try {
    activeSink(report)
  } catch {
    // sink พังต้องไม่กลบต้นเหตุจริง ด้วยเหตุผลเดียวกับตัวรับด้านล่าง
    console.error(`[reportError] sink พังเองตอนจัดการ ${code}`)
  }

  if (tier !== 'visible') return

  /*
    ตัวรับพังต้องไม่ลาก reportError ล้มไปด้วย

    ฟังก์ชันนี้ถูกเรียกจากใน catch เป็นส่วนใหญ่ ถ้ามันโยนข้อผิดพลาดเองจะกลบต้นเหตุจริง
    ที่กำลังจะถูกจัดการอยู่ แล้วกลายเป็นว่าตัวรายงานข้อผิดพลาดคือข้อผิดพลาดเสียเอง
  */
  for (const handler of visibleHandlers) {
    try {
      handler(code, error)
    } catch {
      console.error(`[reportError] ตัวรับแจ้ง error พังเองตอนจัดการ ${code}`)
    }
  }
}
