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

// import { Suspense, lazy, useCallback, useEffect } from 'react'
// import { BattleTransition } from '../BattleTransition/BattleTransition'
// import { DialogueBox } from '../DialogueBox/DialogueBox'
// import { ExplorationControls } from '../ExplorationControls/ExplorationControls'
// import { ExplorationScene, getPlayerSpriteUrl } from '../ExplorationScene/ExplorationScene'
// import { getNpc } from '../../game/npc/npcs'
// import { resolveStartNode, getDialogue } from '../../game/dialogue/dialogues'
// import {
//   advanceDialogue,
//   chooseDialogue,
//   getCurrentNode,
//   getVisibleChoices,
//   startDialogue,
// } from '../../game/dialogue/engine'
// import { useExploration } from '../../hooks/useExploration'
// import { useGameFlow } from '../../hooks/useGameFlow'
// import { toLegacyBattleResult } from '../../game/realtimeBattle/BattleResultAdapter'
// import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
// import type { Player } from '../../types/player'
// import { useMemo, useState } from 'react'
// import type { DialogueSession } from '../../game/dialogue/types'
// import type { DialogueAction } from '../../game/dialogue/types'
// 
// interface GameExplorationSessionProps {
//   player: Player
//   /** คืน true เมื่อบันทึกลงที่เก็บข้อมูลจริง — false แปลว่าหน้าจอถูกย้อนกลับแล้ว */
//   onPlayerChange: (next: Player) => Promise<boolean>
//   onExit: () => void
// }
// 
// /*
//   โหลดห้องต่อสู้แบบ lazy — เหตุผลเดียวกับที่ LobbyPage ทำกับ LobbyScene
// 
//   ห้องต่อสู้ใหม่ใช้ three.js/R3F ถ้า import ตรง ๆ ตั้งแต่ต้น three จะถูกรวมเข้า chunk หลัก
//   ทำให้ bundle แรกที่ผู้เล่นต้องโหลดตอนเปิดเกมโตจาก ~318 kB เป็น ~1.2 MB
//   (วัดจริงตอนทำงานนี้) ทั้งที่ยังไม่ได้เข้าห้องต่อสู้เลย
// */
// const BattleScene = lazy(() =>
//   import('../BattleScene/BattleScene').then((m) => ({ default: m.BattleScene })),
// )
// 
// /**
//  * ชั้นห้องต่อสู้
//  *
//  * เดิมชั้นนี้ต้องรู้จักกลไกของระบบเทิร์นทั้งหมด (เรียก useBattle เอง แล้วส่งต่อ 11 props
//  * ทั้ง snapshot / activeUnit / การเลือกเป้าหมาย) ตอนนี้เหลือหน้าที่เดียวคือส่ง 4 ค่าที่เป็น
//  * contract จริงเข้าไป — สถานะการต่อสู้ทั้งหมดอยู่ใน runtime ของห้องเอง
//  */
// function BattleLayer({
//   player,
//   stageId,
//   onComplete,
//   onExit,
// }: {
//   player: Player
//   stageId: string
//   onComplete: (result: RealtimeBattleResult) => void
//   onExit: () => void
// }) {
//   return (
//     <Suspense fallback={null}>
//       <BattleScene player={player} stageId={stageId} onComplete={onComplete} onExit={onExit} />
//     </Suspense>
//   )
// }
// 
// export function GameExplorationSession({
//   player,
//   onPlayerChange,
//   onExit,
// }: GameExplorationSessionProps) {
//   const gameFlow = useGameFlow({ player, onPlayerChange, onExit })
//   const mapId = gameFlow.flow.mapId ?? 'village-01'
//   const movementLocked = gameFlow.flow.mode !== 'exploration'
// 
//   const { map, npcs, state, pressDirection, releaseDirection } = useExploration({
//     mapId,
//     initialPosition: gameFlow.flow.explorationPosition ?? undefined,
//     movementLocked,
//   })
// 
//   const [dialogueSession, setDialogueSession] = useState<DialogueSession | null>(null)
// 
//   useEffect(() => {
//     gameFlow.startExploration(mapId)
//   }, [gameFlow.startExploration, mapId])
// 
//   useEffect(() => {
//     if (gameFlow.flow.mode === 'dialogue' && gameFlow.flow.dialogueNpcId) {
//       const npc = getNpc(gameFlow.flow.dialogueNpcId)
//       if (!npc) return
//       const dialogue = getDialogue(npc.dialogueId)
//       if (!dialogue) return
//       const nodeId = resolveStartNode(dialogue, player.progress.flags)
//       setDialogueSession(startDialogue(npc.dialogueId, player.progress, nodeId))
//       return
//     }
//     setDialogueSession(null)
//   }, [gameFlow.flow.dialogueNpcId, gameFlow.flow.mode, player.progress.flags])
// 
//   const currentNode = useMemo(
//     () => (dialogueSession ? getCurrentNode(dialogueSession, player.progress) : null),
//     [dialogueSession, player.progress],
//   )
// 
//   const choices = useMemo(
//     () => (dialogueSession ? getVisibleChoices(dialogueSession, player.progress) : []),
//     [dialogueSession, player.progress],
//   )
// 
//   const speaker = currentNode ? getNpc(currentNode.speakerId) : null
// 
//   const dispatchAction = useCallback(
//     (action: DialogueAction | null | undefined) => {
//       if (!action) return
//       if (action.type === 'start_battle') {
//         void gameFlow.handleDialogueAction(action, gameFlow.flow.dialogueNpcId, state.playerPosition)
//         return
//       }
//       void gameFlow.handleDialogueAction(action, gameFlow.flow.dialogueNpcId)
//     },
//     [gameFlow, state.playerPosition],
//   )
// 
//   const onAdvanceDialogue = useCallback(() => {
//     if (!dialogueSession) return
//     const result = advanceDialogue(dialogueSession, player.progress)
//     setDialogueSession(result.session)
//     dispatchAction(result.action)
//   }, [dialogueSession, dispatchAction, player.progress])
// 
//   const onChoose = useCallback(
//     (choiceId: string) => {
//       if (!dialogueSession) return
//       const result = chooseDialogue(dialogueSession, choiceId, player.progress)
//       setDialogueSession(result.session)
//       dispatchAction(result.action)
//     },
//     [dialogueSession, dispatchAction, player.progress],
//   )
// 
//   /*
//     ผลจากห้องต่อสู้เรียลไทม์ถูกแปลงเป็น contract เดิมก่อนส่งเข้า useGameFlow
// 
//     ตั้งใจไม่แก้ useGameFlow ในงานนี้ — เส้นทางบันทึกประวัติ/ธง/การกลับไปสำรวจ
//     ยังเป็นของเดิมทุกบรรทัด (สเปกข้อ 1 ห้ามรื้อระบบนอกห้องต่อสู้)
//     การย้ายไปใช้ durationMs จริงจะเกิดในงาน Reward Integration
//   */
//   const onRealtimeBattleComplete = useCallback(
//     (result: RealtimeBattleResult) => {
//       void gameFlow.onBattleComplete(toLegacyBattleResult(result))
//     },
//     [gameFlow],
//   )
// 
//   const onTalk = useCallback(() => {
//     if (!state.nearbyNpcId) return
//     gameFlow.openNpcDialogue(state.nearbyNpcId)
//   }, [gameFlow, state.nearbyNpcId])
// 
//   if (!map) return null
// 
//   return (
//     <>
//       <ExplorationScene
//         map={map}
//         state={state}
//         npcs={npcs}
//         playerSpriteUrl={getPlayerSpriteUrl(player.teamSlots)}
//         onExit={gameFlow.leaveExploration}
//       />
// 
//       <ExplorationControls
//         nearbyNpcId={state.nearbyNpcId}
//         disabled={movementLocked}
//         onPressDirection={pressDirection}
//         onReleaseDirection={releaseDirection}
//         onTalk={onTalk}
//       />
// 
//       {gameFlow.flow.mode === 'dialogue' && currentNode ? (
//         <DialogueBox
//           speaker={speaker ?? null}
//           text={currentNode.text}
//           choices={choices}
//           onAdvance={onAdvanceDialogue}
//           onChoice={onChoose}
//         />
//       ) : null}
// 
//       {gameFlow.flow.mode === 'battle_transition' && gameFlow.flow.transitionLabel ? (
//         <BattleTransition opponentName={gameFlow.flow.transitionLabel} />
//       ) : null}
// 
//       {gameFlow.flow.mode === 'battle' && gameFlow.flow.battleContext ? (
//         <BattleLayer
//           player={player}
//           stageId={gameFlow.flow.battleContext.stageId}
//           onComplete={onRealtimeBattleComplete}
//           onExit={gameFlow.onBattleExit}
//         />
//       ) : null}
//     </>
//   )
// }
//