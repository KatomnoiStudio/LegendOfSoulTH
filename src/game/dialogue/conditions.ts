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

// import type { PlayerProgress } from '../../types/player'
//
// export function hasFlag(progress: PlayerProgress, key: string): boolean {
//   return Boolean(progress.flags[key])
// }
//
// export function isNpcDefeated(progress: PlayerProgress, npcId: string): boolean {
//   return progress.defeatedNpcIds.includes(npcId)
// }
//
// export function canShowNode(
//   progress: PlayerProgress,
//   node: { requiresFlag?: string; hideIfFlag?: string },
// ): boolean {
//   if (node.hideIfFlag && hasFlag(progress, node.hideIfFlag)) return false
//   if (!node.requiresFlag) return true
//   return hasFlag(progress, node.requiresFlag)
// }
//
// export function canShowChoice(
//   progress: PlayerProgress,
//   choice: { requiresFlag?: string; hideIfFlag?: string },
// ): boolean {
//   if (choice.hideIfFlag && hasFlag(progress, choice.hideIfFlag)) return false
//   if (choice.requiresFlag && !hasFlag(progress, choice.requiresFlag)) return false
//   return true
// }
//