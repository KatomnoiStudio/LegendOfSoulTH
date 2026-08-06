import { publicUrl } from '../lib/publicUrl'
import type { CharacterModelKind } from './characters'

/**
 * ชุดเฟรมสำหรับฉากเดิน (เดินชมจันทร์ / ลานฝึก)
 *
 * ─── สถานะทรัพยากรตอนนี้ ──────────────────────────────────
 * ซุนหงอคง      มีเฟรมเดินครบ 8 ทิศ ทิศละ 8 เฟรม (64 ไฟล์)
 * ตือโป๊ยก่าย    ไม่มีชุดเฟรมเดิน/หันทิศ/ยืนเฉยแล้ว — ถอดออกทั้งหมดเพื่อรออาร์ตชุดใหม่
 *                ตัวละครยังอยู่ในเกม (ROSTER, กาชา, จัดทีม) แต่เดินชมจันทร์ไม่ได้
 *                เหลือใช้ชุดท่าประจำทีม characters/pigsy-team-* ซึ่งเป็นอาร์ตคนละชุด
 *                ชีตเก่าเก็บไว้ใน assets/archive/characters/ (v1/v2/v3) พร้อมสคริปต์ตัด
 *                tools/cut-pigsy-v3-sheet.mjs ถ้าจะเอากลับมาใช้
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
  /** พาธนำหน้าไฟล์หันทิศ 8 ทิศ — null คือยังไม่มีชุดอาร์ต */
  turnPrefix: string | null
  /** พาธนำหน้าไฟล์ยืนเฉย ๆ — null คือยังไม่มีชุดอาร์ต */
  idlePrefix: string | null
  idleCount: number
}

const WALK_KITS: Record<CharacterModelKind, WalkKit> = {
  'monkey-king': {
    walkPrefix: publicUrl('characters/walk/monkey-walk'),
    turnPrefix: publicUrl('characters/turnaround/monkey-turn'),
    idlePrefix: publicUrl('characters/monkey-v2-idle'),
    idleCount: 24,
  },
  // ถอดชุดเฟรมเดิน/หันทิศ/ยืนเฉยออกหมดแล้ว รออาร์ตชุดใหม่ — ตัวละครยังอยู่ในเกม
  // แต่จะไม่ถูกเสนอในตัวเลือก "เดินชมจันทร์" เพราะ hasWalkFrames() คืน false
  // เหลือใช้ได้แค่ชุดท่าประจำทีม (characters/pigsy-team-*) ที่เป็นอาร์ตคนละชุดกัน
  'pig-warrior': {
    walkPrefix: null,
    turnPrefix: null,
    idlePrefix: null,
    idleCount: 0,
  },
  'pilgrim-monk': {
    walkPrefix: null,
    turnPrefix: publicUrl('characters/turnaround/tripitaka-turn'),
    idlePrefix: publicUrl('characters/tripitaka-idle'),
    idleCount: 24,
  },
}

export function getWalkKit(kind: CharacterModelKind): WalkKit {
  return WALK_KITS[kind]
}

/** ตัวละครตัวนี้เดินแบบขยับขาได้จริงหรือยัง */
export function hasWalkFrames(kind: CharacterModelKind): boolean {
  return WALK_KITS[kind].walkPrefix !== null
}
