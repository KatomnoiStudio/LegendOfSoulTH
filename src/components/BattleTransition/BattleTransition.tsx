import styles from './BattleTransition.module.css'

interface BattleTransitionProps {
  opponentName: string
}

export function BattleTransition({ opponentName }: BattleTransitionProps) {
  return (
    <div className={styles.overlay} aria-live="assertive">
      <div className={styles.card}>
        <div className={styles.vs}>VS</div>
        <p className={styles.label}>{opponentName}</p>
      </div>
    </div>
  )
}
