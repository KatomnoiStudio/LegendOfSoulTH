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

// import { MONKEY_SPRITE_URL } from '../../game/characters'
// import type { DialogueChoice } from '../../game/dialogue/types'
// import type { NpcDefinition } from '../../game/npc/types'
// import { playSfx } from '../../lib/audio/AudioEngine'
// import styles from './DialogueBox.module.css'
//
// interface DialogueBoxProps {
//   speaker: NpcDefinition | null
//   text: string
//   choices: DialogueChoice[]
//   onAdvance: () => void
//   onChoice: (choiceId: string) => void
// }
//
// export function DialogueBox({ speaker, text, choices, onAdvance, onChoice }: DialogueBoxProps) {
//   const advance = () => {
//     void playSfx('dialogueAdvance')
//     onAdvance()
//   }
//   const choose = (choiceId: string) => {
//     void playSfx('buttonClick')
//     onChoice(choiceId)
//   }
//
//   return (
//     <div className={styles.box} role="dialog" aria-label="บทสนทนา">
//       <div className={styles.panel}>
//         <img
//           className={styles.portrait}
//           src={speaker?.spriteUrl ?? MONKEY_SPRITE_URL}
//           alt=""
//           draggable={false}
//         />
//         <div className={styles.content}>
//           <p className={styles.speaker}>{speaker?.name ?? '???'}</p>
//           <p className={styles.text} onClick={choices.length === 0 ? advance : undefined}>
//             {text}
//           </p>
//           <div className={styles.actions}>
//             {choices.length > 0 ? (
//               choices.map((choice) => (
//                 <button
//                   key={choice.id}
//                   type="button"
//                   className={styles.choiceBtn}
//                   data-fight={choice.label === 'ต่อสู้'}
//                   onClick={() => choose(choice.id)}
//                 >
//                   {choice.label}
//                 </button>
//               ))
//             ) : (
//               <button type="button" className={styles.nextBtn} onClick={advance}>
//                 ถัดไป
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
//
