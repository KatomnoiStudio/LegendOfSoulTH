import { ERLANG_SHEN_CHARACTER_ID, ROSTER } from '../../game/characters'

/**
 * ตัวแปลคำสั่งลับสำหรับผู้ดูแล ซ่อนอยู่หลังช่องแชทโลกปกติ
 *
 * แยกจาก component เพื่อให้เทสต์ได้โดยไม่ต้อง render — ตั้งใจให้ "แปลคำสั่ง" กับ
 * "ลงมือทำ" แยกกัน ไฟล์นี้แค่บอกว่าผู้ใช้สั่งอะไร ส่วนการแก้ข้อมูลจริงเป็นหน้าที่ของ
 * accountRepository ผ่าน useAuth
 *
 * ⚠️ ไม่มี UI ไหนในเกมบอกใบ้ว่าคำสั่งผู้ดูแลเหล่านี้มีอยู่ (ไม่มี placeholder/hint ในช่องพิมพ์) —
 * ตั้งใจให้ช่องแชทดูเป็นแชทปกติสำหรับผู้เล่นทั่วไป ผู้ดูแลต้องรู้คำสั่งเองอยู่แล้ว
 * สิทธิ์ผู้ดูแลเช็คจากตาราง admin_accounts ฝั่ง Supabase แล้ว (ดู supabase/migrations/0004_admin_accounts.sql,
 * 0015_admin_grant_and_chat_block.sql) — เป็นขอบเขตความปลอดภัยจริงระดับ RLS/RPC ไม่ใช่แค่
 * client-side gate เหมือนเดิม
 *
 * ต่างจากคำสั่งผู้ดูแล — /block /unblock /blocklist เป็นคำสั่งสำหรับผู้เล่นทุกคน (ไม่เช็ค
 * isAdmin เลย) จึง**ต้อง**ใบ้ผ่าน /help ปกติ ไม่ใช่ความลับ (blueprint divergence #10)
 */

export type ParsedCommand =
  | { kind: 'give-character'; characterId: string }
  | { kind: 'give-gold'; amount: number }
  | { kind: 'give-item'; itemId: string; quantity: number }
  | { kind: 'block'; name: string }
  | { kind: 'unblock'; name: string }
  | { kind: 'blocklist' }
  | { kind: 'help' }
  | { kind: 'error'; message: string }

/**
 * ชื่อคำสั่งที่ต้องเป็นผู้ดูแลเท่านั้นถึงใช้ได้ — ทุกอันอื่นใช้ได้ทุกคน
 *
 * เช็คจาก**ชื่อคำสั่ง** ก่อนแปลผลเสมอ ไม่ใช่เช็คจาก kind ของผลลัพธ์หลัง parse — เพราะ
 * ถ้าเช็คจาก kind แล้ว non-admin พิมพ์ /givecharacter (ไม่ใส่ตัวละคร) จะได้ kind: 'error'
 * กลับมา ซึ่งไม่ตรงกับ kind ที่อยู่ในลิสต์ผู้ดูแล ข้อความ error ("ใช้: /givecharacter <ตัวละคร>")
 * เลยหลุดไปโชว์ให้ non-admin เห็น เท่ากับใบ้ว่าคำสั่งลับนี้มีอยู่ทั้งที่ตั้งใจไม่ให้ใบ้เลย
 * (bug จริงที่เคยเกิดตอนเปลี่ยนจาก blanket-gate เป็น per-kind gate — แก้ด้วยการเช็คชื่อ
 * คำสั่งตรง ๆ ก่อน parse แทน ไม่มีทางหลุดผ่าน error path ได้อีก)
 */
const ADMIN_ONLY_COMMAND_NAMES = new Set(['givecharacter', 'givegold', 'giveitem'])
const ADMIN_CHARACTER_ALIASES = new Map<string, string>([['erlang', ERLANG_SHEN_CHARACTER_ID]])

/**
 * หา characterId จากคำที่ผู้ใช้พิมพ์
 *
 * รับได้ทั้ง id เต็ม ('pig-warrior'), คำขึ้นต้น ('pig'), และชื่อไทย ('ตือโป๊ยก่าย')
 * เพราะคนพิมพ์คำสั่งไม่ควรต้องจำ id ที่ใช้ในโค้ด
 */
