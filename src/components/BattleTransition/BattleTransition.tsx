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

// import { LoadingScreen } from '../LoadingScreen/LoadingScreen'
// import styles from './BattleTransition.module.css'
//
// interface BattleTransitionProps {
//   opponentName: string
// }
//
// /**
//  * การ์ด VS ก่อนเข้าสู้ — ใช้ LoadingScreen เป็นกรอบ/พื้นหลังร่วม (background="overlay" เพราะ
//  * ซ้อนทับฉากที่ยังแสดงอยู่จริงด้านหลัง ไม่ใช่แทนที่อะไรที่ยังไม่มี) แต่เนื้อหายังเป็นการ์ด VS
//  * ของตัวเองเสมอ ไม่ใช่ลาย 魂 เริ่มต้น — จังหวะ 1200ms ที่ useGameFlow.ts คุมอยู่แล้วไม่แตะ
//  */
// export function BattleTransition({ opponentName }: BattleTransitionProps) {
//   return (
//     <LoadingScreen background="overlay">
//       <div className={styles.card} aria-live="assertive">
//         <div className={styles.vs}>VS</div>
//         <p className={styles.label}>{opponentName}</p>
//       </div>
//     </LoadingScreen>
//   )
// }
//
