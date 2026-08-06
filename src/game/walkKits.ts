import { publicUrl } from '../lib/publicUrl'
import type { CharacterModelKind } from './characters'

/**
 * ชุดเฟรมสำหรับฉากเดิน (เดินชมจันทร์ / ลานฝึก)
 *
 * ─── สถานะทรัพยากรตอนนี้ ──────────────────────────────────
 * ซุนหงอคง      มีเฟรมเดินครบ 8 ทิศ ทิศละ 8 เฟรม (64 ไฟล์)
 * ตือโป๊ยก่าย    มีเฟรมเดินครบ 8 ทิศแล้ว — ต้นฉบับวาดมาทิศละ 7 เฟรม (ไม่ใช่ 8)
 *                เฟรมที่ 8 ของทุกทิศ = สำเนาเฟรมที่ 7 ซ้ำ (ตัด/แปลงอัตโนมัติ ยังไม่ได้วาดเพิ่ม)
 *                ถ้าได้เฟรมที่ 8 จริงมาทีหลัง ให้แทนที่ไฟล์ pigsy-walk-{ทิศ}-7.webp ได้เลย
 *                ตัดจากชีตต้นฉบับด้วย tools/cut-pigsy-walk-sheet.mjs (ชีตเก็บไว้ที่
 *                assets/archive/characters/pigsy-walk-sheet.png) — รันสคริปต์ใหม่ได้ตลอด
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
  /** พาธนำหน้าไฟล์หันทิศ 8 ทิศ (มีครบทุกตัว) */
  turnPrefix: string
  /** พาธนำหน้าไฟล์ยืนเฉย ๆ */
  idlePrefix: string
  idleCount: number
}

const WALK_KITS: Record<CharacterModelKind, WalkKit> = {
  'monkey-king': {
    walkPrefix: publicUrl('characters/walk/monkey-walk'),
    turnPrefix: publicUrl('characters/turnaround/monkey-turn'),
    idlePrefix: publicUrl('characters/monkey-v2-idle'),
    idleCount: 24,
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
}

export function getWalkKit(kind: CharacterModelKind): WalkKit {
  return WALK_KITS[kind]
}

/** ตัวละครตัวนี้เดินแบบขยับขาได้จริงหรือยัง */
export function hasWalkFrames(kind: CharacterModelKind): boolean {
  return WALK_KITS[kind].walkPrefix !== null
}
