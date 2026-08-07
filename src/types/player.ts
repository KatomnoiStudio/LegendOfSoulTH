/**
 * รูปแบบข้อมูลผู้เล่นที่ UI ใช้งาน
 * เมื่อมีระบบหลังบ้านจริง ให้ map response จาก API มาเป็น type นี้
 * แล้ว UI ทั้งหมดจะทำงานต่อได้ทันทีโดยไม่ต้องแก้ component
 */
export interface PlayerCurrency {
  gold: number
  gem: number
}

/** ตัวละครหนึ่งตัวที่บัญชีผู้เล่นครอบครองจริง */
export interface OwnedCharacter {
  characterId: string
  level: number
  exp: number
  expToNext: number
  obtainedAt: string
}

/** ไอเทมหนึ่งช่องในกระเป๋าผู้เล่น — itemId ต้องมีอยู่ใน ITEMS (ดู src/game/items.ts) */
export interface InventoryItem {
  itemId: string
  quantity: number
  obtainedAt: string
  /** ได้มาจากไหนครั้งแรก ('quest' | 'drop') — ตรวจสอบที่มาได้เหมือนทอง/หยก */
  obtainedFrom: string
}

/** สแนปช็อตข้อมูลผู้เล่นอีกคน ณ ตอนค้นหา/เพิ่มเพื่อน — ไม่ใช่ live reference (ไม่มีฐานข้อมูลกลางให้ sync) */
export interface FriendCandidate {
  uid: string
  name: string
  level: number
  title: string
}

export interface Player {
  id: string
  /**
   * รหัสผู้เล่นสาธารณะ 10 หลัก ใช้ให้เพื่อนค้นหาเพื่อเพิ่มเพื่อน
   * (ดู src/game/uid.ts — เมื่อมีฐานข้อมูลต้องตั้ง UNIQUE index บนคอลัมน์นี้)
   */
  uid: string
  name: string
  /** ฉายา/ยศ แสดงใต้ชื่อ */
  title: string
  level: number
  /** EXP สะสมในเลเวลปัจจุบัน */
  exp: number
  /** EXP ที่ต้องใช้เพื่อขึ้นเลเวลถัดไป */
  expToNext: number
  currency: PlayerCurrency
  /** รายการตัวละครของบัญชีผู้เล่น ไม่ใช่รายชื่อตัวละครทั้งหมดในเกม */
  ownedCharacters: OwnedCharacter[]
  /**
   * กระเป๋าไอเทมของผู้เล่น
   * บัญชีเก่าที่สมัครก่อนมีระบบไอเทมจะไม่มีฟิลด์นี้ใน localStorage — อ่านค่าผ่าน
   * `player.inventory ?? []` เสมอ (ดู normalizePlayer ใน accountRepository.ts)
   */
  inventory: InventoryItem[]
  /**
   * รายชื่อเพื่อน — สแนปช็อต ณ ตอนกดเพิ่ม ไม่ใช่ live data (ไม่มีฐานข้อมูลกลาง อ่านซ้ำไม่ได้)
   * บัญชีเก่าที่สมัครก่อนมีระบบนี้จะไม่มีฟิลด์นี้ใน localStorage — อ่านค่าผ่าน
   * `player.friends ?? []` เสมอ (ดู normalizePlayer ใน accountRepository.ts)
   */
  friends: FriendCandidate[]
  /**
   * ผังทีมในลานประลอง ยาว TEAM_SIZE (4) เสมอ — null คือช่องว่าง
   * เก็บเป็น characterId ที่ต้องมีอยู่ใน ownedCharacters (ดู src/game/team.ts)
   */
  teamSlots: (string | null)[]
  /** id ของกรอบโปรไฟล์ที่สวมอยู่ (ดู src/game/frames.ts) */
  frameId: string
  /** ความคืบหน้าเควสต์ การต่อสู้ และ flags */
  progress: PlayerProgress
}

export interface BattleRecord {
  id: string
  opponent: string
  result: 'win' | 'lose'
  finishedAt: string
  /** มรดกเทิร์นเบส — บัญชีเก่าใน localStorage ยังมี; realtime ไม่เขียน */
  turns?: number
  /** ระยะเวลาต่อสู้จริง (ms) — realtime */
  durationMs?: number
}

export interface PlayerProgress {
  flags: Record<string, boolean>
  defeatedNpcIds: string[]
  battleHistory: BattleRecord[]
}

export const EMPTY_PROGRESS: PlayerProgress = {
  flags: {},
  defeatedNpcIds: [],
  battleHistory: [],
}

/** จำนวนแจ้งเตือนค้างอยู่ของปุ่มด้านข้าง */
export interface PlayerBadges {
  mail: number
  mission: number
}

export interface PlayerState {
  player: Player
  badges: PlayerBadges
  isLoading: boolean
}
