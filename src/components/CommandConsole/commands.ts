import { ROSTER } from '../../game/characters'

/**
 * ตัวแปลคำสั่งของช่องคำสั่งผู้ดูแล — แยกจาก component เพื่อให้เทสต์ได้โดยไม่ต้อง render
 *
 * ตั้งใจให้ "แปลคำสั่ง" กับ "ลงมือทำ" แยกกัน: ไฟล์นี้แค่บอกว่าผู้ใช้สั่งอะไร
 * ส่วนการแก้ข้อมูลจริงเป็นหน้าที่ของ accountRepository ผ่าน useAuth
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

export function parseCommand(raw: string): ParsedCommand | null {
  const text = raw.trim()
  if (text.length === 0) return null
  if (!text.startsWith('/')) {
    return { kind: 'error', message: 'คำสั่งต้องขึ้นต้นด้วย / — พิมพ์ /help เพื่อดูคำสั่งทั้งหมด' }
  }

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
