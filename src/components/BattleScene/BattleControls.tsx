import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { Vec2 } from '../../game/realtimeBattle/types'
import { AttackButton } from './AttackButton'
import { BattleJoystick } from './BattleJoystick'
import { DashButton } from './DashButton'
import styles from './BattleScene.module.css'

/**
 * ชั้นปุ่มควบคุมบนจอ — จอยซ้าย ปุ่มขวา (§12)
 *
 * ปุ่มสกิลและยาจะเข้ามาในงานถัดไปพร้อมระบบที่รองรับจริง —
 * ใส่ปุ่มที่กดแล้วไม่เกิดอะไรขึ้นไว้ก่อนคือการหลอกผู้เล่น
 *
 * ทั้งชั้นเป็น pointer-events: none ยกเว้นตัวควบคุมเอง เพื่อไม่ให้บังการมองฉาก
 */
export function BattleControls({
  runtime,
  onMove,
  onAttack,
  onDash,
}: {
  runtime: RealtimeBattleRuntime
  onMove: (vector: Vec2) => void
  onAttack: () => void
  onDash: () => void
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.controlsLeft}>
        <BattleJoystick onChange={onMove} />
      </div>
      <div className={styles.controlsRight}>
        <DashButton runtime={runtime} onPress={onDash} />
        <AttackButton onPress={onAttack} />
      </div>
    </div>
  )
}
