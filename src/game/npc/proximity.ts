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

// import { hasLineOfSight } from '../exploration/collisions'
// import type { MapDefinition } from '../exploration/types'
// import type { PlayerPosition } from '../exploration/types'
// import type { NpcDefinition } from './types'
//
// export function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
//   const dx = a.x - b.x
//   const dy = a.y - b.y
//   return dx * dx + dy * dy
// }
//
// export function findNearbyNpc(
//   position: PlayerPosition,
//   npcs: NpcDefinition[],
//   map: MapDefinition,
// ): NpcDefinition | null {
//   let closest: NpcDefinition | null = null
//   let closestDistance = Number.POSITIVE_INFINITY
//
//   for (const npc of npcs) {
//     const radiusSq = npc.interactionRadius * npc.interactionRadius
//     const distSq = distanceSquared(position, npc.position)
//     if (distSq > radiusSq) continue
//     if (!hasLineOfSight(position, npc.position, map)) continue
//     if (distSq < closestDistance) {
//       closest = npc
//       closestDistance = distSq
//     }
//   }
//
//   return closest
// }
//
