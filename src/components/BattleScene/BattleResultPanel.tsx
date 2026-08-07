import { getItem } from '../../game/items'
import { formatDurationMs, formatNumber } from '../../lib/format'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import { useModalA11y } from '../../hooks/useModalA11y'
import styles from './BattleScene.module.css'

/**
 * แผงผลหลังจบการต่อสู้ — แสดงชนะ/แพ้ + รางวัล แล้วรอผู้เล่นกดกลับ
 *
 * ไม่เขียนข้อมูลผู้เล่นเอง: ชั้นนอก (LobbyBattleSession) เป็นคนบันทึก
 * เมื่อกดดำเนินการต่อ
 */
export function BattleResultPanel({
  result,
  onContinue,
}: {
  result: RealtimeBattleResult
  onContinue: () => void
}) {
  const won = result.outcome === 'victory'
  // Escape / focus trap เหมือน modal อื่น — กด Esc = ดำเนินการต่อกลับล็อบบี้
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onContinue)

  return (
    <div className={styles.resultBackdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.resultPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-result-title"
        tabIndex={-1}
      >
        <p className={styles.resultEyebrow}>{result.stageName}</p>
        <h2 id="battle-result-title" className={won ? styles.resultWin : styles.resultLose}>
          {won ? 'ชนะ' : 'พ่ายแพ้'}
        </h2>
        <p className={styles.resultMeta}>
          เวลา {formatDurationMs(result.elapsedMs)} · ดาเมจที่ทำได้{' '}
          {formatNumber(Math.round(result.damageDealt))}
        </p>

        <ul className={styles.resultRewards} aria-label="รางวัล">
          <li>
            <span>ทอง</span>
            <strong>+{formatNumber(result.earnedGold)}</strong>
          </li>
          <li>
            <span>ประสบการณ์</span>
            <strong>+{formatNumber(result.earnedExp)}</strong>
          </li>
          {result.droppedItems.map((drop) => {
            const item = getItem(drop.itemId)
            return (
              <li key={drop.itemId}>
                <span>{item?.name ?? drop.itemId}</span>
                <strong>×{drop.quantity}</strong>
              </li>
            )
          })}
        </ul>

        {!won ? (
          <p className={styles.resultHint}>แพ้แล้วไม่ได้รับรางวัล — ลองใหม่ได้จากล็อบบี้</p>
        ) : null}

        <button type="button" className={styles.resultContinue} onClick={onContinue}>
          กลับล็อบบี้
        </button>
      </div>
    </div>
  )
}
