import { publicUrl } from '../lib/publicUrl'
import type { CharacterModelKind } from './characters'

/**
 * ชุดเฟรมสำหรับฉากเดิน (เดินชมจันทร์ / ลานฝึก)
 *
 * ─── สถานะทรัพยากรตอนนี้ ──────────────────────────────────
 * ซุนหงอคง      มีเฟรมเดินครบ 8 ทิศ ทิศละ 8 เฟรม (64 ไฟล์)
 * ตือโป๊ยก่าย    มีเฟรมเดินครบ 8 ทิศ ทิศละ 8 เฟรม ตัดจากชีต v4 ด้วย
 *                tools/cut-pigsy-v4-sheet.mjs (ชีตอยู่ที่
 *                assets/archive/characters/pigsy-v4-walk-sheet.png) รันใหม่ได้ตลอด
 *                ชีตวาดมาครบทุกทิศจริงรวมด้านข้างแท้ ไม่ต้องพลิกกระจกสร้างทิศไหนเอง
 *                ยังไม่มีแถวท่าหายใจ เฟรมยืนเฉยจึงเป็นท่าหันหน้าท่าเดียวซ้ำ 24 เฟรม
 *                ถ้าได้แถวท่าหายใจมาเพิ่ม ให้แก้ส่วน idle ในสคริปต์ให้ไล่เฟรมจริงแทน
 * พระถังซัมจั๋ง  ยังไม่มีเฟรมเดิน มีแต่เฟรมหันทิศ 8 ทิศ
 * เอ้อหลางเสิน   วาดชุดวิ่งมาเฉพาะด้านขวา ยังไม่ครบ 8 ทิศ จึงยังนับว่าไม่มีเฟรมเดิน
 *
 * ตัวที่ยังไม่มีเฟรมเดินจะเลือกมาเดินได้ แต่ใช้ภาพหันทิศแทน
 * (ขาไม่ขยับ) และ UI จะบอกผู้เล่นตามตรงว่ายังไม่มีชุดเฟรมเดิน
 * เมื่อวาดเฟรมเดินเพิ่มแล้ว ให้ใส่ walkPrefix แล้วทุกอย่างทำงานทันที
 * ───────────────────────────────────────────────────────────
 */

export interface WalkKit {
  /**
   * พาธนำหน้าไฟล์เดิน — null คือยังไม่มี
   * ทุกพาธในไฟล์นี้ผ่าน publicUrl() แล้ว (ดู src/lib/publicUrl.ts) ผู้เรียกจึงต่อท้ายได้เลย
   */
  walkPrefix: string | null
  animationMode?: 'eight-direction' | 'side-view'
  walkFrameCount?: number
  /** พาธนำหน้าไฟล์หันทิศ 8 ทิศ (มีครบทุกตัว) */
  turnPrefix: string
  /** พาธนำหน้าไฟล์ยืนเฉย ๆ */
  idlePrefix: string
  idleCount: number
}

const WALK_KITS: Record<CharacterModelKind, WalkKit> = {
  'monkey-king': {
    walkPrefix: publicUrl('characters/wukong-flat-run'),
    animationMode: 'side-view',
    walkFrameCount: 25,
    turnPrefix: publicUrl('characters/wukong-flat-idle'),
    idlePrefix: publicUrl('characters/wukong-flat-idle'),
    idleCount: 25,
  },
  'pig-warrior': {
    walkPrefix: publicUrl('characters/walk/pigsy-walk'),
    turnPrefix: publicUrl('characters/turnaround/pigsy-turn'),
    idlePrefix: publicUrl('characters/pigsy-idle'),
    idleCount: 24,
  },
  'pilgrim-monk': {
    walkPrefix: null,
    turnPrefix: publicUrl('characters/turnaround/tripitaka-turn'),
    idlePrefix: publicUrl('characters/tripitaka-idle'),
    idleCount: 24,
  },
  'celestial-archer': {
    walkPrefix: null,
    turnPrefix: publicUrl('characters/turnaround/tripitaka-turn'),
    idlePrefix: publicUrl('characters/tripitaka-idle'),
    idleCount: 24,
  },
  'nezha-warden': {
    walkPrefix: publicUrl('characters/walk/monkey-walk'),
    turnPrefix: publicUrl('characters/turnaround/monkey-turn'),
    idlePrefix: publicUrl('characters/monkey-v2-idle'),
    idleCount: 24,
  },
  'sand-sage': {
    walkPrefix: publicUrl('characters/walk/pigsy-walk'),
    turnPrefix: publicUrl('characters/turnaround/pigsy-turn'),
    idlePrefix: publicUrl('characters/pigsy-idle'),
    idleCount: 24,
  },
  /*
     เอ้อหลางเสิน — ชุดเดินที่วาดมามีแต่ด้านขวาด้านเดียว (erlang-shen-v3-run-right-*)
     ส่วนผู้เรียกใช้ (WukongAdventure.tsx) ขอ `${walkPrefix}-${ทิศ}-${เฟรม}.webp` ครบ 8 ทิศ
     ใส่พาธด้านขวาลงไปตรง ๆ = 7 ใน 8 ทิศยิง 404 จึงประกาศตามจริงว่ายังไม่มีชุดเดิน
     (walkPrefix: null) เหมือนพระถังกับจือหลาง — ฉากเดินชมจันทร์จะไม่ให้เลือกตัวนี้เอง
     และ UI บอกผู้เล่นตามตรง วาดครบ 8 ทิศเมื่อไหร่ค่อยใส่ walkPrefix แล้วใช้งานได้ทันที
  */
  'spear-warrior': {
    walkPrefix: null,
    turnPrefix: publicUrl('characters/turnaround/spear-warrior-stop-turn'),
    idlePrefix: publicUrl('characters/erlang-shen-v6-idle'),
    idleCount: 25,
  },
}

export function getWalkKit(kind: CharacterModelKind): WalkKit {
  return WALK_KITS[kind]
}

/** ตัวละครตัวนี้เดินแบบขยับขาได้จริงหรือยัง */
export function hasWalkFrames(kind: CharacterModelKind): boolean {
  return WALK_KITS[kind].walkPrefix !== null
}
