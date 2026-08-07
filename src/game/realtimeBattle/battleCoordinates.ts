import { WORLD_SCALE } from './stageConfig'
import type { RealtimeBattleStage } from './stageConfig'
import type { Vec2 } from './types'

/**
 * สัญญาพิกัดห้องต่อสู้แบบ 2.5D side-down (Blueprint v3 — P1)
 *
 * Runtime (logic / collision / AI):
 *   x = แนวนอนซ้าย–ขวา
 *   y = แนว depth หน้า–หลังสนาม (ค่าน้อย = ด้านหลัง/ไกลกล้อง, ค่ามาก = ด้านหน้า/ใกล้กล้อง)
 *
 * Three.js world (presentation):
 *   worldX = (runtime.x - stage.width/2) * WORLD_SCALE
 *   worldZ = (runtime.y - stage.height/2) * WORLD_SCALE   ← depth axis
 *   worldY = ความสูง (พื้น = 0)
 *
 * กล้องมองจากด้านหน้าสนาม (+Z) เฉียงลงเล็กน้อย — ไม่ใช่ top-down
 */

/** @deprecated Use `combatCameraConfig.ts` — kept for imports that only need coordinate helpers. */
export const BATTLE_CAMERA_PITCH_DEG = 30

/** @deprecated Use `combatCameraConfig.ts`. */
export const BATTLE_CAMERA_DISTANCE = 5.0

/** @deprecated Use `combatCameraConfig.ts`. */
export const BATTLE_CAMERA_HEIGHT_BIAS = 0.58

/** @deprecated Use `combatCameraConfig.ts`. */
export const BATTLE_CAMERA_FOLLOW_RATE = 8

/** จำนวนแถบ depth ที่วาดบนพื้น (visual guide) */
export const BATTLE_DEPTH_LANE_COUNT = 5

export interface WorldXZ {
  x: number
  z: number
}

/** แปลงพิกัด runtime → ระนาบ XZ ของ three.js */
export function runtimeToWorldXZ(position: Vec2, stage: RealtimeBattleStage): WorldXZ {
  return {
    x: (position.x - stage.width / 2) * WORLD_SCALE,
    z: (position.y - stage.height / 2) * WORLD_SCALE,
  }
}

/** ค่า depth แบบ normalize 0 (หลังสุด) … 1 (หน้าสุด) — ใช้เรียงลำดับวาดสไปรต์ */
export function runtimeDepthNormalized(y: number, stage: RealtimeBattleStage): number {
  if (stage.height <= 0) return 0.5
  return Math.min(1, Math.max(0, y / stage.height))
}

/** สูงจากพื้นสำหรับฉายพิกัด HUD (หน่วย world) */
export const BATTLE_HUD_HEIGHT_OFFSET = 1.4
