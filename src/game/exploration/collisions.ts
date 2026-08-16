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

// import type { MapDefinition, PlayerPosition, Rect } from './types'
//
// const PLAYER_RADIUS = 18
//
// function rectsOverlap(a: Rect, b: Rect): boolean {
//   return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
// }
//
// function playerRect(position: PlayerPosition): Rect {
//   return {
//     x: position.x - PLAYER_RADIUS,
//     y: position.y - PLAYER_RADIUS,
//     width: PLAYER_RADIUS * 2,
//     height: PLAYER_RADIUS * 2,
//   }
// }
//
// function insideBounds(position: PlayerPosition, bounds: Rect): boolean {
//   const rect = playerRect(position)
//   return (
//     rect.x >= bounds.x
//     && rect.y >= bounds.y
//     && rect.x + rect.width <= bounds.x + bounds.width
//     && rect.y + rect.height <= bounds.y + bounds.height
//   )
// }
//
// export function isWalkable(
//   position: PlayerPosition,
//   map: MapDefinition,
//   extraObstacles: Rect[] = [],
// ): boolean {
//   if (!insideBounds(position, map.walkBounds)) return false
//
//   const rect = playerRect(position)
//   const obstacles = [...map.obstacles, ...extraObstacles]
//   return !obstacles.some((obstacle) => rectsOverlap(rect, obstacle))
// }
//
// export function clampToWalkable(
//   position: PlayerPosition,
//   map: MapDefinition,
//   extraObstacles: Rect[] = [],
// ): PlayerPosition {
//   if (isWalkable(position, map, extraObstacles)) return position
//
//   const candidates: PlayerPosition[] = [
//     position,
//     { ...position, x: position.x - 4 },
//     { ...position, x: position.x + 4 },
//     { ...position, y: position.y - 4 },
//     { ...position, y: position.y + 4 },
//   ]
//
//   return candidates.find((candidate) => isWalkable(candidate, map, extraObstacles)) ?? position
// }
//
// export function npcObstacle(npc: { position: { x: number; y: number }; interactionRadius: number }): Rect {
//   const size = npc.interactionRadius * 1.2
//   return {
//     x: npc.position.x - size / 2,
//     y: npc.position.y - size / 2,
//     width: size,
//     height: size,
//   }
// }
//
// export function hasLineOfSight(
//   from: PlayerPosition,
//   to: { x: number; y: number },
//   map: MapDefinition,
// ): boolean {
//   const steps = 8
//   for (let index = 1; index <= steps; index += 1) {
//     const t = index / steps
//     const probe: PlayerPosition = {
//       x: from.x + (to.x - from.x) * t,
//       y: from.y + (to.y - from.y) * t,
//       direction: from.direction,
//     }
//     if (!isWalkable(probe, map)) return false
//   }
//   return true
// }
//
