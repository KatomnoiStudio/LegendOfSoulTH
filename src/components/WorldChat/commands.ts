import { ROSTER } from '../../game/characters'

/**
 * ตัวแปลคำสั่งลับสำหรับผู้ดูแล ซ่อนอยู่หลังช่องแชทโลกปกติ
 *
 * แยกจาก component เพื่อให้เทสต์ได้โดยไม่ต้อง render — ตั้งใจให้ "แปลคำสั่ง" กับ
 * "ลงมือทำ" แยกกัน ไฟล์นี้แค่บอกว่าผู้ใช้สั่งอะไร ส่วนการแก้ข้อมูลจริงเป็นหน้าที่ของ
 * accountRepository ผ่าน useAuth
 *
 * ⚠️ ไม่มี UI ไหนในเกมบอกใบ้ว่าคำสั่งเหล่านี้มีอยู่ (ไม่มี placeholder/hint ในช่องพิมพ์) —
 * ตั้งใจให้ช่องแชทดูเป็นแชทปกติสำหรับผู้เล่นทั่วไป ผู้ดูแลต้องรู้คำสั่งเองอยู่แล้ว
 * ดูคำเตือนเรื่องขอบเขตความปลอดภัยจริง (หรือขาดไป) ใน src/data/admins.ts
 */

export type ParsedCommand =
  | { kind: 'give-character'; characterId: string }
  | { kind: 'help' }
  | { kind: 'error'; message: string }

/**
 * หา characterId จากคำที่ผู้ใช้พิมพ์
 *
 * รับได้ทั้ง id เต็ม ('pig-warrior'), คำขึ้นต้น ('pig'), และชื่อไทย ('ตือโป๊ยก่าย')
 * เพราะคนพิมพ์คำสั่งไม่ควรต้องจำ id ที่ใช้ในโค้ด
 */
function resolveCharacterId(input: string): string | null {
  const query = input.trim().toLowerCase()
  if (query.length === 0) return null

  const exact = ROSTER.find((entry) => entry.id.toLowerCase() === query)
  if (exact) return exact.id

  const byPrefix = ROSTER.filter((entry) => entry.id.toLowerCase().startsWith(query))
  // ตรงมากกว่าหนึ่งตัวถือว่ากำกวม ให้ผู้ใช้พิมพ์ให้ชัดขึ้นดีกว่าเดาเอง
  if (byPrefix.length === 1) return byPrefix[0].id

  const byName = ROSTER.filter((entry) => entry.name.toLowerCase().includes(query))
  if (byName.length === 1) return byName[0].id

  return null
}

export const COMMAND_HELP = [
  '/givecharacter <ตัวละคร> — มอบตัวละครให้บัญชีนี้ เช่น /givecharacter pig',
  '/help — แสดงคำสั่งทั้งหมด',
]

/**
 * แปลข้อความเป็นคำสั่ง — คืน null ถ้าเป็นข้อความแชทธรรมดา (ไม่ขึ้นต้นด้วย /)
 * ไม่เหมือนเวอร์ชันคอนโซลเดิมที่แจ้ง error เมื่อไม่ขึ้นต้นด้วย / เพราะตอนนี้ข้อความ
 * ที่ไม่ใช่คำสั่งต้องถูกส่งเป็นแชทปกติ ไม่ใช่ถูกปฏิเสธ (ดู WorldChat.tsx ผู้เรียก)
 */
export function parseCommand(raw: string): ParsedCommand | null {
  const text = raw.trim()
  if (!text.startsWith('/')) return null

  const [name, ...args] = text.slice(1).split(/\s+/)
  const command = name.toLowerCase()

  if (command === 'help') return { kind: 'help' }

  if (command === 'givecharacter') {
    if (args.length === 0) {
      return { kind: 'error', message: 'ใช้: /givecharacter <ตัวละคร> เช่น /givecharacter pig' }
    }
    const characterId = resolveCharacterId(args.join(' '))
    if (!characterId) {
      const available = ROSTER.map((entry) => `${entry.id} (${entry.name})`).join(', ')
      return { kind: 'error', message: `ไม่รู้จักตัวละคร "${args.join(' ')}" — มีให้เลือก: ${available}` }
    }
    return { kind: 'give-character', characterId }
  }

  return { kind: 'error', message: `ไม่รู้จักคำสั่ง /${command} — พิมพ์ /help เพื่อดูคำสั่งทั้งหมด` }
}
