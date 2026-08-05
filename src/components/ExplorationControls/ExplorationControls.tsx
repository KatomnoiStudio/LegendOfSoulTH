import { useCallback } from 'react'
import type { MovementVector } from '../../game/exploration/types'
import { getNpc } from '../../game/npc/npcs'
import styles from './ExplorationControls.module.css'

interface ExplorationControlsProps {
  nearbyNpcId: string | null
  disabled: boolean
  onMove: (vector: MovementVector) => void
  onTalk: () => void
}

export function ExplorationControls({
  nearbyNpcId,
  disabled,
  onMove,
  onTalk,
}: ExplorationControlsProps) {
  const bind = useCallback(
    (vector: MovementVector) => ({
      onPointerDown: (event: React.PointerEvent) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        onMove(vector)
      },
      onPointerUp: (event: React.PointerEvent) => {
        event.preventDefault()
        onMove({ x: 0, y: 0 })
      },
      onPointerCancel: () => onMove({ x: 0, y: 0 }),
    }),
    [onMove],
  )

  const npc = nearbyNpcId ? getNpc(nearbyNpcId) : null

  return (
    <div className={styles.controls}>
      <div className={styles.dpad}>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind({ x: 0, y: -1 })}>▲</button>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind({ x: -1, y: 0 })}>◀</button>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind({ x: 1, y: 0 })}>▶</button>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind({ x: 0, y: 1 })}>▼</button>
        <span />
      </div>

      {npc ? (
        <button type="button" className={styles.talkBtn} disabled={disabled} onClick={onTalk}>
          คุย
          <span className={styles.talkLabel}>{npc.name}</span>
        </button>
      ) : null}
    </div>
  )
}
