import { readJson, writeJson } from '../../lib/storage'

/**
 * ที่เก็บข้อความแชทโลก — localStorage เดียวกับที่ accountRepository ใช้เก็บบัญชี
 *
 * ⚠️ ข้อจำกัดสำคัญ (ตั้งใจถาวร ไม่ใช่ bug): เกมนี้ไม่มี backend เลย ข้อความจึงเห็นกันได้แค่
 * "บัญชีต่าง ๆ ที่เคยล็อกอินบนเบราว์เซอร์เครื่องนี้เครื่องเดียว" ไม่ใช่แชทข้ามเครื่องจริง —
 * ข้อจำกัดเดียวกับที่ findPlayerByUid ใน accountRepository.ts มีอยู่แล้ว ผู้เล่นเห็น scope นี้
 * ตรง ๆ ผ่าน WorldChat.tsx's scope caption ไม่ได้ซ่อนไว้แค่ในคอมเมนต์เหมือนก่อนหน้านี้
 *
 * 🔧 TODO ย้ายไป backend จริง: เมื่อมีฐานข้อมูลกลางจริง ให้ย้าย `loadWorldChat`/
 * `postWorldChatMessage` สองตัวนี้ไปคุยกับ API แทน (เปลี่ยนแค่ข้างในฟังก์ชัน หน้าตา/
 * signature ไม่ต้องเปลี่ยน) — ตอนนั้น `broadcastNewMessage`/`subscribeToWorldChat`
 * เปลี่ยนเป็น subscribe กับ realtime channel ของ backend แทน BroadcastChannel ในเครื่องนี้
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

/**
 * คิวเขียนแบบต่อคิว — กัน race ระหว่างสองแท็บ/บัญชีบนเบราว์เซอร์เดียวกันโพสต์พร้อมกัน
 * (อ่าน-แล้ว-เขียนทับแบบเดิมไม่มี lock ข้อความของอีกฝั่งหายได้ถ้าจังหวะชนกันพอดี)
 * ต่อคิวได้แค่ภายในแท็บเดียวกัน — race ข้ามแท็บจริง ๆ ปิดไม่ได้ถ้าไม่มี backend
 * (สองแท็บคนละ JS heap คนละคิว) แต่กรณีนี้พบยากกว่ามาก เพราะต้องกดส่งพร้อมกันจริง ๆ
 */
let writeQueue: Promise<ChatMessage[]> = Promise.resolve([])

/** โพสต์ข้อความใหม่เข้าแชทโลก คืนประวัติทั้งหมดหลังโพสต์ */
export function postWorldChatMessage(authorName: string, text: string): Promise<ChatMessage[]> {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    authorName,
    text,
    createdAt: new Date().toISOString(),
  }

  writeQueue = writeQueue.then(() => {
    const result = [...loadWorldChat(), message].slice(-MAX_MESSAGES)
    writeJson(CHAT_KEY, result)
    broadcastNewMessage()
    return result
  })
  return writeQueue
}

/**
 * แจ้งแท็บอื่นบนเครื่องเดียวกันว่ามีข้อความใหม่ — ใช้ BroadcastChannel (native API,
 * Baseline widely available ตั้งแต่ มี.ค. 2022 ตาม MDN — และโค้ดด้านล่าง feature-detect
 * ก่อนใช้อยู่แล้ว ไม่ได้เชื่อตารางรองรับเฉย ๆ ส่วนฟิลด์ browserslist ใน package.json
 * ไม่มีอะไรใน build อ่าน จึงไม่ใช่หลักประกัน ดู .agents/rules/ecc/web/compatibility.md)
 * แทน window 'storage' event เดิม เพราะเป็นกลไก pub-sub ตรง ๆ ไม่ต้อง
 * พึ่งเบราว์เซอร์ refire event จากการเขียน localStorage ทางอ้อม — ยังต้องเก็บใน
 * localStorage เหมือนเดิมสำหรับ persist/backfill ตอนเปิดแท็บใหม่ BroadcastChannel
 * แค่เป็นชั้น "แจ้งเตือนสด" เพิ่มเข้ามา ไม่ได้แทนที่ localStorage
 */
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHAT_KEY) : null

function broadcastNewMessage(): void {
  channel?.postMessage('new-message')
}

/** ฟังข้อความใหม่จากแท็บอื่น — คืนฟังก์ชัน unsubscribe */
export function subscribeToWorldChat(onNewMessage: () => void): () => void {
  if (!channel) return () => {}
  const handler = () => onNewMessage()
  channel.addEventListener('message', handler)
  return () => channel.removeEventListener('message', handler)
}
