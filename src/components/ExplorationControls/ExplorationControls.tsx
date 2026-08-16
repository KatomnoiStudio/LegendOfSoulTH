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

// import { useCallback } from 'react'
// import type { Direction } from '../../game/exploration/types'
// import { getNpc } from '../../game/npc/npcs'
// import styles from './ExplorationControls.module.css'
//
// interface ExplorationControlsProps {
//   nearbyNpcId: string | null
//   disabled: boolean
//   onPressDirection: (direction: Direction) => void
//   onReleaseDirection: (direction: Direction) => void
//   onTalk: () => void
// }
//
// export function ExplorationControls({
//   nearbyNpcId,
//   disabled,
//   onPressDirection,
//   onReleaseDirection,
//   onTalk,
// }: ExplorationControlsProps) {
//   // ask-CB retroactive audit (2026-08-06): เดิม onPointerUp/Cancel ส่งเวกเตอร์ศูนย์ตรง ๆ
//   // ทับค่าที่ปุ่มอื่นตั้งไว้เสมอ — กด ▲ ค้างแล้วกด ▶ ตาม ปล่อย ▶ = หยุดสนิททั้งที่ ▲ ยังกดอยู่
//   // เปลี่ยนเป็นแจ้ง "ปล่อยทิศนี้" แทน แล้วให้ useExploration รวมชุดทิศที่เหลือเอง (เหมือน
//   // InputSystem.ts ของห้องต่อสู้)
//   const bind = useCallback(
//     (direction: Direction) => ({
//       onPointerDown: (event: React.PointerEvent) => {
//         event.preventDefault()
//         event.currentTarget.setPointerCapture(event.pointerId)
//         onPressDirection(direction)
//       },
//       onPointerUp: (event: React.PointerEvent) => {
//         event.preventDefault()
//         onReleaseDirection(direction)
//       },
//       onPointerCancel: () => onReleaseDirection(direction),
//     }),
//     [onPressDirection, onReleaseDirection],
//   )
//
//   const npc = nearbyNpcId ? getNpc(nearbyNpcId) : null
//
//   return (
//     <div className={styles.controls}>
//       <div className={styles.dpad}>
//         <span />
//         <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('up')}>▲</button>
//         <span />
//         <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('left')}>◀</button>
//         <span />
//         <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('right')}>▶</button>
//         <span />
//         <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('down')}>▼</button>
//         <span />
//       </div>
//
//       {npc ? (
//         <button type="button" className={styles.talkBtn} disabled={disabled} onClick={onTalk}>
//           คุย
//           <span className={styles.talkLabel}>{npc.name}</span>
//         </button>
//       ) : null}
//     </div>
//   )
// }
//
