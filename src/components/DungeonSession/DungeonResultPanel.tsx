import { formatDurationMs, formatNumber } from '../../lib/format'
import type { DungeonResult } from '../../game/dungeon/dungeonSchema'
import { useModalA11y } from '../../hooks/useModalA11y'
import styles from '../BattleScene/BattleScene.module.css'

export function DungeonResultPanel({
  result,
  dungeonName,
  onContinue,
}: {
  result: DungeonResult
  dungeonName: string
  onContinue: () => void
}) {
  const won = result.success
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onContinue)
  const stagesCleared = result.stageResults.filter((s) => s.success).length

  return (
    <div className={styles.resultBackdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.resultPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dungeon-result-title"
        tabIndex={-1}
      >
        <p className={styles.resultEyebrow}>{dungeonName}</p>
        <h2 id="dungeon-result-title" className={won ? styles.resultWin : styles.resultLose}>
          {won ? 'เคลียร์ดันเจี้ยน' : 'ดันเจี้ยนล้มเหลว'}
        </h2>
        <p className={styles.resultMeta}>
          เวลา {formatDurationMs(result.clearTimeMs)} · ด่านผ่าน {stagesCleared}/
          {result.stageResults.length}
        </p>

        <ul className={styles.resultRewards} aria-label="รางวัล">
          {result.rewardPlaceholder ? (
            <>
              <li>
                <span>ทอง (placeholder)</span>
                <strong>+{formatNumber(result.rewardPlaceholder.gold)}</strong>
              </li>
              <li>
                <span>EXP (placeholder)</span>
                <strong>+{formatNumber(result.rewardPlaceholder.exp)}</strong>
              </li>
            </>
          ) : null}
        </ul>

        <button type="button" className={styles.resultContinue} onClick={onContinue}>
          กลับล็อบบี้
        </button>
      </div>
    </div>
  )
}
