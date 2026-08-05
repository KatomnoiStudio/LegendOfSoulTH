import type { Vec2 } from '../../game/realtimeBattle/types'
import { BattleJoystick } from './BattleJoystick'
import styles from './BattleScene.module.css'

/**
 * ชั้นปุ่มควบคุมบนจอ — จอยซ้าย ปุ่มขวา (§12)
 *
 * ปุ่มโจมตี / สกิล / dash / ยาจะเข้ามาในงานถัดไป ตอนนี้มีแค่จอยเดินซึ่งเป็นสิ่งเดียว
 * ที่มีระบบรองรับจริงแล้ว — ใส่ปุ่มที่กดแล้วไม่เกิดอะไรขึ้นไว้ก่อนคือการหลอกผู้เล่น
 *
 * ทั้งชั้นเป็น pointer-events: none ยกเว้นตัวควบคุมเอง เพื่อไม่ให้บังการมองฉาก
 */
export function BattleControls({ onMove }: { onMove: (vector: Vec2) => void }) {
  return (
    <div className={styles.controls}>
      <div className={styles.controlsLeft}>
        <BattleJoystick onChange={onMove} />
      </div>
    </div>
  )
}
