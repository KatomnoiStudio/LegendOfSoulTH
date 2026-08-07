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

// import { useCallback, useMemo, useState } from 'react'
// import { applyDialogueAction } from '../game/dialogue/actions'
// import {
//   advanceDialogue,
//   chooseDialogue,
//   getCurrentNode,
//   getVisibleChoices,
//   startDialogue,
// } from '../game/dialogue/engine'
// import { resolveStartNode, getDialogue } from '../game/dialogue/dialogues'
// import type { DialogueAction, DialogueSession } from '../game/dialogue/types'
// import { getNpc } from '../game/npc/npcs'
// import type { PlayerProgress } from '../types/player'
//
// export function useDialogue(progress: PlayerProgress) {
//   const [session, setSession] = useState<DialogueSession | null>(null)
//
//   const openDialogue = useCallback((dialogueId: string) => {
//     const dialogue = getDialogue(dialogueId)
//     if (!dialogue) return
//     const nodeId = resolveStartNode(dialogue, progress.flags)
//     setSession(startDialogue(dialogueId, progress, nodeId))
//   }, [progress.flags])
//
//   const closeDialogue = useCallback(() => setSession(null), [])
//
//   const currentNode = useMemo(
//     () => (session ? getCurrentNode(session, progress) : null),
//     [session, progress],
//   )
//
//   const choices = useMemo(
//     () => (session ? getVisibleChoices(session, progress) : []),
//     [session, progress],
//   )
//
//   const speaker = currentNode ? getNpc(currentNode.speakerId) : null
//
//   const handleAdvance = useCallback((): DialogueAction | null => {
//     if (!session) return null
//     const result = advanceDialogue(session, progress)
//     setSession(result.session)
//     return result.action ?? null
//   }, [session, progress])
//
//   const handleChoice = useCallback((choiceId: string): DialogueAction | null => {
//     if (!session) return null
//     const result = chooseDialogue(session, choiceId, progress)
//     setSession(result.session)
//     return result.action ?? null
//   }, [session, progress])
//
//   return {
//     session,
//     currentNode,
//     choices,
//     speaker,
//     openDialogue,
//     closeDialogue,
//     handleAdvance,
//     handleChoice,
//     applyActionLocally: applyDialogueAction,
//   }
// }
//