import type { OwnedCharacter } from '../types/player'

export type CharacterModelKind = 'monkey-king' | 'pig-warrior' | 'pilgrim-monk'
export type CharacterOrigin = 'Myth' | 'History' | 'Original'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * ข้อมูลที่ใช้วาดตัวละครบนหน้าจอ — มีเฉพาะฟิลด์ที่มีผลกับภาพจริง
 *
 * เดิมมี 13 ฟิลด์ แต่ 9 ตัว (skin/primary/secondary/cape/weapon/headgear/
 * height/build/tail) มีไว้ป้อนโมเดล low-poly ที่ถูกเลิกใช้ไปแล้ว จึงถูกลบทิ้ง
 */
export interface ModelSpec {
  /** เฟรมแรกของชุด idle ใช้เป็นรูปย่อในการ์ดตัวละคร */
  spriteUrl: string
  /** คีย์ค้นชุดเฟรมแอนิเมชัน (ดู src/game/spriteSequences.ts) */
  kind: CharacterModelKind
  /** สีประจำตัว ใช้กับวงแหวนใต้เท้า แสงเรือง และขอบการ์ด */
  accent: string
}

export interface CharacterStats {
  atk: number
  def: number
  spd: number
}

export interface Character {
  id: string
  name: string
  epithet: string
  origin: CharacterOrigin
  lore: string
  role: string
  element: string
  rarity: Rarity
  level: number
  /** EXP สะสมในเลเวลปัจจุบัน */
  exp: number
  /** EXP ที่ต้องใช้เพื่อขึ้นเลเวลถัดไป */
  expToNext: number
  stats: CharacterStats
  model: ModelSpec
}

/*
   หมายเหตุ: ตำแหน่งที่ยืนในลานประลองไม่ได้อยู่ในไฟล์นี้แล้ว
   เพราะเป็นข้อมูลของบัญชีผู้เล่น ไม่ใช่ของตัวละคร — ดู src/game/team.ts
*/

export const ROSTER: Character[] = [
  {
    id: 'monkey-king',
    name: 'ซุนหงอคง',
    epithet: 'มหาเทพเสมอฟ้า',
    origin: 'Myth',
    lore: 'ราชาวานรผู้ถือกระบองวิเศษ นักรบผู้ไม่ยอมก้มหัวต่อสวรรค์และพร้อมปกป้องสหายทุกเมื่อ',
    role: 'นักรบกองหน้า',
    element: 'ลม',
    rarity: 'legendary',
    level: 40,
    exp: 7320,
    expToNext: 12000,
    stats: { atk: 92, def: 78, spd: 96 },
    model: {
      kind: 'monkey-king',
      spriteUrl: '/characters/monkey-v2-idle-0.png',
      accent: '#ffd765',
    },
  },
  {
    id: 'pig-warrior',
    name: 'ตือโป๊ยก่าย',
    epithet: 'ขุนพลคราดเก้าซี่',
    origin: 'Myth',
    lore: 'อดีตแม่ทัพสวรรค์ผู้มีพละกำลังมหาศาล แม้ชอบบ่นและรักสบายแต่ไม่เคยทิ้งพวกพ้องในยามคับขัน',
    role: 'ผู้พิทักษ์',
    element: 'ดิน',
    rarity: 'epic',
    level: 38,
    exp: 5140,
    expToNext: 11000,
    stats: { atk: 98, def: 84, spd: 71 },
    model: {
      kind: 'pig-warrior',
      spriteUrl: '/characters/pigsy-idle-0.png',
      accent: '#7ee0ff',
    },
  },
  {
    id: 'pilgrim-monk',
    name: 'พระถังซัมจั๋ง',
    epithet: 'ผู้จาริกแห่งแสงธรรม',
    origin: 'Myth',
    lore: 'พระผู้เดินทางสู่ชมพูทวีปด้วยศรัทธามั่นคง พลังพุทธบารมีช่วยคุ้มครองและเยียวยาเหล่าสหาย',
    role: 'ผู้สนับสนุน',
    element: 'แสง',
    rarity: 'epic',
    level: 36,
    exp: 8960,
    expToNext: 10500,
    stats: { atk: 95, def: 70, spd: 88 },
    model: {
      kind: 'pilgrim-monk',
      spriteUrl: '/characters/tripitaka-idle-0.png',
      accent: '#fff0a2',
    },
  },
]

export function getCharacter(id: string | null): Character | null {
  if (!id) return null
  return ROSTER.find((character) => character.id === id) ?? null
}

/** พลังรบรวมของบัญชี — ผลรวมของ (atk+def+spd ฐาน) คูณเลเวลที่ปลุกพลัง ของทุกตัวละครที่ครอบครอง */
export function getCombatPower(ownedCharacters: OwnedCharacter[]): number {
  return ownedCharacters.reduce((total, owned) => {
    const base = getCharacter(owned.characterId)
    if (!base) return total
    const statSum = base.stats.atk + base.stats.def + base.stats.spd
    return total + statSum * owned.level
  }, 0)
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'ธรรมดา',
  rare: 'หายาก',
  epic: 'มหากาพย์',
  legendary: 'ตำนาน',
}

export const ORIGIN_LABEL: Record<CharacterOrigin, string> = {
  Myth: 'ตำนาน',
  History: 'ประวัติศาสตร์',
  Original: 'ออริจินัล',
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#98a0c0',
  rare: '#6d8cff',
  epic: '#b06dff',
  legendary: '#f0c85a',
}
