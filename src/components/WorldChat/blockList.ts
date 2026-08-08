import { readJson, writeJson } from '../../lib/storage'

/**
 * บล็อกผู้เล่นอื่นในแชทโลก — client-local เหมือน chatStorage.ts ทั้งไฟล์ (แชทเองก็เป็นแค่
 * localStorage ยังไม่มี backend) เก็บด้วย authorName ตรง ๆ ไม่ใช่ uid เพราะ ChatMessage
 * ไม่มี uid ให้อ้าง และ scope ของแชทเองก็จำกัดแค่เบราว์เซอร์เครื่องเดียวอยู่แล้ว —
 * แก้ปัญหาระดับเดียวกับ scope เดิม ไม่ต้องเพิ่ม uid tracking ข้ามระบบ
 *
 * exemplar: Guardian Tales devs เองบอกว่าฟีเจอร์ moderation จริงที่ทำคือผู้เล่นบล็อก/ปิด
 * แชทกันเอง ไม่ใช่ admin เข้าไปจัดการ — เลือกทางนี้แทน admin takedown tool ตามนั้น
 * (blueprint divergence #10, resolved 2026-08-09)
 */

const BLOCK_KEY = 'los:worldchat:blocked:v1'

export function loadBlockedNames(): string[] {
  return readJson<string[]>(BLOCK_KEY) ?? []
}

/** เพิ่มชื่อเข้าบล็อกลิสต์ คืนลิสต์ล่าสุดหลังเพิ่ม (no-op ถ้าซ้ำหรือว่างเปล่า) */
export function blockName(name: string): string[] {
  const trimmed = name.trim()
  const current = loadBlockedNames()
  if (trimmed.length === 0 || current.includes(trimmed)) return current
  const next = [...current, trimmed]
  writeJson(BLOCK_KEY, next)
  return next
}

/** ลบชื่อออกจากบล็อกลิสต์ คืนลิสต์ล่าสุดหลังลบ */
export function unblockName(name: string): string[] {
  const trimmed = name.trim()
  const next = loadBlockedNames().filter((existing) => existing !== trimmed)
  writeJson(BLOCK_KEY, next)
  return next
}
