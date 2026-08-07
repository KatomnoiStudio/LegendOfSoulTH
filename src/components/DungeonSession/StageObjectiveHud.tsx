import type { StageRuntimeSnapshot } from '../../game/dungeon/stageRuntime'
import styles from '../BattleScene/BattleScene.module.css'

/** Minimal P5 stage objective overlay — reads StageRuntime snapshot only */
export function StageObjectiveHud({ snapshot }: { snapshot: StageRuntimeSnapshot | null }) {
  if (!snapshot) return null
  const { objective, timerRemainingMs, timerElapsedMs, enemiesRemaining, stageName } = snapshot

  return (
    <div className={styles.stageObjectiveHud} aria-live="polite">
      <div className={styles.stageObjectiveTitle}>{stageName}</div>
      <div className={styles.stageObjectiveRow}>
        <span>{objective.label}</span>
        <strong>
          {objective.target > 0
            ? `${objective.current}/${objective.target}`
            : (objective.detail ?? objective.current)}
        </strong>
      </div>
      <div className={styles.stageObjectiveRow}>
        <span>ศัตรู</span>
        <strong>{enemiesRemaining}</strong>
      </div>
      {timerRemainingMs !== null ? (
        <div className={styles.stageObjectiveRow}>
          <span>เวลา</span>
          <strong>{Math.ceil(timerRemainingMs / 1000)}s</strong>
        </div>
      ) : (
        <div className={styles.stageObjectiveRow}>
          <span>เวลา</span>
          <strong>{Math.ceil(timerElapsedMs / 1000)}s</strong>
        </div>
      )}
    </div>
  )
}
