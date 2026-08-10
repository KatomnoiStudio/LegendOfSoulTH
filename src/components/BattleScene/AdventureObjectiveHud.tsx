import type { ReactNode } from 'react'
import type {
  BattleObjectiveSnapshot,
  RealtimeBattleSnapshot,
} from '../../game/realtimeBattle/types'
import styles from './BattleScene.module.css'

function seconds(value: number | null): string {
  return value === null ? '—' : `${Math.ceil(value / 1000)}s`
}

function describeBattleObjective(
  objective: BattleObjectiveSnapshot,
  enemiesLeft: number,
): { label: string; value: string; timer: string | null } {
  switch (objective.kind) {
    case 'survival':
      return {
        label: 'เอาชีวิตรอด',
        value: 'อยู่รอดจนหมดเวลา',
        timer: seconds(objective.remainingMs),
      }
    case 'defend':
      return {
        label: 'ปกป้องศาลเจ้า',
        value: `${Math.ceil(objective.current ?? 0)}/${Math.ceil(objective.target ?? 0)} HP`,
        timer: null,
      }
    case 'chase':
      return {
        label: 'ไปถึงวงเป้าหมาย',
        value: `เหลือ ${Math.ceil(objective.current ?? 0)} หน่วย`,
        timer: seconds(objective.remainingMs),
      }
    case 'hazard':
      return {
        label: 'หยุดไฟก่อนลาม',
        value: `${Math.ceil(objective.current ?? 0)}/${Math.ceil(objective.target ?? 0)}`,
        timer: null,
      }
    case 'time-attack':
      return {
        label: 'กำจัดให้ทันเวลา',
        value: `Wave ${objective.current ?? 1}/${objective.target ?? 1}`,
        timer: seconds(objective.remainingMs),
      }
    case 'mini-boss':
      return { label: 'โค่นมินิบอส', value: `ศัตรูเหลือ ${enemiesLeft}`, timer: null }
    case 'custom':
      return { label: 'ภารกิจพิเศษ', value: `ศัตรูเหลือ ${enemiesLeft}`, timer: null }
    case 'wave':
      return {
        label: 'กำจัดทุกคลื่น',
        value: `Wave ${objective.current ?? 1}/${objective.target ?? 1}`,
        timer: null,
      }
  }
}

export function AdventureObjectiveHud({ snapshot }: { snapshot: RealtimeBattleSnapshot }) {
  const enemiesLeft = snapshot.enemies.filter(
    (enemy) => enemy.hp > 0 && enemy.state !== 'dead',
  ).length
  const objective = describeBattleObjective(snapshot.objective, enemiesLeft)

  return (
    <section className={styles.stageObjectiveHud} aria-label="เป้าหมายด่าน" aria-live="polite">
      <div className={styles.stageObjectiveTitle}>{objective.label}</div>
      <div className={styles.stageObjectiveGrid}>
        <span className={styles.stageObjectiveLabel}>เป้าหมาย</span>
        <strong className={styles.stageObjectiveValue}>{objective.value}</strong>
        <span className={styles.stageObjectiveLabel}>ศัตรู</span>
        <strong className={styles.stageObjectiveValue}>{enemiesLeft}</strong>
        {objective.timer ? (
          <>
            <span className={styles.stageObjectiveLabel}>เวลา</span>
            <strong className={styles.stageObjectiveValue}>{objective.timer}</strong>
          </>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Objective HUD ownership boundary for every realtime battle room.
 *
 * Adventure uses the snapshot-driven default. Dungeon can replace it with its own stage-runtime
 * objective, but both can never mount together and overlap pixel-for-pixel.
 */
export function BattleObjectiveLayer({
  snapshot,
  objectiveOverlay,
}: {
  snapshot: RealtimeBattleSnapshot
  objectiveOverlay?: ReactNode
}) {
  return objectiveOverlay ?? <AdventureObjectiveHud snapshot={snapshot} />
}
