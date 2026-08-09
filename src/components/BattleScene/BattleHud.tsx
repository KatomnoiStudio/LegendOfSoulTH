import { deriveHpRatio, selectPrimaryEnemyHpTarget } from '../../game/realtimeBattle/battleVitals'
import { getRealtimeStage } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleSnapshot } from '../../game/realtimeBattle/types'
import { formatDurationMs } from '../../lib/format'
import styles from './BattleScene.module.css'

/**
 * Combat HUD — player vitals (top-left), stage info (top-center), enemy summary (top-right).
 */
export function BattleHud({
  snapshot,
  onExit,
}: {
  snapshot: RealtimeBattleSnapshot
  onExit: () => void
}) {
  const { player } = snapshot
  const hpRatio = deriveHpRatio(player.hp, player.maxHp)
  const enemiesLeft = snapshot.enemies.filter(
    (enemy) => enemy.hp > 0 && enemy.state !== 'dead',
  ).length
  const primaryEnemy = selectPrimaryEnemyHpTarget(snapshot.enemies)
  const enemyHpRatio = primaryEnemy ? deriveHpRatio(primaryEnemy.hp, primaryEnemy.maxHp) : 0
  const stage = getRealtimeStage(snapshot.stageId)
  const survivalDurationMs = stage?.survival?.durationMs ?? 0
  const isSurvival = stage?.stageType === 'survival' && survivalDurationMs > 0
  const survivalRemainingMs = Math.max(0, survivalDurationMs - snapshot.stageElapsedMs)
  const objectiveText = (() => {
    if (stage?.stageType === 'defend' && snapshot.objectiveHp !== null) {
      return `ปกป้องศาลเจ้า ${Math.ceil(Math.max(0, snapshot.objectiveHp))}`
    }
    if (stage?.stageType === 'hazard' && snapshot.hazardHp !== null) {
      return `อันตราย ${Math.ceil(Math.max(0, snapshot.hazardHp))}`
    }
    if (stage?.stageType === 'chase' && stage.chase) {
      const remaining = Math.max(0, stage.chase.timeBudgetMs - snapshot.stageElapsedMs)
      return `ไล่ล่า เหลือเวลา ${formatDurationMs(remaining)}`
    }
    if (stage?.stageType === 'time-attack' && stage.timeAttack) {
      const remaining = Math.max(0, stage.timeAttack.timeBudgetMs - snapshot.stageElapsedMs)
      return `จับเวลา เหลือ ${formatDurationMs(remaining)}`
    }
    return null
  })()

  return (
    <div className={styles.hud}>
      <div className={styles.hudTop}>
        <div className={styles.playerVitals}>
          <span className={styles.playerPortrait} aria-hidden="true">
            {player.name.slice(0, 1)}
          </span>
          <div className={styles.playerVitalsBody}>
            <span className={styles.playerName}>{player.name}</span>
            <div className={styles.hpTrack}>
              <div className={styles.hpFill} style={{ width: `${hpRatio * 100}%` }} />
            </div>
            <span className={styles.hpText}>
              {Math.max(0, Math.ceil(player.hp))}/{player.maxHp}
            </span>
          </div>
        </div>

        <div className={styles.stageInfo}>
          <span className={styles.stageName}>{snapshot.stageName}</span>
          {isSurvival ? (
            <span className={styles.waveText}>
              เอาชีวิตรอด {formatDurationMs(survivalRemainingMs)} · ศัตรู {enemiesLeft}
            </span>
          ) : objectiveText ? (
            <span className={styles.waveText}>
              {objectiveText} · ศัตรู {enemiesLeft}
            </span>
          ) : (
            <span className={styles.waveText}>
              Wave {snapshot.currentWave}/{snapshot.totalWaves} · ศัตรู {enemiesLeft}
            </span>
          )}
        </div>

        <div className={styles.enemyVitals}>
          {primaryEnemy ? (
            <>
              <div className={styles.enemyVitalsBody}>
                <span className={styles.enemyName}>{primaryEnemy.name}</span>
                <div className={styles.enemyHpTrack}>
                  <div className={styles.enemyHpFill} style={{ width: `${enemyHpRatio * 100}%` }} />
                </div>
                <span className={styles.hpText}>
                  {Math.max(0, Math.ceil(primaryEnemy.hp))}/{primaryEnemy.maxHp}
                </span>
              </div>
              <span className={styles.enemyPortrait} aria-hidden="true">
                {primaryEnemy.name.slice(0, 1)}
              </span>
            </>
          ) : (
            <span className={styles.enemyName}>—</span>
          )}
          <button
            type="button"
            className={styles.exitBtn}
            onClick={onExit}
            aria-label="ออกจากการต่อสู้"
          >
            ออก
          </button>
        </div>
      </div>
    </div>
  )
}
