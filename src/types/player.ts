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
   * ผังทีมในลานประลอง ยาว TEAM_SIZE (4) เสมอ — null คือช่องว่าง
   * เก็บเป็น characterId ที่ต้องมีอยู่ใน ownedCharacters (ดู src/game/team.ts)
   */
  teamSlots: (string | null)[]
  /** id ของกรอบโปรไฟล์ที่สวมอยู่ (ดู src/game/frames.ts) */
  frameId: string
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
