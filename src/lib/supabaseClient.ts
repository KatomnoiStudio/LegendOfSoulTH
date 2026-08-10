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
 * fetch ที่มี "เพดานเวลาต่อคำขอ" อย่างเดียว — ห่อ global.fetch ของเบราว์เซอร์
 *
 * fetch ของเบราว์เซอร์ไม่มี timeout เป็นค่าเริ่มต้นเลย (ต่างจาก XHR) คำขอที่ค้างจึงไม่เคย
 * reject — หน้าจอผลการต่อสู้ค้างแช่โดยไม่มีทั้ง spinner และข้อความ ไม่มีอะไรบอกผู้เล่นว่า
 * เกิดอะไรขึ้นและไม่มีทางกดใหม่ นี่คือช่องว่างจริงที่ไลบรารีไม่ได้ปิดให้ และเป็นสิ่งเดียว
 * ที่ฟังก์ชันนี้ทำ
 *
 * ── ห้ามใส่ retry ตรงนี้ (ของจริงที่ QC จับได้ 2026-08-10, MEMORY item 189) ──────────
 * ฉบับแรกของไฟล์นี้ยิงซ้ำเองหนึ่งครั้งเมื่อเจอ network error/5xx โดยไม่รู้ว่า **postgrest-js
 * ยิงซ้ำอยู่แล้ว**: `DEFAULT_MAX_RETRIES = 3`, `retryEnabled` เป็น true เป็นค่าเริ่มต้น,
 * backoff 1s/2s/4s (ยืนยันจาก node_modules/@supabase/postgrest-js/dist/index.cjs) และ
 * auth-js ก็ยิงซ้ำ `_refreshAccessToken` แบบ exponential ของมันเองอีกชั้น
 *
 * ผลคือ retry ซ้อน retry: หนึ่งคำขอ GET ที่เน็ตล้มจริง = postgrest 4 ครั้ง × ของเรา 2 ครั้ง
 * = **8 คำขอ** และเวลารวม 4×(15s×2) + backoff 7s ≈ **127 วินาที** จากตัวเลขที่เขียนไว้ว่า
 * "เพดาน 15 วินาที" — เพดานที่โกหก 8 เท่า
 *
 * และมันยังอันตรายกว่าไลบรารีด้วย: postgrest ยิงซ้ำเฉพาะ **GET/HEAD/OPTIONS** เท่านั้น
 * (RETRYABLE_METHODS) เพราะ POST/PATCH ยิงซ้ำแล้วอาจเขียนซ้ำ ส่วนของเรายิงซ้ำทุก method
 * ที่เจอ 5xx — savePlayer เป็น PATCH/upsert ที่ไม่มี refId ป้องกัน
 *
 * ไลบรารีทำ retry ได้ถูกต้องกว่าเราอยู่แล้ว จึงลบของเราทิ้ง เหลือแค่เพดานเวลาที่ไลบรารีไม่มี
 * เพดานนี้เป็น **ต่อคำขอ** ไม่ใช่ต่อการเรียกของผู้ใช้ — postgrest ที่ยิงซ้ำ 4 ครั้งใช้เวลารวม
 * ได้ถึง 4×15s + backoff 7s ≈ 67s ซึ่งเป็นพฤติกรรมของไลบรารี ไม่ใช่ของฟังก์ชันนี้
 */
export function createDeadlineFetch(
  baseFetch: typeof fetch,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): typeof fetch {
  return async (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs)
    // ผู้เรียกที่ส่ง signal มาเองต้องยังยกเลิกได้ — รวมสองสัญญาณ ไม่ใช่ทับของเขา
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
    return baseFetch(input, { ...init, signal })
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
    global: { fetch: createDeadlineFetch(globalThis.fetch.bind(globalThis)) },
  })
  return client
}
