/**
 * ผังทีมและตำแหน่งวงแหวนในลานประลอง
 *
 * ─── ทำไมแยกออกจาก characters.ts ──────────────────────────
 * "ตัวละครตัวนี้ยืนช่องไหน" เป็นข้อมูลของ *บัญชีผู้เล่น* ไม่ใช่คุณสมบัติ
 * ของตัวละคร ผู้เล่น A จัดซุนหงอคงไว้ช่อง 1 ส่วนผู้เล่น B จัดไว้ช่อง 3 ได้
 * เดิม Character.slot ฝังตำแหน่งไว้กับตัวละคร ทำให้ทุกบัญชีถูกบังคับผังเดียวกัน
 * ───────────────────────────────────────────────────────────
 */

/** จำนวนช่องในทีม — ลานประลองมีวงแหวน 4 วงเสมอ ไม่ว่าจะมีตัวละครกี่ตัว */
export const TEAM_SIZE = 4

/** ดัชนีช่อง 0–3 (ซ้ายสุดไปขวาสุด) */
export type SlotIndex = 0 | 1 | 2 | 3

/**
 * ผังทีมของผู้เล่น — ยาว TEAM_SIZE เสมอ
 * null = ช่องว่าง (วงแหวนยังขึ้น แต่ไม่มีใครยืน)
 */
export type TeamSlots = (string | null)[]

export interface SlotTransform {
  position: [number, number, number]
  rotationY: number
}

/**
 * ตำแหน่งวงแหวนทั้ง 4 ในฉาก 3D
 *
 * วางเป็นส่วนโค้ง: สองช่องริมถอยหลังเล็กน้อยและหันเข้าหากลาง
 *
 * ระยะ x = ±3.4 / ±1.2 คำนวณจากเฟรมจริง: ที่ระยะนี้ขอบภาพอยู่ราว x = ±4.8
 * ตัวละครริมสุดกินความกว้างถึง x ≈ 92% ของจอ จึงไม่ชนแถบเมนูด่วนทางขวา
 * (ถ้าขยับออกไปถึง ±3.6 ขอบตัวละครจะไปแตะไอคอนเมนูพอดี)
 */
export const SLOT_TRANSFORM: Record<SlotIndex, SlotTransform> = {
  0: { position: [-3.4, 0, -0.55], rotationY: 0.26 },
  1: { position: [-1.2, 0, 0.25], rotationY: 0.1 },
  2: { position: [1.2, 0, 0.25], rotationY: -0.1 },
  3: { position: [3.4, 0, -0.55], rotationY: -0.26 },
}

/** ดัชนีช่องทั้งหมดเรียงจากซ้ายไปขวา ใช้วนสร้างวงแหวน */
export const SLOT_INDEXES: SlotIndex[] = [0, 1, 2, 3]

/**
 * ปรับผังทีมให้ยาว TEAM_SIZE เสมอ
 * กันข้อมูลจากหลังบ้านที่อาจส่งมาสั้นหรือยาวเกิน
 */
export function normalizeTeam(slots: TeamSlots): TeamSlots {
  return SLOT_INDEXES.map((index) => slots[index] ?? null)
}

/** จำนวนช่องที่มีตัวละครยืนอยู่จริง */
export function countFilledSlots(slots: TeamSlots): number {
  return slots.filter((id) => id !== null).length
}
