import { LoadingScreen } from '../LoadingScreen/LoadingScreen'
import styles from './BattleTransition.module.css'

interface BattleTransitionProps {
  opponentName: string
}

/**
 * การ์ด VS ก่อนเข้าสู้ — ใช้ LoadingScreen เป็นกรอบ/พื้นหลังร่วม (background="overlay" เพราะ
 * ซ้อนทับฉากที่ยังแสดงอยู่จริงด้านหลัง ไม่ใช่แทนที่อะไรที่ยังไม่มี) แต่เนื้อหายังเป็นการ์ด VS
 * ของตัวเองเสมอ ไม่ใช่ลาย 魂 เริ่มต้น — จังหวะ 1200ms ที่ useGameFlow.ts คุมอยู่แล้วไม่แตะ
 */
export function BattleTransition({ opponentName }: BattleTransitionProps) {
  return (
    <LoadingScreen background="overlay">
      <div className={styles.card} aria-live="assertive">
        <div className={styles.vs}>VS</div>
        <p className={styles.label}>{opponentName}</p>
      </div>
    </LoadingScreen>
  )
}