function resolveCharacterId(input: string): string | null {
  const query = input.trim().toLowerCase()
  if (query.length === 0) return null

  const alias = ADMIN_CHARACTER_ALIASES.get(query)
  if (alias) return alias

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
  '/block <ชื่อ> — ไม่แสดงข้อความจากชื่อนี้อีก เช่น /block SomePlayer',
  '/unblock <ชื่อ> — เลิกบล็อกชื่อนี้',
  '/blocklist — ดูรายชื่อที่บล็อกไว้',
  '/help — แสดงคำสั่งทั้งหมด',
]

/** ใบ้เฉพาะผู้ดูแล ต่อท้าย COMMAND_HELP ตอนเป็นผู้ดูแลเท่านั้น (ยังคงไม่ใบ้ให้ผู้เล่นทั่วไปเห็น) */
export const ADMIN_COMMAND_HELP = [
  '/givecharacter <ตัวละคร> — มอบตัวละครให้บัญชีนี้ เช่น /givecharacter erlang',
  '/givegold <จำนวน> — เสกทองให้บัญชีนี้',
  '/giveitem <item_id> <จำนวน> — เสกไอเทมให้บัญชีนี้',
]

/**
 * ตัดสินว่าข้อความที่พิมพ์มาควรถูกตีความเป็นคำสั่งหรือไม่ — จุดเดียวที่คุมเส้นแบ่งความปลอดภัย
 * นี้ (บัญชีไม่ใช่ผู้ดูแล หรือผู้ดูแลพลาดสลับไปบัญชีอื่น = ข้อความขึ้นต้น / ก็ยังต้องถูกส่ง
 * เป็นแชทธรรมดา ไม่ใช่คำสั่ง — แต่เฉพาะคำสั่งกลุ่มผู้ดูแลเท่านั้น) แยกออกมาจาก WorldChat.tsx
 * ให้เทสต์ได้ตรง ๆ โดยไม่ต้อง render
 */
export function resolveCommandForSender(isAdmin: boolean, raw: string): ParsedCommand | null {
  const text = raw.trim()
  if (!isAdmin && text.startsWith('/')) {
    const commandName = text.slice(1).split(/\s+/)[0]?.toLowerCase()
    if (commandName && ADMIN_ONLY_COMMAND_NAMES.has(commandName)) return null
  }
  return parseCommand(raw)
}

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

  if (command === 'block' || command === 'unblock') {
    const targetName = args.join(' ').trim()
    if (targetName.length === 0) {
      return { kind: 'error', message: `ใช้: /${command} <ชื่อ>` }
    }
    return command === 'block'
      ? { kind: 'block', name: targetName }
      : { kind: 'unblock', name: targetName }
  }

  if (command === 'blocklist') return { kind: 'blocklist' }

  if (command === 'givecharacter') {
    if (args.length === 0) {
      return { kind: 'error', message: 'ใช้: /givecharacter <ตัวละคร> เช่น /givecharacter erlang' }
    }
    const characterId = resolveCharacterId(args.join(' '))
    if (!characterId) {
      const available = ROSTER.map((entry) => `${entry.id} (${entry.name})`).join(', ')
      return {
        kind: 'error',
        message: `ไม่รู้จักตัวละคร "${args.join(' ')}" — มีให้เลือก: ${available}`,
      }
    }
    return { kind: 'give-character', characterId }
  }

  if (command === 'givegold') {
    const amount = Number(args[0])
    if (!Number.isFinite(amount) || amount <= 0) {
      return { kind: 'error', message: 'ใช้: /givegold <จำนวน> เช่น /givegold 1000' }
    }
    return { kind: 'give-gold', amount: Math.floor(amount) }
  }

  if (command === 'giveitem') {
    const itemId = args[0]
    const quantity = Number(args[1])
    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
      return {
        kind: 'error',
        message: 'ใช้: /giveitem <item_id> <จำนวน> เช่น /giveitem spirit-incense 5',
      }
    }
    return { kind: 'give-item', itemId, quantity: Math.floor(quantity) }
  }

  return {
    kind: 'error',
    message: `ไม่รู้จักคำสั่ง /${command} — พิมพ์ /help เพื่อดูคำสั่งทั้งหมด`,
  }
}
