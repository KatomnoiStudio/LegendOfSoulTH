import { publicUrl } from '../lib/publicUrl'
import type { CharacterModelKind } from './characters'

/**
 * ลำดับเฟรมภาพของตัวละครแต่ละตัว — แหล่งความจริงจุดเดียว
 *
 * ใช้ร่วมกันระหว่าง:
 * - ฉาก 3D ในหน้า Lobby (src/components/LobbyScene/CharacterModel.tsx)
 * - ภาพตัวละครใหญ่ในหน้าทำเนียบวีรชน (src/components/CharacterRoster/CharacterPreview.tsx)
 *
 * ทั้งสองที่จึงเล่นชุดเฟรมเดียวกันด้วยจังหวะเดียวกัน ไม่ต้องมีไฟล์ภาพชุดใหม่
 * (แอนิเมชันหายใจ หาง และผ้าคลุม ถูกวาดไว้ในเฟรมเหล่านี้อยู่แล้ว)
 */
export interface SpriteSequence {
  idleUrls: string[]
  actionUrls: string[]
  /** เฟรมหมุนจริง 8 ทิศ: หน้า, เฉียงขวา, ขวา, หลังขวา, หลัง, หลังซ้าย, ซ้าย, เฉียงซ้าย */
  turnUrls: string[]
  actionOrder: number[]
  idleRate: number
  actionRate: number
  autoPeriod: number
}

/** ช่วยสร้างรายชื่อไฟล์เฟรมที่ตั้งชื่อเรียงเลขต่อกัน (ผ่าน publicUrl เสมอ ดู src/lib/publicUrl.ts) */
function frames(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => publicUrl(`characters/${prefix}-${index}.webp`))
}

/** ชุดเฟรมหมุน 8 ทิศของตัวละครหนึ่งตัว */
function turnFrames(prefix: string): string[] {
  return Array.from({ length: 8 }, (_, index) => publicUrl(`characters/turnaround/${prefix}-${index}.webp`))
}

/**
 * ชุดเฟรมของทุกตัวละคร
 *
 * ใช้ Record ที่ต้องมีครบทุก kind แทนการไล่ if แล้ว return ตัวสุดท้ายเป็น default
 * เพิ่ม CharacterModelKind ใหม่เมื่อไหร่ TypeScript จะฟ้องทันทีว่ายังไม่ได้ใส่ชุดเฟรม
 * (ของเดิมตัวใหม่จะตกไปใช้เฟรมของพระถังซัมจั๋งเงียบ ๆ โดยไม่มี error)
 */
const SEQUENCES: Record<CharacterModelKind, SpriteSequence> = {
  'monkey-king': {
    idleUrls: frames('monkey-v2-idle', 24),
    actionUrls: frames('monkey-v2', 10),
    turnUrls: turnFrames('monkey-turn'),
    actionOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    idleRate: 8,
    actionRate: 8,
    autoPeriod: 11.4,
  },
  /*
     ชุดเฟรมยืนเฉย (pigsy-idle-*) กับหมุนทิศ (pigsy-turn-*) ถูกถอดออกไปแล้ว รออาร์ตชุดใหม่
     ที่นี่จึงใช้ชุดท่าประจำทีม (pigsy-team-*) ซึ่งยังเหลืออยู่ ทำหน้าที่แทนทั้งสามอย่าง
     ตัวละครเลยยังแสดงผลได้ครบทุกที่ ไม่มีภาพเสีย แค่ไม่มีท่าหมุนทิศจริงเท่านั้น
     (เฟรมหมุนทั้ง 8 ทิศชี้ไปที่ภาพเดียวกัน ตัวจะไม่หันตามทิศจนกว่าจะได้อาร์ตใหม่)
  */
  'pig-warrior': {
    idleUrls: frames('pigsy-team', 8),
    actionUrls: frames('pigsy-team', 8),
    turnUrls: Array.from({ length: 8 }, () => publicUrl('characters/pigsy-team-0.webp')),
    actionOrder: [0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 6, 5, 4, 3, 2, 1, 0],
    idleRate: 8,
    actionRate: 5.5,
    autoPeriod: 13.2,
  },
  'pilgrim-monk': {
    idleUrls: frames('tripitaka-idle', 24),
    actionUrls: [],
    turnUrls: turnFrames('tripitaka-turn'),
    actionOrder: [],
    idleRate: 8,
    actionRate: 8,
    autoPeriod: 9.6,
  },
}

export function getSpriteSequence(kind: CharacterModelKind): SpriteSequence {
  return SEQUENCES[kind]
}
