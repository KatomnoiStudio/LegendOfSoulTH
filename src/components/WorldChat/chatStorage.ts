import { readJson, writeJson } from '../../lib/storage'

/**
 * ที่เก็บข้อความแชทโลก — localStorage เดียวกับที่ accountRepository ใช้เก็บบัญชี
 *
 * ⚠️ ข้อจำกัดสำคัญ: เกมนี้ไม่มี backend เลย ข้อความจึงเห็นกันได้แค่ "บัญชีต่าง ๆ
 * ที่เคยล็อกอินบนเบราว์เซอร์เครื่องนี้เครื่องเดียว" ไม่ใช่แชทข้ามเครื่องจริง —
 * ข้อจำกัดเดียวกับที่ findPlayerByUid ใน accountRepository.ts มีอยู่แล้ว
 * เมื่อมีฐานข้อมูลกลางจริง ให้ย้ายฟังก์ชันสองตัวนี้ไปคุยกับ API แทน หน้าตาไม่ต้องเปลี่ยน
 */

const CHAT_KEY = 'los:worldchat:v1'
/** เก็บข้อความล่าสุดไว้พอประมาณ กัน localStorage บวมและ render ช้าถ้าคุยกันนาน ๆ */
const MAX_MESSAGES = 200

export interface ChatMessage {
  id: string
  authorName: string
  text: string
  createdAt: string
}

/** อ่านประวัติแชทโลกทั้งหมดที่มีอยู่บนเครื่องนี้ */
export function loadWorldChat(): ChatMessage[] {
  return readJson<ChatMessage[]>(CHAT_KEY) ?? []
}

/** โพสต์ข้อความใหม่เข้าแชทโลก คืนประวัติทั้งหมดหลังโพสต์ */
export function postWorldChatMessage(authorName: string, text: string): ChatMessage[] {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    authorName,
    text,
    createdAt: new Date().toISOString(),
  }
  const next = [...loadWorldChat(), message].slice(-MAX_MESSAGES)
  writeJson(CHAT_KEY, next)
  return next
}

/** คีย์ localStorage ที่ใช้เก็บแชท — เปิดให้ไฟล์อื่นฟัง window 'storage' event เพื่อรับข้อความจากแท็บ/บัญชีอื่นบนเครื่องเดียวกันแบบเรียลไทม์ */
export const WORLD_CHAT_STORAGE_KEY = CHAT_KEY
