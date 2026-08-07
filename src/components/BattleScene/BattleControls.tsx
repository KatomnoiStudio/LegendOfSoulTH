import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { SkillSlot } from '../../game/realtimeBattle/skills'
import type { Vec2 } from '../../game/realtimeBattle/types'
import { AttackButton } from './AttackButton'
import { BattleJoystick } from './BattleJoystick'
import { SkillBar } from './SkillBar'
import styles from './BattleScene.module.css'

/**
 * ชั้นปุ่มควบคุมบนจอ — จอยซ้าย ปุ่มขวา (Blueprint v3 P3)
 *
 * ขวา: Basic Attack + สกิล 1/2/3 + Ultimate — ไม่มีปุ่ม dash
 */
export function BattleControls({
  runtime,
  onMove,
  onAttack,
  onSkill,
}: {
  runtime: RealtimeBattleRuntime
  onMove: (vector: Vec2) => void
  onAttack: () => void
  onSkill: (slot: SkillSlot) => void
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.controlsLeft}>
        <BattleJoystick onChange={onMove} />
      </div>
      <div className={styles.controlsRight}>
        <SkillBar runtime={runtime} onPress={onSkill} />
        <AttackButton onPress={onAttack} />
      </div>
    </div>
  )
}
