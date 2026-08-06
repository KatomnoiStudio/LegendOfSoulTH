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

// import { useEffect, type CSSProperties } from 'react'
// import type { Character } from '../../game/characters'
// import { ORIGIN_LABEL, RARITY_COLOR, RARITY_LABEL } from '../../game/characters'
// import { useToast } from '../Toast/useToast'
// import styles from './CharacterPanel.module.css'
//
// /** เพดานของค่าสถานะ ใช้คำนวณความยาวแถบ */
// const STAT_MAX = 120
//
// interface CharacterPanelProps {
//   character: Character | null
//   onClose: () => void
// }
//
// /** กรอบข้อมูลตัวละครที่โผล่ขึ้นเมื่อกดโมเดลในฉาก (ข้อมูลยังเป็น placeholder) */
// export function CharacterPanel({ character, onClose }: CharacterPanelProps) {
//   const { comingSoon } = useToast()
//
//   // ปิดด้วยปุ่ม Esc เหมือน modal อื่น ๆ ในเกม — ต้องอยู่ก่อน early return
//   // เพื่อไม่ให้ hook ถูกเรียกไม่ครบทุก render (Rules of Hooks)
//   useEffect(() => {
//     if (!character) return
//     const onKeyDown = (event: KeyboardEvent) => {
//       if (event.key === 'Escape') onClose()
//     }
//     window.addEventListener('keydown', onKeyDown)
//     return () => window.removeEventListener('keydown', onKeyDown)
//   }, [character, onClose])
//
//   if (!character) return null
//
//   const rarityStyle = { '--rarity': RARITY_COLOR[character.rarity] } as CSSProperties
//
//   return (
//     <div className={styles.panel}>
//       <article className={styles.card} style={rarityStyle} key={character.id}>
//         <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
//           ×
//         </button>
//
//         <div className={styles.header}>
//           <h2 className={styles.name}>{character.name}</h2>
//           <span className={styles.rarity}>{RARITY_LABEL[character.rarity]}</span>
//         </div>
//         <p className={styles.epithet}>{character.epithet}</p>
//
//         <div className={styles.tags}>
//           <span className={styles.tag}>เลเวล {character.level}</span>
//           <span className={styles.tag}>{character.role}</span>
//           <span className={styles.tag}>ธาตุ{character.element}</span>
//           <span className={styles.tag}>{ORIGIN_LABEL[character.origin]}</span>
//         </div>
//
//         <div className={styles.stats}>
//           <Stat label="พลังโจมตี" value={character.stats.atk} />
//           <Stat label="พลังป้องกัน" value={character.stats.def} />
//           <Stat label="ความเร็ว" value={character.stats.spd} />
//         </div>
//
//         <p className={styles.lore}>{character.lore}</p>
//
//         <div className={styles.actions}>
//           <button
//             type="button"
//             className={styles.action}
//             onClick={() => comingSoon(`รายละเอียดของ${character.name}`)}
//           >
//             รายละเอียด
//           </button>
//           <button
//             type="button"
//             className={`${styles.action} ${styles.actionPrimary}`}
//             onClick={() => comingSoon(`จัดลงทัพ ${character.name}`)}
//           >
//             จัดลงทัพ
//           </button>
//         </div>
//       </article>
//     </div>
//   )
// }
//
// function Stat({ label, value }: { label: string; value: number }) {
//   return (
//     <div className={styles.stat}>
//       <span className={styles.statLabel}>{label}</span>
//       <span className={styles.statValue}>{value}</span>
//       <div className={styles.statTrack}>
//         <div
//           className={styles.statFill}
//           style={{ width: `${Math.min(100, (value / STAT_MAX) * 100)}%` }}
//         />
//       </div>
//     </div>
//   )
// }
//