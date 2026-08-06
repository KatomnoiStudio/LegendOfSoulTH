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

// import { describe, expect, test } from 'vitest'
// import { advanceDialogue, chooseDialogue, getCurrentNode, getVisibleChoices, startDialogue } from './engine'
// import { EMPTY_PROGRESS, type PlayerProgress } from '../../types/player'
//
// describe('startDialogue', () => {
//   test('returns null for an unknown dialogue id', () => {
//     expect(startDialogue('does-not-exist', EMPTY_PROGRESS)).toBeNull()
//   })
//
//   test('starts at the dialogue\'s own startNodeId by default', () => {
//     const session = startDialogue('shadow-guard', EMPTY_PROGRESS)
//     expect(session).toEqual({ dialogueId: 'shadow-guard', nodeId: 'intro' })
//   })
//
//   test('honors an explicit startNodeId override', () => {
//     const session = startDialogue('shadow-guard', EMPTY_PROGRESS, 'retry')
//     expect(session?.nodeId).toBe('retry')
//   })
// })
//
// describe('getCurrentNode / getVisibleChoices', () => {
//   test('returns the intro node with both choices visible when nothing is gated', () => {
//     const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
//     const node = getCurrentNode(session, EMPTY_PROGRESS)
//     expect(node?.id).toBe('intro')
//     const choices = getVisibleChoices(session, EMPTY_PROGRESS)
//     expect(choices.map((c) => c.id)).toEqual(['fight', 'leave'])
//   })
//
//   test('returns null for a node hidden by requiresFlag not being set', () => {
//     const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
//     expect(getCurrentNode(session, EMPTY_PROGRESS)).toBeNull()
//   })
//
//   test('returns the node once its requiresFlag is set', () => {
//     const progress: PlayerProgress = { ...EMPTY_PROGRESS, flags: { 'defeated_shadow-guard': true } }
//     const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
//     expect(getCurrentNode(session, progress)?.id).toBe('defeated')
//   })
// })
//
// describe('advanceDialogue', () => {
//   test('closes the dialogue when the current node has neither nextNodeId nor action', () => {
//     // 'defeated' มี action ติดตัวอยู่แล้ว ทดสอบ path นั้นแทน — ครอบ action-node กรณีปกติ
//     const progress: PlayerProgress = { ...EMPTY_PROGRESS, flags: { 'defeated_shadow-guard': true } }
//     const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
//     const result = advanceDialogue(session, progress)
//     expect(result.session).toBeNull()
//     expect(result.action).toEqual({ type: 'close_dialogue' })
//   })
//
//   test('returns a null session with no action when the node is gated away entirely', () => {
//     const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
//     const result = advanceDialogue(session, EMPTY_PROGRESS)
//     expect(result).toEqual({ session: null })
//   })
// })
//
// describe('chooseDialogue', () => {
//   test('an unknown choiceId leaves the session untouched', () => {
//     const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
//     const result = chooseDialogue(session, 'does-not-exist', EMPTY_PROGRESS)
//     expect(result).toEqual({ session })
//   })
//
//   test('choosing "fight" closes the session and returns a start_battle action', () => {
//     const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
//     const result = chooseDialogue(session, 'fight', EMPTY_PROGRESS)
//     expect(result.session).toBeNull()
//     expect(result.action).toEqual({ type: 'start_battle', stageId: 'trial-01', npcId: 'npc-shadow-guard' })
//   })
//
//   test('choosing "leave" closes the session with close_dialogue', () => {
//     const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
//     const result = chooseDialogue(session, 'leave', EMPTY_PROGRESS)
//     expect(result.session).toBeNull()
//     expect(result.action).toEqual({ type: 'close_dialogue' })
//   })
//
//   test('a gated-away choice cannot be selected even by id', () => {
//     // 'retry' node ต้องมี lost_to flag ก่อนถึงจะโผล่ — ทดสอบว่า choice ของมันเลือกไม่ได้ถ้ายังไม่ผ่าน node gate
//     const session = { dialogueId: 'shadow-guard', nodeId: 'retry' }
//     const result = chooseDialogue(session, 'fight-again', EMPTY_PROGRESS)
//     expect(result).toEqual({ session })
//   })
// })
//