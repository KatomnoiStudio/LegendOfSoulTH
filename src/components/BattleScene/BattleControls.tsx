import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { Vec2 } from '../../game/realtimeBattle/types'
import type { SkillAnimationId } from '../../game/realtimeBattle/skills'
import { AttackButton } from './AttackButton'
import { BattleJoystick } from './BattleJoystick'
import { DashButton } from './DashButton'
import { SkillButton } from './SkillButton'
import styles from './BattleScene.module.css'

/**
 * ชั้นปุ่มควบคุมบนจอ — จอยซ้าย ปุ่มขวา (§12)
 *
 * ปุ่มสกิลแสดงเฉพาะตัวละครที่มีสกิลใน registry จริง — ไม่ใส่ปุ่มว่างที่หลอกผู้เล่น
 *
 * ทั้งชั้นเป็น pointer-events: none ยกเว้นตัวควบคุมเอง เพื่อไม่ให้บังการมองฉาก
 */
export function BattleControls({
  runtime,
  onMove,
  onAttack,
  onDash,
  onSkill,
}: {
  runtime: RealtimeBattleRuntime
  onMove: (vector: Vec2) => void
  onAttack: () => void
  onDash: () => void
  onSkill: (animationId: SkillAnimationId) => void
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.controlsLeft}>
        <BattleJoystick onChange={onMove} />
      </div>
      <div className={styles.controlsRight}>
        <SkillButton runtime={runtime} animationId="skill-1" onPress={onSkill} />
        <SkillButton runtime={runtime} animationId="skill-2" onPress={onSkill} />
        <DashButton runtime={runtime} onPress={onDash} />
        <AttackButton onPress={onAttack} />
      </div>
    </div>
  )
}
