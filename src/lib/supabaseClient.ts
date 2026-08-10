import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * ไคลเอนต์ Supabase ตัวเดียวของทั้งแอป — ไฟล์อื่นห้ามเรียก createClient ซ้ำ
 *
 * ค่า URL/anon key มาจาก .env.local (ดู .env.local.example) — ไม่ commit ไฟล์จริง
 * anon key ไม่ใช่ความลับในความหมายเดิม (ถูกออกแบบให้ฝังใน bundle ฝั่ง client ได้)
 * ความปลอดภัยจริงอยู่ที่ Row Level Security policy ในฝั่ง Postgres (ดู supabase/migrations/)
 * ไม่ใช่การซ่อนคีย์นี้
 *
 * ── ทำไมเป็นฟังก์ชัน ไม่ใช่ `export const supabase` เหมือนเดิม ────────────────
 * ของเดิมอ่าน env แล้ว throw ตั้งแต่ตอน "evaluate module" ซึ่งลามไปทุกคนที่ import ต่อ ๆ กัน:
 * main.tsx ต้องใช้ dynamic import เพื่อเอาตัวรอด, chatStorage ต้อง await import แบบ lazy,
 * และ accountRepository.supabase.mapping.ts ถูกแยกออกมาเป็นไฟล์ต่างหากเพียงเพื่อ "เลี่ยง
 * การ import ไฟล์นี้" (คอมเมนต์ในไฟล์นั้นเขียนไว้ตรง ๆ) — ผลข้างเคียงคือ useAuth.ts ไม่มี
 * เทสต์เลยสักตัว ทั้งที่ hook พี่น้องอีกสี่ตัวมีครบ
 *
 * เลื่อนการสร้างมาเป็นตอนเรียกใช้จริงครั้งแรก การ import ไฟล์นี้จึงไม่มีผลข้างเคียงอีกต่อไป
 */
const REQUEST_TIMEOUT_MS = 15_000

let client: SupabaseClient | null = null

/**
 * fetch ที่มีเพดานเวลา + ลองซ้ำหนึ่งครั้ง — ห่อ global.fetch ของเบราว์เซอร์
 *
 * fetch ของเบราว์เซอร์ไม่มี timeout เป็นค่าเริ่มต้นเลย (ต่างจาก XHR) คำขอที่ค้างจึงไม่เคย
 * reject — หน้าจอผลการต่อสู้ค้างแช่โดยไม่มีทั้ง spinner และข้อความ ไม่มีอะไรบอกผู้เล่นว่า
 * เกิดอะไรขึ้นและไม่มีทางกดใหม่
 *
 * ลองซ้ำได้แค่กรณี "ยังไม่มีคำตอบจากเซิร์ฟเวอร์" (network error/timeout) กับ 5xx เท่านั้น
 * และซ้ำได้ครั้งเดียว — 4xx คือคำตอบจริงของเซิร์ฟเวอร์ ยิงซ้ำไม่มีทางเปลี่ยนผล
 * ที่ยิงซ้ำได้โดยไม่ทำเงิน/ไอเทมซ้ำ เพราะ RPC ฝั่ง ledger เป็น idempotent ตาม refId อยู่แล้ว
 * (0013_reward_idempotency.sql — earn_gold/grant_item/commit_lobby_battle_progression)
 *
 * ⚠️ ใช้ได้กับผู้เรียกที่ส่ง (url, init) เท่านั้น ซึ่งเป็นรูปแบบเดียวที่ supabase-js ใช้ —
 * ถ้าส่ง Request object ที่ body ถูกอ่านไปแล้ว การยิงซ้ำจะใช้ body เดิมไม่ได้
 */
export function createResilientFetch(
  baseFetch: typeof fetch,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const timeout = AbortSignal.timeout(timeoutMs)
      const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout

      try {
        const response = await baseFetch(input, { ...init, signal })
        // 5xx = ฝั่งเซิร์ฟเวอร์ล้มชั่วคราว ลองใหม่ได้ / 4xx = คำตอบจริง ยิงซ้ำไม่เปลี่ยนอะไร
        if (response.status < 500 || attempt > 0) return response
      } catch (cause: unknown) {
        // ผู้เรียกยกเลิกเอง (ไม่ใช่ timeout ของเรา) ต้องไม่ถูกยิงซ้ำ
        if (attempt > 0 || init?.signal?.aborted) throw cause
      }
    }
  }
}

/**
 * ไคลเอนต์ตัวจริง — สร้างครั้งแรกที่ถูกเรียก แล้วใช้ตัวเดิมตลอด
 *
 * flowType: 'pkce' — ไม่ใช่ค่าเริ่มต้น (supabase-js v2 default = 'implicit') และตั้งไว้ตั้งใจ
 *
 * implicit flow ส่ง session กลับมาเป็น URL fragment (`#access_token=<JWT>&refresh_token=...`)
 * ซึ่งแปลว่า JWT ของผู้ใช้จะไปโผล่ใน address bar และถูกบันทึกลง history ของเบราว์เซอร์ทุกครั้ง
 * ที่ล็อกอิน แม้ supabase-js จะล้าง URL ให้ทันทีที่อ่านค่าเสร็จก็ตาม — history entry ที่เขียนไป
 * แล้วลบไม่ได้ ส่วน PKCE ส่งกลับมาเป็น `?code=<one-time>` แลกเป็น session ผ่าน API call แทน
 * ไม่มี JWT โผล่ใน URL เลยสักจังหวะ
 *
 * เจอของจริง 2026-08-09: dev เห็น `katomnoistudio.github.io/#access_token=eyJhbGci...` ค้าง
 * ในช่อง address (ดู resolveOAuthRedirectUrl ใน accountRepository.supabase.ts — คนละบั๊กแต่
 * ทำให้เห็นปัญหานี้)
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'ไม่พบ VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY — สร้างไฟล์ .env.local จาก .env.local.example',
    )
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { flowType: 'pkce' },
    global: { fetch: createResilientFetch(globalThis.fetch.bind(globalThis)) },
  })
  return client
}
