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
// import { canShowChoice, canShowNode, hasFlag, isNpcDefeated } from './conditions'
// import { EMPTY_PROGRESS, type PlayerProgress } from '../../types/player'
//
// function withFlags(...keys: string[]): PlayerProgress {
//   return { ...EMPTY_PROGRESS, flags: Object.fromEntries(keys.map((key) => [key, true])) }
// }
//
// describe('hasFlag', () => {
//   test('false when the flag was never set', () => {
//     expect(hasFlag(EMPTY_PROGRESS, 'met-npc')).toBe(false)
//   })
//
//   test('true only for a flag explicitly set truthy', () => {
//     expect(hasFlag(withFlags('met-npc'), 'met-npc')).toBe(true)
//     expect(hasFlag(withFlags('met-npc'), 'other-flag')).toBe(false)
//   })
// })
//
// describe('isNpcDefeated', () => {
//   test('checks membership in defeatedNpcIds', () => {
//     const progress = { ...EMPTY_PROGRESS, defeatedNpcIds: ['demon-captain'] }
//     expect(isNpcDefeated(progress, 'demon-captain')).toBe(true)
//     expect(isNpcDefeated(progress, 'shadow-soldier')).toBe(false)
//   })
// })
//
// describe('canShowNode', () => {
//   test('shows a node with no gate at all', () => {
//     expect(canShowNode(EMPTY_PROGRESS, {})).toBe(true)
//   })
//
//   test('requiresFlag hides the node until the flag is set', () => {
//     const node = { requiresFlag: 'act-2-started' }
//     expect(canShowNode(EMPTY_PROGRESS, node)).toBe(false)
//     expect(canShowNode(withFlags('act-2-started'), node)).toBe(true)
//   })
//
//   test('hideIfFlag hides the node once the flag is set, regardless of requiresFlag', () => {
//     const node = { hideIfFlag: 'quest-done' }
//     expect(canShowNode(EMPTY_PROGRESS, node)).toBe(true)
//     expect(canShowNode(withFlags('quest-done'), node)).toBe(false)
//   })
//
//   test('hideIfFlag wins over requiresFlag when both flags are set', () => {
//     const node = { requiresFlag: 'act-2-started', hideIfFlag: 'quest-done' }
//     expect(canShowNode(withFlags('act-2-started', 'quest-done'), node)).toBe(false)
//   })
// })
//
// describe('canShowChoice', () => {
//   test('same gating rules as canShowNode', () => {
//     const choice = { requiresFlag: 'has-item' }
//     expect(canShowChoice(EMPTY_PROGRESS, choice)).toBe(false)
//     expect(canShowChoice(withFlags('has-item'), choice)).toBe(true)
//   })
// })
//