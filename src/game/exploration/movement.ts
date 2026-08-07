// ปิดไว้ชั่วคราว — โหมดสำรวจ (HetCreep สั่ง 2026-08-07)
//
// โค้ดทั้งไฟล์ถูกคอมเมนต์ไว้ ไม่ได้ลบ ระบบสำรวจ/บทสนทนา/NPC ไม่มีทางเข้าในเกมมาตั้งแต่
// PR #11 — ปุ่มในลอบบี้ทั้งสองปุ่มเปิด LobbyBattleSession เข้าห้องต่อสู้ตรง ๆ ไฟล์ในกอง
// นี้จึงไม่มีใคร import เลย ยืนยันด้วยการไล่ import graph จาก src/main.tsx ไม่ใช่ grep
// (21 ไฟล์ 1,579 บรรทัด + เทสต์ที่พึ่งมันอีก 3 ไฟล์)
//
// ทำไมคอมเมนต์แทนลบ: ตัดสินใจไว้ว่ายังไม่ลบ ของยังอยู่ให้อ่านและกู้ได้ทันทีโดยไม่ต้องขุด
// git แต่ก็ไม่กินเวลา typecheck/lint/test และไม่หลอกให้ใครคิดว่าเป็นโค้ดที่ยังทำงานอยู่
//
// เปิดกลับ: ลบ '// ' หน้าทุกบรรทัดในไฟล์กองนี้ แล้วต่อทางเข้าใหม่ใน LobbyPage
// (อย่าลืมเอา exclude ของสามไฟล์เทสต์ออกจาก vite.config.ts ด้วย)
//
// ─────────────────────────────────────────────────────────────────────────────

// โค้ดจริงถูกคอมเมนต์ไว้ทั้งหมด บรรทัดนี้ทำให้ไฟล์ยังเป็นโมดูลที่ถูกต้องและไม่ใช่ไฟล์ว่าง
// ไม่มีผลตอนรัน (type-only) ลบทิ้งได้ตอนเปิดโค้ดกลับ
export type ExplorationModeClosed = never

// import type { Direction, MovementVector, PlayerPosition } from './types'
//
// const DIRECTION_VECTORS: Record<Direction, MovementVector> = {
//   up: { x: 0, y: -1 },
//   down: { x: 0, y: 1 },
//   left: { x: -1, y: 0 },
//   right: { x: 1, y: 0 },
// }
//
// export const MOVE_SPEED = 180
//
// export function vectorFromDirection(direction: Direction): MovementVector {
//   return DIRECTION_VECTORS[direction]
// }
//
// export function directionFromVector(vector: MovementVector): Direction {
//   if (Math.abs(vector.x) > Math.abs(vector.y)) {
//     return vector.x < 0 ? 'left' : 'right'
//   }
//   return vector.y < 0 ? 'up' : 'down'
// }
//
// export function movePosition(
//   position: PlayerPosition,
//   vector: MovementVector,
//   deltaSeconds: number,
//   speed = MOVE_SPEED,
// ): PlayerPosition {
//   if (vector.x === 0 && vector.y === 0) return position
//
//   const length = Math.hypot(vector.x, vector.y)
//   const nx = (vector.x / length) * speed * deltaSeconds
//   const ny = (vector.y / length) * speed * deltaSeconds
//
//   return {
//     x: position.x + nx,
//     y: position.y + ny,
//     direction: directionFromVector(vector),
//   }
// }
//
// export function nudgeAwayFrom(
//   position: PlayerPosition,
//   target: { x: number; y: number },
//   distance: number,
// ): PlayerPosition {
//   const dx = position.x - target.x
//   const dy = position.y - target.y
//   const length = Math.hypot(dx, dy) || 1
//   return {
//     ...position,
//     x: target.x + (dx / length) * distance,
//     y: target.y + (dy / length) * distance,
//   }
// }
//