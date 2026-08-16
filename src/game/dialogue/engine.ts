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

// import { canShowChoice, canShowNode } from './conditions'
// import { getDialogue } from './dialogues'
// import type { DialogueAction, DialogueChoice, DialogueNode, DialogueSession } from './types'
// import type { PlayerProgress } from '../../types/player'
//
// export function startDialogue(
//   dialogueId: string,
//   _progress: PlayerProgress,
//   startNodeId?: string,
// ): DialogueSession | null {
//   const dialogue = getDialogue(dialogueId)
//   if (!dialogue) return null
//   const nodeId = startNodeId ?? dialogue.startNodeId
//   return { dialogueId, nodeId }
// }
//
// export function getCurrentNode(
//   session: DialogueSession,
//   progress: PlayerProgress,
// ): DialogueNode | null {
//   const dialogue = getDialogue(session.dialogueId)
//   if (!dialogue) return null
//   const node = dialogue.nodes[session.nodeId]
//   if (!node || !canShowNode(progress, node)) return null
//   return node
// }
//
// export function getVisibleChoices(
//   session: DialogueSession,
//   progress: PlayerProgress,
// ): DialogueChoice[] {
//   const node = getCurrentNode(session, progress)
//   if (!node?.choices) return []
//   return node.choices.filter((choice) => canShowChoice(progress, choice))
// }
//
// export function advanceDialogue(
//   session: DialogueSession,
//   progress: PlayerProgress,
// ): { session: DialogueSession | null; action?: DialogueAction } {
//   const node = getCurrentNode(session, progress)
//   if (!node) return { session: null }
//
//   if (node.nextNodeId) {
//     return { session: { ...session, nodeId: node.nextNodeId } }
//   }
//
//   if (node.action) {
//     return { session: null, action: node.action }
//   }
//
//   return { session: null, action: { type: 'close_dialogue' } }
// }
//
// export function chooseDialogue(
//   session: DialogueSession,
//   choiceId: string,
//   progress: PlayerProgress,
// ): { session: DialogueSession | null; action?: DialogueAction } {
//   const choices = getVisibleChoices(session, progress)
//   const choice = choices.find((entry) => entry.id === choiceId)
//   if (!choice) return { session }
//
//   if (choice.nextNodeId) {
//     return { session: { ...session, nodeId: choice.nextNodeId }, action: choice.action }
//   }
//
//   return { session: null, action: choice.action ?? { type: 'close_dialogue' } }
// }
//
