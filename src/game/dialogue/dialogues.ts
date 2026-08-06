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

// import type { DialogueDefinition } from './types'
//
// export const DIALOGUES: Record<string, DialogueDefinition> = {
//   'shadow-guard': {
//     id: 'shadow-guard',
//     startNodeId: 'intro',
//     nodes: {
//       intro: {
//         id: 'intro',
//         speakerId: 'npc-shadow-guard',
//         text: 'เจ้าคิดว่าจะผ่านที่นี่ไปได้ง่าย ๆ หรือ?',
//         choices: [
//           {
//             id: 'fight',
//             label: 'ต่อสู้',
//             action: { type: 'start_battle', stageId: 'trial-01', npcId: 'npc-shadow-guard' },
//           },
//           {
//             id: 'leave',
//             label: 'ยังไม่พร้อม',
//             action: { type: 'close_dialogue' },
//           },
//         ],
//       },
//       defeated: {
//         id: 'defeated',
//         speakerId: 'npc-shadow-guard',
//         text: 'เจ้าฝีมือไม่เลว... ผ่านไปได้',
//         action: { type: 'close_dialogue' },
//         requiresFlag: 'defeated_shadow-guard',
//       },
//       retry: {
//         id: 'retry',
//         speakerId: 'npc-shadow-guard',
//         text: 'กลับไปฝึกมาใหม่ แล้วค่อยมาท้าอีกครั้ง',
//         choices: [
//           {
//             id: 'fight-again',
//             label: 'ต่อสู้',
//             action: { type: 'start_battle', stageId: 'trial-01', npcId: 'npc-shadow-guard' },
//           },
//           {
//             id: 'leave-again',
//             label: 'ยังไม่พร้อม',
//             action: { type: 'close_dialogue' },
//           },
//         ],
//         requiresFlag: 'lost_to_shadow-guard',
//         hideIfFlag: 'defeated_shadow-guard',
//       },
//     },
//   },
//   'shadow-captain': {
//     id: 'shadow-captain',
//     startNodeId: 'intro',
//     nodes: {
//       intro: {
//         id: 'intro',
//         speakerId: 'npc-shadow-captain',
//         text: 'ถ้าอยากผ่าน ต้องเอาชนะข้าให้ได้',
//         choices: [
//           {
//             id: 'fight',
//             label: 'ต่อสู้',
//             action: { type: 'start_battle', stageId: 'trial-02', npcId: 'npc-shadow-captain' },
//           },
//           {
//             id: 'leave',
//             label: 'ยังไม่พร้อม',
//             action: { type: 'close_dialogue' },
//           },
//         ],
//       },
//       defeated: {
//         id: 'defeated',
//         speakerId: 'npc-shadow-captain',
//         text: 'เจ้าผ่านด่านนี้ได้แล้ว... จงไปต่อ',
//         action: { type: 'close_dialogue' },
//         requiresFlag: 'defeated_shadow-captain',
//       },
//     },
//   },
// }
//
// export function getDialogue(id: string): DialogueDefinition | undefined {
//   return DIALOGUES[id]
// }
//
// export function resolveStartNode(dialogue: DialogueDefinition, flags: Record<string, boolean>): string {
//   if (flags[`defeated_${dialogue.id}`]) {
//     const defeated = dialogue.nodes.defeated
//     if (defeated) return defeated.id
//   }
//   if (flags[`lost_to_${dialogue.id}`] && dialogue.nodes.retry) {
//     return dialogue.nodes.retry.id
//   }
//   return dialogue.startNodeId
// }
//