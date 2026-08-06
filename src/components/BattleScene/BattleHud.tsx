import type { RealtimeBattleSnapshot } from '../../game/realtimeBattle/types'
import styles from './BattleScene.module.css'

/**
 * แผงข้อมูลของห้องต่อสู้ — เลือด คลื่น จำนวนศัตรูที่เหลือ
 *
 * ห้ามมีคำว่า "รอบ/เทิร์น/หน่วยที่กำลังเล่น/รอเทิร์นศัตรู/เลือกเป้าหมาย" ใน HUD นี้ (§23)
 * ค่าที่แสดงมาจาก snapshot ที่ publish เป็นช่วง ๆ (~10 ครั้งต่อวินาที) ไม่ใช่ทุกเฟรมจำลอง
 */
export function BattleHud({
  snapshot,
  onExit,
}: {
  snapshot: RealtimeBattleSnapshot
  onExit: () => void
}) {
  const { player } = snapshot
  const hpRatio = player.maxHp > 0 ? Math.max(0, player.hp / player.maxHp) : 0
  const enemiesLeft = snapshot.enemies.filter((enemy) => enemy.hp > 0).length

  return (
    <div className={styles.hud}>
      <div className={styles.hudTop}>
        <div className={styles.playerVitals}>
          <span className={styles.playerName}>{player.name}</span>
          <div className={styles.hpTrack}>
            <div className={styles.hpFill} style={{ width: `${hpRatio * 100}%` }} />
          </div>
          <span className={styles.hpText}>
            {Math.max(0, Math.ceil(player.hp))}/{player.maxHp}
          </span>
        </div>

        <div className={styles.stageInfo}>
          <span className={styles.stageName}>{snapshot.stageName}</span>
          <span className={styles.waveText}>
            คลื่น {snapshot.currentWave}/{snapshot.totalWaves} · เหลือศัตรู {enemiesLeft}
          </span>
        </div>

        <button type="button" className={styles.exitBtn} onClick={onExit} aria-label="ออกจากการต่อสู้">
          ออก
        </button>
      </div>
    </div>
  )
}
