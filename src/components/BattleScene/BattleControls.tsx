import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { SkillSlot } from '../../game/realtimeBattle/skills'
import type { MovementInput } from '../../game/realtimeBattle/playerInput'
import { BattleJoystick } from './BattleJoystick'
import { CombatCluster } from './CombatCluster'
import styles from './BattleScene.module.css'

/**
 * Mobile combat control HUD — left movement, right combat cluster.
 *
 * Blueprint v3 §3.3 + Naruto-mobile-inspired ergonomics (UX reference only).
 */
export function BattleControls({
  runtime,
  onMove,
  onAttack,
  onSkill,
  inputBlocked = false,
}: {
  runtime: RealtimeBattleRuntime
  onMove: (input: MovementInput) => void
  onAttack: () => void
  onSkill: (slot: SkillSlot) => void
  inputBlocked?: boolean
}) {
  return (
    <div className={styles.controls} aria-hidden={inputBlocked}>
      <div className={styles.controlsLeft}>
        <BattleJoystick onChange={onMove} disabled={inputBlocked} />
      </div>
      <div className={styles.controlsRight}>
        <CombatCluster
          runtime={runtime}
          onAttack={onAttack}
          onSkill={onSkill}
          disabled={inputBlocked}
        />
      </div>
    </div>
  )
}
