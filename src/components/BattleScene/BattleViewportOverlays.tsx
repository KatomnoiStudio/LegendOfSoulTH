import styles from './BattleScene.module.css'

export function BattlePortraitOverlay() {
  return (
    <div
      className={styles.portraitOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="หมุนอุปกรณ์"
    >
      <div className={styles.portraitOverlayCard}>
        <span className={styles.portraitOverlayIcon} aria-hidden="true">
          ↻
        </span>
        <p className={styles.portraitOverlayText}>กรุณาหมุนอุปกรณ์เป็นแนวนอนเพื่อเล่นเกม</p>
      </div>
    </div>
  )
}

export function BattleFullscreenPrompt({ onActivate }: { onActivate: () => void }) {
  return (
    <button
      type="button"
      className={styles.fullscreenPrompt}
      onClick={onActivate}
      aria-label="แตะเพื่อเข้าสู่โหมดเต็มจอ"
    >
      แตะเพื่อเข้าสู่โหมดเต็มจอ
    </button>
  )
}
