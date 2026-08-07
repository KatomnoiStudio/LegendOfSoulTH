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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
