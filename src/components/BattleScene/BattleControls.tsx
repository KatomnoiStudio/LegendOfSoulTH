import type { Vec2 } from '../../game/realtimeBattle/types'
import { AttackButton } from './AttackButton'
import { BattleJoystick } from './BattleJoystick'
import styles from './BattleScene.module.css'

/**
 * ชั้นปุ่มควบคุมบนจอ — จอยซ้าย ปุ่มขวา (§12)
 *
 * ปุ่มสกิล / dash / ยา จะเข้ามาในงานถัดไปพร้อมระบบที่รองรับจริง —
 * ใส่ปุ่มที่กดแล้วไม่เกิดอะไรขึ้นไว้ก่อนคือการหลอกผู้เล่น
 *
 * ทั้งชั้นเป็น pointer-events: none ยกเว้นตัวควบคุมเอง เพื่อไม่ให้บังการมองฉาก
 */
export function BattleControls({
  onMove,
  onAttack,
}: {
  onMove: (vector: Vec2) => void
  onAttack: () => void
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.controlsLeft}>
        <BattleJoystick onChange={onMove} />
      </div>
      <div className={styles.controlsRight}>
        <AttackButton onPress={onAttack} />
      </div>
    </div>
  )
}
