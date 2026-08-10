/**
 * แปลงค่าที่ถูกโยนออกมา (อะไรก็ได้) ให้เป็นก้อนข้อมูลที่ serialize ได้จริง
 *
 * ── ทำไมต้องมี ────────────────────────────────────────────────────────────
 * `JSON.stringify(new Error('x'))` คืน `{}` เพราะ name/message/stack เป็น non-enumerable
 * ทั้งหมด ตราบใดที่ reportError ส่งค่าดิบให้ console เฉย ๆ เรายังพอเห็นใน devtools แต่
 * ปลายทางอื่นใด (sink ที่จะเลือกทีหลัง, การเก็บลงไฟล์, การให้ผู้เล่นก๊อปไปแปะ) จะได้ `{}`
 * เปล่า ๆ — error หายทั้งก้อนโดยไม่มีใครรู้
 *
 * นอกจากนั้น error ของ Supabase (PostgrestError) ไม่ใช่ Error จริง มันเป็น object ธรรมดา
 * ที่มี code/details/hint ซึ่งเป็นข้อมูลที่บอกสาเหตุได้ตรงที่สุด (เช่น 42501 = RLS ปฏิเสธ)
 * ถ้าอ่านแค่ .message จะเหลือแต่ข้อความกว้าง ๆ ที่วินิจฉัยอะไรไม่ได้เลย
 *
 * ── ขอบเขต ────────────────────────────────────────────────────────────────
 * ตัวนี้ "อ่านและล้าง" เท่านั้น ไม่ตัดสินใจว่าจะส่งไปไหน (นั่นเป็นหน้าที่ของ sink ใน
 * reportError.ts) และล้างข้อมูลอ่อนไหวออกเสมอ เพราะรายงานอาจถูกส่งออกนอกเครื่องผู้เล่นได้
 * ในอนาคต — ล้างตั้งแต่ต้นทางปลอดภัยกว่าไปหวังว่าปลายทางจะล้างให้
 */

const REDACTED = '[redacted]'

/** คีย์ที่ห้ามหลุดออกจากเครื่องผู้เล่นไม่ว่ากรณีใด */
const SENSITIVE_KEY = /pass|secret|token|auth|jwt|cookie|salt|hash|credential|email|api[-_]?key/i

/** อีเมลที่ปนมาในข้อความ/stack — ตัวข้อความไม่มีคีย์ให้จับ ต้องจับที่รูปแบบแทน */
const EMAIL_IN_TEXT = /[\w.+-]+@[\w-]+\.[\w.-]+/g

/** ลึกกว่านี้ไม่ได้ช่วยวินิจฉัยเพิ่ม แต่ทำให้รายงานบวมและเสี่ยง cycle */
const MAX_CAUSE_DEPTH = 5
const MAX_CONTEXT_DEPTH = 4
const MAX_DETAIL_LENGTH = 160

export interface NormalizedError {
  name?: string
  message?: string
  stack?: string
  /** PostgrestError.code / DOMException-like code — ตัวชี้สาเหตุที่แม่นกว่า message */
  code?: string
  details?: string
  hint?: string
  /** `Error.cause` ที่ถูกแปลงต่อเป็นชั้น ๆ */
  cause?: NormalizedError
  /** ค่าที่ไม่ใช่ Error (string/number/object ธรรมดา) ที่ถูกโยนออกมา */
  value?: string
}

export function scrubText(text: string): string {
  return text.replace(EMAIL_IN_TEXT, REDACTED)
}

function scrubValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubText(value)
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[circular]'
  if (depth >= MAX_CONTEXT_DEPTH) return '[truncated]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1, seen))

  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(item, depth + 1, seen)
  }
  return out
}

/** ล้าง context ที่ผู้เรียกแนบมา — คีย์อ่อนไหวถูกแทนที่ ไม่ใช่ถูกตัดทิ้ง (ยังรู้ว่ามีฟิลด์นั้นอยู่) */
export function scrubContext(context: Record<string, unknown>): Record<string, unknown> {
  return scrubValue(context, 0, new WeakSet()) as Record<string, unknown>
}

function stringifySafely(value: object): string {
  try {
    return scrubText(JSON.stringify(scrubValue(value, 0, new WeakSet())) ?? String(value))
  } catch {
    // toString ของ object แปลก ๆ ก็โยนได้ — ตัวแปลง error ต้องไม่กลายเป็น error เสียเอง
    return '[unserializable]'
  }
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' ? value : undefined
}

export function normalizeError(
  err: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): NormalizedError | null {
  if (err === null || err === undefined) return null
  if (typeof err !== 'object') return { value: scrubText(String(err)) }
  if (seen.has(err)) return { value: '[circular]' }
  seen.add(err)

  const source = err as Record<string, unknown>
  const out: NormalizedError = {}

  const name = readString(source, 'name')
  if (name) out.name = name
  const message = readString(source, 'message')
  if (message) out.message = scrubText(message)
  const stack = readString(source, 'stack')
  if (stack) out.stack = scrubText(stack)

  // PostgrestError: code/details/hint คือส่วนที่บอกสาเหตุจริง อ่านแยกเพราะ message ของมันกว้างเกิน
  const code = readString(source, 'code')
  if (code) out.code = code
  const details = readString(source, 'details')
  if (details) out.details = scrubText(details)
  const hint = readString(source, 'hint')
  if (hint) out.hint = scrubText(hint)

  if (source.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
    const cause = normalizeError(source.cause, depth + 1, seen)
    if (cause) out.cause = cause
  }

  // object ที่ไม่มีฟิลด์มาตรฐานสักตัว (เช่น `throw { reason: 'x' }`) ต้องไม่กลายเป็น {} เปล่า
  if (Object.keys(out).length === 0) out.value = stringifySafely(source)
  return out
}

/**
 * ข้อความสั้นที่เอาไปแสดงบนจอให้ผู้เล่นก๊อปต่อได้ — ไม่ใช่ทั้ง stack
 *
 * รหัส error เป็นตัวหลักตามที่ตัดสินไว้ (ดู .agents/rules/ecc/web/observability.md) บรรทัดนี้
 * เป็นของแถมที่ทำให้รายงานปัญหาหนึ่งใบแยก "RLS ปฏิเสธ" ออกจาก "เน็ตหลุด" ได้โดยไม่ต้องถามกลับ
 */
export function describeNormalizedError(error: NormalizedError | null): string | null {
  if (!error) return null
  const text = [error.code, error.message ?? error.value, error.hint].filter(Boolean).join(' — ')
  if (!text) return null
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}...` : text
}
