import type { CharacterModelKind } from './characters'

/**
 * ชุดเฟรมสำหรับฉากเดิน (เดินชมจันทร์ / ลานฝึก)
 *
 * ─── สถานะทรัพยากรตอนนี้ ──────────────────────────────────
 * ซุนหงอคง      มีเฟรมเดินครบ 8 ทิศ ทิศละ 8 เฟรม (64 ไฟล์)
 * ตือโป๊ยก่าย    ยังไม่มีเฟรมเดิน มีแต่เฟรมหันทิศ 8 ทิศ
 * พระถังซัมจั๋ง  ยังไม่มีเฟรมเดิน มีแต่เฟรมหันทิศ 8 ทิศ
 *
 * ตัวที่ยังไม่มีเฟรมเดินจะเลือกมาเดินได้ แต่ใช้ภาพหันทิศแทน
 * (ขาไม่ขยับ) และ UI จะบอกผู้เล่นตามตรงว่ายังไม่มีชุดเฟรมเดิน
 * เมื่อวาดเฟรมเดินเพิ่มแล้ว ให้ใส่ walkPrefix แล้วทุกอย่างทำงานทันที
 * ───────────────────────────────────────────────────────────
 */

export interface WalkKit {
  /** พาธนำหน้าไฟล์เดิน เช่น '/characters/walk/monkey-walk' — null คือยังไม่มี */
  walkPrefix: string | null
  /** พาธนำหน้าไฟล์หันทิศ 8 ทิศ (มีครบทุกตัว) */
  turnPrefix: string
  /** พาธนำหน้าไฟล์ยืนเฉย ๆ */
  idlePrefix: string
  idleCount: number
}

const WALK_KITS: Record<CharacterModelKind, WalkKit> = {
  'monkey-king': {
    walkPrefix: '/characters/walk/monkey-walk',
    turnPrefix: '/characters/turnaround/monkey-turn',
    idlePrefix: '/characters/monkey-v2-idle',
    idleCount: 24,
  },
  'pig-warrior': {
    walkPrefix: null,
    turnPrefix: '/characters/turnaround/pigsy-turn',
    idlePrefix: '/characters/pigsy-idle',
    idleCount: 24,
  },
  'pilgrim-monk': {
    walkPrefix: null,
    turnPrefix: '/characters/turnaround/tripitaka-turn',
    idlePrefix: '/characters/tripitaka-idle',
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
