/**
 * ทะเบียนไอเทมในเกม — แหล่งความจริงจุดเดียว
 *
 * ─── ขอบเขตตอนนี้ ─────────────────────────────────────────
 * ไอเทมในไฟล์นี้เป็น "ชุดตั้งต้น" ที่ตั้งชื่อตามธีมไซอิ๋ว/ไทยของเกม
 * ยังไม่มีผลต่อระบบต่อสู้หรืออัปเกรดใด ๆ เพราะยังไม่มีระบบเหล่านั้น
 * (ตอนนี้ใช้ "ถือครองและแสดงในกระเป๋า" ได้อย่างเดียว)
 *
 * เพิ่ม/แก้ไอเทมได้ที่ ITEMS ด้านล่างจุดเดียว หน้ากระเป๋าจะอัปเดตตามเอง
 * ───────────────────────────────────────────────────────────
 */

/** หมวดของไอเทม ใช้จัดกลุ่มในหน้ากระเป๋า */
export type ItemCategory = 'consumable' | 'material' | 'treasure'

/** ระดับความหายาก — ใช้สีเดียวกับระดับของตัวละคร (ดู RARITY_COLOR ใน characters.ts) */
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ItemDefinition {
  id: string
  name: string
  description: string
  category: ItemCategory
  rarity: ItemRarity
}

export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  consumable: 'ของใช้',
  material: 'วัตถุดิบ',
  treasure: 'ของล้ำค่า',
}

export const ITEM_RARITY_LABEL: Record<ItemRarity, string> = {
  common: 'ธรรมดา',
  rare: 'หายาก',
  epic: 'มหากาพย์',
  legendary: 'ตำนาน',
}

export const ITEM_RARITY_COLOR: Record<ItemRarity, string> = {
  common: '#98a0c0',
  rare: '#6d8cff',
  epic: '#b06dff',
  legendary: '#f0c85a',
}

/** ไอเทมทั้งหมดที่มีในเกม — คีย์คือ id ที่ใช้อ้างอิงในกระเป๋าผู้เล่น */
export const ITEMS: Record<string, ItemDefinition> = {
  'healing-peach': {
    id: 'healing-peach',
    name: 'ท้อสวรรค์',
    description: 'ท้อวิเศษจากสวนสวรรค์ ฟื้นพลังชีวิตให้ขุนพลหนึ่งตัวเมื่อใช้ในการต่อสู้',
    category: 'consumable',
    rarity: 'rare',
  },
  'spirit-incense': {
    id: 'spirit-incense',
    name: 'ธูปวิญญาณ',
    description: 'ธูปหอมสำหรับบูชาก่อนออกศึก เพิ่มค่าประสบการณ์ที่ได้รับชั่วคราว',
    category: 'consumable',
    rarity: 'common',
  },
  'iron-essence': {
    id: 'iron-essence',
    name: 'แก่นเหล็กพันปี',
    description: 'วัตถุดิบหลักสำหรับตีอาวุธและอัปเกรดยุทโธปกรณ์ของขุนพล',
    category: 'material',
    rarity: 'common',
  },
  'jade-shard': {
    id: 'jade-shard',
    name: 'เศษหยกศักดิ์สิทธิ์',
    description: 'เศษหยกที่แตกจากแท่นบูชาโบราณ ใช้ปลุกพลังกรอบโปรไฟล์และเครื่องประดับ',
    category: 'material',
    rarity: 'epic',
  },
  'naga-scale': {
    id: 'naga-scale',
    name: 'เกล็ดพญานาค',
    description: 'เกล็ดจากพญานาคผู้พิทักษ์ลำน้ำ ของล้ำค่าที่นักสะสมทุกคนตามหา',
    category: 'treasure',
    rarity: 'legendary',
  },
}

export function getItem(id: string): ItemDefinition | null {
  return ITEMS[id] ?? null
}
