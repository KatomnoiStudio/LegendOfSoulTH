/**
 * ของสะสมของผู้เล่น: สัตว์เลี้ยง และประวัติการต่อสู้
 *
 * ตอนนี้ยังไม่มีระบบสัตว์เลี้ยงและระบบต่อสู้จริง ทั้งสองรายการจึง **ว่างเปล่าตามความเป็นจริง**
 * ไม่ได้ใส่ข้อมูลปลอมให้ดูเหมือนมีของ — หน้าจอจะแสดงสถานะว่างแทน
 *
 * เมื่อมีระบบจริงแล้ว ให้เปลี่ยน 2 ค่านี้ไปดึงจาก API โดยที่ UI ไม่ต้องแก้
 */

export interface Pet {
  id: string
  name: string
  species: string
  level: number
  rarity: string
}

export interface BattleRecord {
  id: string
  /** ชื่อด่านหรือคู่ต่อสู้ */
  opponent: string
  result: 'win' | 'lose'
  /** เวลาที่จบการต่อสู้ (ISO string) */
  finishedAt: string
  /** จำนวนเทิร์นที่ใช้ */
  turns: number
}

/** ยังไม่มีระบบสัตว์เลี้ยง — รายการจึงว่างจริง */
export const PETS: Pet[] = []

/** ยังไม่มีระบบต่อสู้ — ประวัติจึงว่างจริง */
export const BATTLE_HISTORY: BattleRecord[] = []
