import type { StageRuntimeSnapshot } from '../../game/dungeon/stageRuntime'
import styles from '../BattleScene/BattleScene.module.css'

/** Minimal P5 stage objective overlay — reads StageRuntime snapshot only */
export function StageObjectiveHud({ snapshot }: { snapshot: StageRuntimeSnapshot | null }) {
  if (!snapshot) return null
  const { objective, timerRemainingMs, timerElapsedMs, enemiesRemaining, stageName } = snapshot

  const objectiveValue =
    objective.target > 0
      ? `${objective.current}/${objective.target}`
      : (objective.detail ?? String(objective.current))

  const timerValue =
    timerRemainingMs !== null
      ? `${Math.ceil(timerRemainingMs / 1000)}s`
      : `${Math.ceil(timerElapsedMs / 1000)}s`

  return (
    <div className={styles.stageObjectiveHud} aria-live="polite">
      <div className={styles.stageObjectiveTitle}>{stageName}</div>
      <div className={styles.stageObjectiveGrid}>
        <span className={styles.stageObjectiveLabel}>{objective.label}</span>
        <strong className={styles.stageObjectiveValue}>{objectiveValue}</strong>
        <span className={styles.stageObjectiveLabel}>ศัตรู</span>
        <strong className={styles.stageObjectiveValue}>{enemiesRemaining}</strong>
        <span className={styles.stageObjectiveLabel}>เวลา</span>
        <strong className={styles.stageObjectiveValue}>{timerValue}</strong>
      </div>
    </div>
  )
}
