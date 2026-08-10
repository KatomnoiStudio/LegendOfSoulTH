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
  /** จำนวนเฟรมของ 1 รอบท่าเดิน */
  walkFrameCount: number
  /** Optional in-place run animation, independent of the directional walk set. */
  runPrefix: string | null
  runFrameCount: number
  runFrameDuration: number
  /** ระยะที่เดินต่อหนึ่งเฟรม เพื่อให้ความเร็วรอบเดินคงที่แม้จำนวนเฟรมต่างกัน */
  walkFrameStride: { walking: number; running: number }
  /** ชีตมีภาพด้านขวาเพียงด้านเดียว จึงกลับภาพเมื่อเคลื่อนที่ไปทางซ้าย */
  usesMirroredSideView: boolean
  /** พาธนำหน้าไฟล์หันทิศ 8 ทิศ (มีครบทุกตัว) */
  turnPrefix: string | null
  /** พาธนำหน้าไฟล์ยืนเฉย ๆ */
  idlePrefix: string
  idleCount: number
  /** Milliseconds each idle frame remains visible. */
  idleFrameDuration: number
  idleScale: number
}

const WALK_KITS: Record<CharacterModelKind, WalkKit> = {
  'monkey-king': {
    walkPrefix: publicUrl('characters/walk/wukong-walk'),
    walkFrameCount: 8,
    runPrefix: publicUrl('characters/monkey-king-run-erlang-style-local/run'),
    runFrameCount: 12,
    runFrameDuration: 125,
    walkFrameStride: { walking: 24, running: 20 },
    usesMirroredSideView: false,
    turnPrefix: publicUrl('characters/turnaround/wukong-turn'),
    idlePrefix: publicUrl('characters/monkey-king-idle-local/idle'),
    idleCount: 12,
    idleFrameDuration: 300,
    idleScale: 1,
  },
  'pig-warrior': {
    walkPrefix: publicUrl('characters/walk/pigsy-walk'),
    walkFrameCount: 8,
    runPrefix: null,
    runFrameCount: 0,
    runFrameDuration: 125,
    walkFrameStride: { walking: 24, running: 20 },
    usesMirroredSideView: false,
    turnPrefix: publicUrl('characters/turnaround/pigsy-turn'),
    idlePrefix: publicUrl('characters/pigsy-idle'),
    idleCount: 24,
    idleFrameDuration: 170,
    idleScale: 1,
  },
  'pilgrim-monk': {
    walkPrefix: null,
    walkFrameCount: 8,
    runPrefix: null,
    runFrameCount: 0,
    runFrameDuration: 125,
    walkFrameStride: { walking: 24, running: 20 },
    usesMirroredSideView: false,
    turnPrefix: publicUrl('characters/turnaround/tripitaka-turn'),
    idlePrefix: publicUrl('characters/tripitaka-idle'),
    idleCount: 24,
    idleFrameDuration: 170,
    idleScale: 1,
  },
  'spear-warrior': {
    walkPrefix: publicUrl('characters/walk/erlang-shen-v3-run'),
    walkFrameCount: 25,
    runPrefix: null,
    runFrameCount: 0,
    runFrameDuration: 125,
    walkFrameStride: { walking: 20, running: 16 },
    usesMirroredSideView: true,
    turnPrefix: null,
    idlePrefix: publicUrl('characters/erlang-shen-v6-idle'),
    idleCount: 25,
    idleFrameDuration: 221,
    idleScale: 1,
  },
  'celestial-archer': {
    walkPrefix: null,
    walkFrameCount: 8,
    runPrefix: null,
    runFrameCount: 0,
    runFrameDuration: 125,
    walkFrameStride: { walking: 24, running: 20 },
    usesMirroredSideView: false,
    turnPrefix: publicUrl('characters/turnaround/tripitaka-turn'),
    idlePrefix: publicUrl('characters/tripitaka-idle'),
    idleCount: 24,
    idleFrameDuration: 170,
    idleScale: 1,
  },
  'nezha-warden': {
    walkPrefix: publicUrl('characters/walk/monkey-walk'),
    walkFrameCount: 8,
    runPrefix: null,
    runFrameCount: 0,
    runFrameDuration: 125,
    walkFrameStride: { walking: 24, running: 20 },
    usesMirroredSideView: false,
    turnPrefix: publicUrl('characters/turnaround/monkey-turn'),
    idlePrefix: publicUrl('characters/monkey-v2-idle'),
    idleCount: 24,
    idleFrameDuration: 170,
    idleScale: 1,
  },
  'sand-sage': {
    walkPrefix: publicUrl('characters/walk/pigsy-walk'),
    walkFrameCount: 8,
    runPrefix: null,
    runFrameCount: 0,
    runFrameDuration: 125,
    walkFrameStride: { walking: 24, running: 20 },
    usesMirroredSideView: false,
    turnPrefix: publicUrl('characters/turnaround/pigsy-turn'),
    idlePrefix: publicUrl('characters/pigsy-idle'),
    idleCount: 24,
    idleFrameDuration: 170,
    idleScale: 1,
  },
}

export function getWalkKit(kind: CharacterModelKind): WalkKit {
  return WALK_KITS[kind]
}

/** ตัวละครตัวนี้เดินแบบขยับขาได้จริงหรือยัง */
export function hasWalkFrames(kind: CharacterModelKind): boolean {
  return WALK_KITS[kind].walkPrefix !== null
}
