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

// import { MONKEY_SPRITE_URL, PIGSY_SPRITE_URL } from '../characters'
// import type { NpcDefinition } from './types'
//
// export const NPCS: NpcDefinition[] = [
//   {
//     id: 'npc-shadow-guard',
//     name: 'ทหารเงา',
//     spriteUrl: MONKEY_SPRITE_URL,
//     mapId: 'village-01',
//     /*
//       เดิมอยู่ที่ (620, 360) ซึ่งอยู่ "ข้างใน" สิ่งกีดขวางของแผนที่
//       (480,280 ขนาด 240x120 = ครอบ x 480–720, y 280–400 ดู src/game/exploration/maps.ts)
//
//       ผลคือคุยกับ NPC ตัวนี้ไม่ได้เลย: findNearbyNpc เรียก hasLineOfSight ซึ่งไล่ probe
//       เป็นจุด ๆ จากผู้เล่นไปหา NPC แล้วเช็ค isWalkable ทุกจุด — จุดปลายทางอยู่ในสิ่งกีดขวาง
//       จึงคืน false เสมอ ปุ่ม "คุย" เลยไม่เคยขึ้น และด่าน trial-01 เข้าไม่ได้ทั้งเกม
//
//       ย้ายลงมาที่ y = 448 ซึ่งพ้นขอบล่างของสิ่งกีดขวาง (400) แล้ว ยังยืนอยู่หน้าวิหาร
//       เหมือนเดิม และผู้เล่นเดินเข้าถึงได้จริง (ระยะเข้าใกล้สุด ~61 < interactionRadius 72)
//     */
//     position: { x: 620, y: 448 },
//     dialogueId: 'shadow-guard',
//     interactionRadius: 72,
//     battleStageId: 'trial-01',
//   },
//   {
//     id: 'npc-shadow-captain',
//     name: 'หัวหน้าทหารเงา',
//     spriteUrl: PIGSY_SPRITE_URL,
//     mapId: 'village-01',
//     position: { x: 920, y: 300 },
//     dialogueId: 'shadow-captain',
//     interactionRadius: 80,
//     battleStageId: 'trial-02',
//   },
// ]
//
// export function getNpc(id: string): NpcDefinition | undefined {
//   return NPCS.find((npc) => npc.id === id)
// }
//
// export function getNpcsForMap(mapId: string): NpcDefinition[] {
//   return NPCS.filter((npc) => npc.mapId === mapId)
// }
//
