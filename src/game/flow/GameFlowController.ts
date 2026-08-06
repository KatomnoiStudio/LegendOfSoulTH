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

// import type { BattleResult } from '../battle/types'
// import type { PlayerPosition } from '../exploration/types'
// import { INITIAL_FLOW_STATE, type BattleContext, type GameFlowState, type GameMode } from './types'
//
// export function enterExploration(
//   state: GameFlowState,
//   mapId: string,
//   position?: PlayerPosition,
// ): GameFlowState {
//   return {
//     ...state,
//     mode: 'exploration',
//     mapId,
//     explorationPosition: position ?? state.explorationPosition,
//     dialogueNpcId: null,
//     battleContext: null,
//     transitionLabel: null,
//     lastBattleResult: null,
//   }
// }
//
// export function updateExplorationPosition(
//   state: GameFlowState,
//   position: PlayerPosition,
// ): GameFlowState {
//   return { ...state, explorationPosition: position }
// }
//
// export function openDialogue(state: GameFlowState, npcId: string): GameFlowState {
//   if (state.mode !== 'exploration') return state
//   return { ...state, mode: 'dialogue', dialogueNpcId: npcId }
// }
//
// export function closeDialogue(state: GameFlowState): GameFlowState {
//   return { ...state, mode: 'exploration', dialogueNpcId: null }
// }
//
// export function beginBattleTransition(
//   state: GameFlowState,
//   context: BattleContext,
//   label: string,
// ): GameFlowState {
//   return {
//     ...state,
//     mode: 'battle_transition',
//     battleContext: {
//       ...context,
//       returnMapId: context.returnMapId ?? state.mapId ?? undefined,
//       returnPosition: context.returnPosition ?? state.explorationPosition ?? undefined,
//     },
//     transitionLabel: label,
//     dialogueNpcId: null,
//   }
// }
//
// export function enterBattle(state: GameFlowState): GameFlowState {
//   if (!state.battleContext) return state
//   return { ...state, mode: 'battle', transitionLabel: null }
// }
//
// export function finishBattle(
//   state: GameFlowState,
//   result: BattleResult,
// ): GameFlowState {
//   return {
//     ...state,
//     mode: 'battle_result',
//     lastBattleResult: result.outcome === 'victory' ? 'win' : 'lose',
//   }
// }
//
// export function returnToExploration(
//   state: GameFlowState,
//   position?: PlayerPosition,
// ): GameFlowState {
//   const nudged = position ?? state.battleContext?.returnPosition ?? state.explorationPosition
//   return {
//     ...state,
//     mode: 'exploration',
//     mapId: state.battleContext?.returnMapId ?? state.mapId,
//     explorationPosition: nudged,
//     battleContext: null,
//     transitionLabel: null,
//     dialogueNpcId: null,
//   }
// }
//
// export function exitToLobby(_state: GameFlowState): GameFlowState {
//   return { ...INITIAL_FLOW_STATE }
// }
//
// export function canMove(state: GameFlowState): boolean {
//   return state.mode === 'exploration'
// }
//
// export function isInputLocked(state: GameFlowState): boolean {
//   return state.mode === 'battle_transition' || state.mode === 'battle' || state.mode === 'battle_result'
// }
//
// export function getMode(state: GameFlowState): GameMode {
//   return state.mode
// }
//