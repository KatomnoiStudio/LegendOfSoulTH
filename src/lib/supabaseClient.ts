import { createClient } from '@supabase/supabase-js'

/**
 * ไคลเอนต์ Supabase ตัวเดียวของทั้งแอป — ไฟล์อื่นห้ามเรียก createClient ซ้ำ
 *
 * ค่า URL/anon key มาจาก .env.local (ดู .env.local.example) — ไม่ commit ไฟล์จริง
 * anon key ไม่ใช่ความลับในความหมายเดิม (ถูกออกแบบให้ฝังใน bundle ฝั่ง client ได้)
 * ความปลอดภัยจริงอยู่ที่ Row Level Security policy ในฝั่ง Postgres (ดู supabase/migrations/)
 * ไม่ใช่การซ่อนคีย์นี้
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'ไม่พบ VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY — สร้างไฟล์ .env.local จาก .env.local.example',
  )
}

/*
  flowType: 'pkce' — ไม่ใช่ค่าเริ่มต้น (supabase-js v2 default = 'implicit') และตั้งไว้ตั้งใจ

  implicit flow ส่ง session กลับมาเป็น URL fragment (`#access_token=<JWT>&refresh_token=...`)
  ซึ่งแปลว่า JWT ของผู้ใช้จะไปโผล่ใน address bar และถูกบันทึกลง history ของเบราว์เซอร์ทุกครั้ง
  ที่ล็อกอิน แม้ supabase-js จะล้าง URL ให้ทันทีที่อ่านค่าเสร็จก็ตาม — history entry ที่เขียนไป
  แล้วลบไม่ได้ ส่วน PKCE ส่งกลับมาเป็น `?code=<one-time>` แลกเป็น session ผ่าน API call แทน
  ไม่มี JWT โผล่ใน URL เลยสักจังหวะ

  เจอของจริง 2026-08-09: dev เห็น `katomnoistudio.github.io/#access_token=eyJhbGci...` ค้าง
  ในช่อง address (ดู resolveOAuthRedirectUrl ใน accountRepository.supabase.ts — คนละบั๊กแต่
  ทำให้เห็นปัญหานี้)
*/
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})
