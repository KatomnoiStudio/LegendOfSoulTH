import { publicUrl } from '../lib/publicUrl'
import type { OwnedCharacter } from '../types/player'
import type { HeroArchetype } from './heroes/heroArchetypes'

export type CharacterModelKind =
  'monkey-king' | 'pig-warrior' | 'pilgrim-monk' | 'celestial-archer' | 'nezha-warden' | 'sand-sage'

/** สไปรต์ idle เริ่มต้นของแต่ละตัวละคร ใช้เป็น fallback เมื่อไม่มี model.spriteUrl ให้ใช้ */
export const MONKEY_SPRITE_URL = publicUrl('characters/monkey-v2-idle-0.webp')
export const PIGSY_SPRITE_URL = publicUrl('characters/pigsy-idle-0.webp')
export const TRIPITAKA_SPRITE_URL = publicUrl('characters/tripitaka-idle-0.webp')
/** Placeholder sprites สำหรับ Batch 01 จนกว่าทีมภาพส่ง production asset */
export const ARCHER_SPRITE_URL = TRIPITAKA_SPRITE_URL
export const NEZHA_SPRITE_URL = MONKEY_SPRITE_URL
export const SAGE_SPRITE_URL = PIGSY_SPRITE_URL
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
  /** พลังชีวิต — สเกลใหญ่กว่าค่าอื่นมาก จึงมีเพดานแยกของตัวเอง (ดู STAT_MAX ใน CharacterStats.tsx) */
  hp: number
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
  /** บทบาทแสดงผล UI (ภาษาไทย) */
  role: string
  /** Archetype สำหรับ pipeline / balance — Blueprint §4.1 */
  archetype: HeroArchetype
  /** Production batch ที่ผ่าน certification — null = ยังไม่อยู่ใน batch */
  productionBatch: 'batch-01' | null
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
    archetype: 'fighter',
    productionBatch: 'batch-01',
    element: 'ลม',
    rarity: 'legendary',
    level: 40,
    exp: 7320,
    expToNext: 12000,
    stats: { hp: 1180, atk: 92, def: 78, spd: 96 },
    model: {
      kind: 'monkey-king',
      spriteUrl: MONKEY_SPRITE_URL,
      accent: '#ffd765',
    },
  },
  {
    id: 'pig-warrior',
    name: 'ตือโป๊ยก่าย',
    epithet: 'ขุนพลคราดเก้าซี่',
    origin: 'Myth',
    lore: 'อดีตแม่ทัพสวรรค์ผู้มีพละกำลังมหาศาล แม้ชอบบ่นและรักสบายแต่ไม่เคยทิ้งพวกพ้องในยามคับขัน',
    role: 'นักรบหนัก',
    archetype: 'heavy',
    productionBatch: 'batch-01',
    element: 'ดิน',
    rarity: 'epic',
    level: 38,
    exp: 5140,
    expToNext: 11000,
    stats: { hp: 1420, atk: 98, def: 84, spd: 71 },
    model: {
      kind: 'pig-warrior',
      spriteUrl: PIGSY_SPRITE_URL,
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
    archetype: 'support',
    productionBatch: null,
    element: 'แสง',
    rarity: 'epic',
    level: 36,
    exp: 8960,
    expToNext: 10500,
    stats: { hp: 980, atk: 95, def: 70, spd: 88 },
    model: {
      kind: 'pilgrim-monk',
      spriteUrl: TRIPITAKA_SPRITE_URL,
      accent: '#fff0a2',
    },
  },
  {
    id: 'celestial-archer',
    name: 'จือหลาง',
    epithet: 'นักธนูสวรรค์',
    origin: 'Myth',
    lore: 'นักธนูผู้ยิงแม่นยำจากระยะไกล คุมจังหวะการต่อสู้ด้วยลูกศรที่เจาะแนวรบศัตรู',
    role: 'นักธนูระยะไกล',
    archetype: 'ranged',
    productionBatch: 'batch-01',
    element: 'ลม',
    rarity: 'epic',
    level: 34,
    exp: 4200,
    expToNext: 9800,
    stats: { hp: 920, atk: 88, def: 62, spd: 94 },
    model: {
      kind: 'celestial-archer',
      spriteUrl: ARCHER_SPRITE_URL,
      accent: '#8fd4ff',
    },
  },
  {
    id: 'nezha-warden',
    name: 'นาจา',
    epithet: 'เทพเด็กแห่งสามมหาสมุทร',
    origin: 'Myth',
    lore: 'ผู้ควบคุมสมรภภูมิด้วยแหวนและสายรุ้ง จำกัดศัตรูด้วย CC โดยไม่พึ่ง knockdown',
    role: 'ผู้ควบคุมสมรภูมิ',
    archetype: 'control',
    productionBatch: 'batch-01',
    element: 'ไฟ',
    rarity: 'rare',
    level: 32,
    exp: 3100,
    expToNext: 9000,
    stats: { hp: 960, atk: 82, def: 68, spd: 102 },
    model: {
      kind: 'nezha-warden',
      spriteUrl: NEZHA_SPRITE_URL,
      accent: '#ff7a6e',
    },
  },
  {
    id: 'sand-sage',
    name: 'ชาหวู่จิง',
    epithet: 'พระสงฆ์แห่งทรายทอง',
    origin: 'Myth',
    lore: 'ผู้เรียกวิญญาณทหารเงาและเยียวยาพรรคพวกด้วยลูกประคำศักดิ์สิทธิ์',
    role: 'ผู้เรียกวิญญาณ',
    archetype: 'summoner',
    productionBatch: 'batch-01',
    element: 'ดิน',
    rarity: 'rare',
    level: 33,
    exp: 3800,
    expToNext: 9200,
    stats: { hp: 1010, atk: 78, def: 72, spd: 85 },
    model: {
      kind: 'sand-sage',
      spriteUrl: SAGE_SPRITE_URL,
      accent: '#c9a86c',
    },
  },
]

export function getCharacter(id: string | null): Character | null {
  if (!id) return null
  return ROSTER.find((character) => character.id === id) ?? null
}

/**
 * น้ำหนักของ HP ในการคิดพลังรบ
 *
 * HP อยู่คนละสเกลกับค่าอื่น (หลักพัน เทียบกับหลักสิบ) ถ้าบวกดิบ ๆ HP จะกินสัดส่วน
 * ราว 80% ของพลังรบทั้งหมด ทำให้ atk/def/spd แทบไม่มีผลเลย จึงถ่วงให้ HP
 * มีน้ำหนักใกล้เคียงกับผลรวมของอีกสามค่า
 */
const HP_POWER_WEIGHT = 0.2

/** พลังรบรวมของบัญชี — ผลรวมของค่าสถานะทุกตัว (hp ถ่วงน้ำหนัก + atk + def + spd) คูณเลเวล ของทุกตัวละครที่ครอบครอง */
export function getCombatPower(ownedCharacters: OwnedCharacter[]): number {
  return ownedCharacters.reduce((total, owned) => {
    const base = getCharacter(owned.characterId)
    if (!base) return total
    const { hp, atk, def, spd } = base.stats
    const statSum = hp * HP_POWER_WEIGHT + atk + def + spd
    return total + Math.round(statSum * owned.level)
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
