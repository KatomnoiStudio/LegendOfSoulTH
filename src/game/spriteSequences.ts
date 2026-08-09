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
  return Array.from({ length: count }, (_, index) =>
    publicUrl(`characters/${prefix}-${index}.webp`),
  )
}

/** ชุดเฟรมหมุน 8 ทิศของตัวละครหนึ่งตัว */
function turnFrames(prefix: string): string[] {
  return Array.from({ length: 8 }, (_, index) =>
    publicUrl(`characters/turnaround/${prefix}-${index}.webp`),
  )
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
  'pig-warrior': {
    idleUrls: frames('pigsy-idle', 24),
    actionUrls: frames('pigsy-team', 8),
    turnUrls: turnFrames('pigsy-turn'),
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
  'celestial-archer': {
    idleUrls: frames('tripitaka-idle', 24),
    actionUrls: [],
    turnUrls: turnFrames('tripitaka-turn'),
    actionOrder: [],
    idleRate: 8,
    actionRate: 8,
    autoPeriod: 9.6,
  },
  'nezha-warden': {
    idleUrls: frames('monkey-v2-idle', 24),
    actionUrls: frames('monkey-v2', 10),
    turnUrls: turnFrames('monkey-turn'),
    actionOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    idleRate: 8,
    actionRate: 8,
    autoPeriod: 11.4,
  },
  'sand-sage': {
    idleUrls: frames('pigsy-idle', 24),
    actionUrls: frames('pigsy-team', 8),
    turnUrls: turnFrames('pigsy-turn'),
    actionOrder: [0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 6, 5, 4, 3, 2, 1, 0],
    idleRate: 8,
    actionRate: 5.5,
    autoPeriod: 13.2,
  },
  'spear-warrior': {
    idleUrls: frames('erlang-shen-v6-idle', 25),
    actionUrls: frames('erlang-shen-normal-attack-v2', 8),
    /*
       เอ้อหลางเสินไม่มีชุดหมุน 8 ทิศจริง มีแค่ท่าคีย์สะอาด 4 ท่า (ด้านข้าง → หันหน้า)
       ที่ตัด interpolation ของ stop-turn ทิ้ง — เฟรม interpolate มีเงาซ้อน (onion-skin)
       ติดมาด้วยจึงไม่เอามาโชว์ ผู้เรียกใช้ `turn % turnUrls.length` อยู่แล้ว 4 ท่าจึงวนได้
       ห้ามใส่ [] เด็ดขาด — `% 0` เป็น NaN แล้วตัวละครหายทั้งตัวตอนผู้เล่นลากหมุน
    */
    turnUrls: Array.from({ length: 4 }, (_, index) =>
      publicUrl(`characters/turnaround/spear-warrior-stop-turn-key-${index}.webp`),
    ),
    actionOrder: [0, 1, 2, 3, 4, 5, 6, 7],
    idleRate: 8,
    actionRate: 14,
    autoPeriod: 12,
  },
}

export function getSpriteSequence(kind: CharacterModelKind): SpriteSequence {
  return SEQUENCES[kind]
}
