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

// import { useCallback, useEffect, useState } from 'react'
// import type { BattleResult } from '../game/battle/types'
// import {
//   appendBattleHistory,
//   applyDialogueAction,
//   markNpcDefeated,
// } from '../game/dialogue/actions'
// import { nudgeAwayFrom } from '../game/exploration/movement'
// import { getMap } from '../game/exploration/maps'
// import {
//   beginBattleTransition,
//   closeDialogue,
//   enterBattle,
//   enterExploration,
//   exitToLobby,
//   openDialogue,
//   returnToExploration,
//   updateExplorationPosition,
// } from '../game/flow/GameFlowController'
// import { INITIAL_FLOW_STATE, type GameFlowState } from '../game/flow/types'
// import { getNpc } from '../game/npc/npcs'
// import type { Player } from '../types/player'
// import type { DialogueAction } from '../game/dialogue/types'
//
// interface UseGameFlowOptions {
//   player: Player
//   /** คืน true เมื่อบันทึกลงที่เก็บข้อมูลจริง — false แปลว่าหน้าจอถูกย้อนกลับแล้ว */
//   onPlayerChange: (next: Player) => Promise<boolean>
//   onExit: () => void
// }
//
// export function useGameFlow({ player, onPlayerChange, onExit }: UseGameFlowOptions) {
//   const [flow, setFlow] = useState<GameFlowState>(INITIAL_FLOW_STATE)
//
//   const startExploration = useCallback((mapId = 'village-01') => {
//     const map = getMap(mapId)
//     setFlow(enterExploration(INITIAL_FLOW_STATE, mapId, map?.spawn))
//   }, [])
//
//   const handleDialogueAction = useCallback(
//     async (
//       action: DialogueAction,
//       _npcId: string | null,
//       returnPosition?: import('../game/exploration/types').PlayerPosition,
//     ) => {
//       if (action.type === 'close_dialogue') {
//         setFlow((state) => closeDialogue(state))
//         return
//       }
//
//       if (action.type === 'set_flag') {
//         const nextPlayer = {
//           ...player,
//           progress: applyDialogueAction(player.progress, action),
//         }
//         await onPlayerChange(nextPlayer)
//         setFlow((state) => closeDialogue(state))
//         return
//       }
//
//       if (action.type === 'start_battle') {
//         const npc = action.npcId ? getNpc(action.npcId) : null
//         setFlow((state) => {
//           const withPosition = returnPosition
//             ? updateExplorationPosition(state, returnPosition)
//             : state
//           return beginBattleTransition(
//             withPosition,
//             {
//               source: 'npc',
//               stageId: action.stageId,
//               npcId: action.npcId,
//               opponentName: npc?.name,
//               returnPosition,
//             },
//             npc?.name ?? 'ศัตรู',
//           )
//         })
//       }
//     },
//     [onPlayerChange, player],
//   )
//
//   const onTransitionComplete = useCallback(() => {
//     setFlow((state) => enterBattle(state))
//   }, [])
//
//   const onBattleComplete = useCallback(
//     async (result: BattleResult) => {
//       setFlow((state) => {
//         const npcId = state.battleContext?.npcId
//         const opponent = state.battleContext?.opponentName ?? result.stageName
//
//         let progress = appendBattleHistory(player.progress, {
//           id: `battle-${Date.now()}`,
//           opponent,
//           result: result.outcome === 'victory' ? 'win' : 'lose',
//           finishedAt: result.finishedAt,
//           turns: result.turns,
//         })
//
//         if (npcId) {
//           const dialogueId = getNpc(npcId)?.dialogueId
//           if (result.outcome === 'victory') {
//             progress = markNpcDefeated(progress, npcId)
//             progress = {
//               ...progress,
//               flags: { ...progress.flags, [`trial_cleared_${result.stageId}`]: true },
//             }
//           } else if (dialogueId) {
//             progress = {
//               ...progress,
//               flags: { ...progress.flags, [`lost_to_${dialogueId}`]: true },
//             }
//           }
//         }
//
//         void onPlayerChange({ ...player, progress })
//         return { ...state, lastBattleResult: result.outcome === 'victory' ? 'win' : 'lose' }
//       })
//     },
//     [onPlayerChange, player],
//   )
//
//   const onBattleExit = useCallback(() => {
//     setFlow((state) => {
//       const npc = state.battleContext?.npcId ? getNpc(state.battleContext.npcId) : null
//       let position = state.battleContext?.returnPosition ?? state.explorationPosition
//       if (position && npc) {
//         position = nudgeAwayFrom(position, npc.position, npc.interactionRadius + 24)
//       }
//       return returnToExploration(state, position ?? undefined)
//     })
//   }, [])
//
//   const openNpcDialogue = useCallback((npcId: string) => {
//     setFlow((state) => openDialogue(state, npcId))
//   }, [])
//
//   const closeNpcDialogue = useCallback(() => {
//     setFlow((state) => closeDialogue(state))
//   }, [])
//
//   const syncPosition = useCallback((position: import('../game/exploration/types').PlayerPosition) => {
//     setFlow((state) => updateExplorationPosition(state, position))
//   }, [])
//
//   const leaveExploration = useCallback(() => {
//     setFlow(exitToLobby(INITIAL_FLOW_STATE))
//     onExit()
//   }, [onExit])
//
//   useEffect(() => {
//     if (flow.mode !== 'battle_transition') return
//     const timer = window.setTimeout(onTransitionComplete, 1200)
//     return () => window.clearTimeout(timer)
//   }, [flow.mode, onTransitionComplete])
//
//   return {
//     flow,
//     startExploration,
//     handleDialogueAction,
//     onBattleComplete,
//     onBattleExit,
//     openNpcDialogue,
//     closeNpcDialogue,
//     leaveExploration,
//     syncPosition,
//   }
// }
//