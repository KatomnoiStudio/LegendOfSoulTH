import { formatNumber } from '../../lib/format'
import type { ResultViewModel } from '../../game/reward/rewardSchema'
import { useModalA11y } from '../../hooks/useModalA11y'
import styles from '../BattleScene/BattleScene.module.css'

export function DungeonResultPanel({
  viewModel,
  onContinue,
}: {
  viewModel: ResultViewModel
  onContinue: () => void
}) {
  const won = viewModel.status === 'clear'
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onContinue)

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
        <p className={styles.resultEyebrow}>{viewModel.dungeonName}</p>
        <h2 id="dungeon-result-title" className={won ? styles.resultWin : styles.resultLose}>
          {won ? 'เคลียร์ดันเจี้ยน' : 'ดันเจี้ยนล้มเหลว'}
        </h2>
        <p className={styles.resultMeta}>
          เวลา {viewModel.clearTimeLabel} · ด่านผ่าน {viewModel.stagesCleared}/
          {viewModel.stagesTotal}
        </p>

        {!won && viewModel.failureLabel ? (
          <p className={styles.resultMeta}>{viewModel.failureLabel}</p>
        ) : null}

        {viewModel.nonProductionBalance ? (
          <p className={styles.resultMeta} data-testid="non-production-balance-label">
            NON-PRODUCTION BALANCE
          </p>
        ) : null}

        <ul className={styles.resultRewards} aria-label="รางวัล">
          {viewModel.rewards.length > 0 ? (
            viewModel.rewards.map((reward) => (
              <li key={`${reward.kind}-${reward.label}`}>
                <span>{reward.label}</span>
                <strong>{reward.amount}</strong>
              </li>
            ))
          ) : (
            <li>
              <span>ไม่มีรางวัล</span>
              <strong>{formatNumber(0)}</strong>
            </li>
          )}
        </ul>

        <button
          type="button"
          className={styles.resultContinue}
          onClick={onContinue}
          disabled={!viewModel.canContinue}
        >
          กลับล็อบบี้
        </button>
      </div>
    </div>
  )
}
