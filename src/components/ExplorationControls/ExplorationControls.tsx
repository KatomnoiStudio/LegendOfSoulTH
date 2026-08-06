import { useCallback } from 'react'
import type { Direction } from '../../game/exploration/types'
import { getNpc } from '../../game/npc/npcs'
import styles from './ExplorationControls.module.css'

interface ExplorationControlsProps {
  nearbyNpcId: string | null
  disabled: boolean
  onPressDirection: (direction: Direction) => void
  onReleaseDirection: (direction: Direction) => void
  onTalk: () => void
}

export function ExplorationControls({
  nearbyNpcId,
  disabled,
  onPressDirection,
  onReleaseDirection,
  onTalk,
}: ExplorationControlsProps) {
  // ask-CB retroactive audit (2026-08-06): เดิม onPointerUp/Cancel ส่งเวกเตอร์ศูนย์ตรง ๆ
  // ทับค่าที่ปุ่มอื่นตั้งไว้เสมอ — กด ▲ ค้างแล้วกด ▶ ตาม ปล่อย ▶ = หยุดสนิททั้งที่ ▲ ยังกดอยู่
  // เปลี่ยนเป็นแจ้ง "ปล่อยทิศนี้" แทน แล้วให้ useExploration รวมชุดทิศที่เหลือเอง (เหมือน
  // InputSystem.ts ของห้องต่อสู้)
  const bind = useCallback(
    (direction: Direction) => ({
      onPointerDown: (event: React.PointerEvent) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        onPressDirection(direction)
      },
      onPointerUp: (event: React.PointerEvent) => {
        event.preventDefault()
        onReleaseDirection(direction)
      },
      onPointerCancel: () => onReleaseDirection(direction),
    }),
    [onPressDirection, onReleaseDirection],
  )

  const npc = nearbyNpcId ? getNpc(nearbyNpcId) : null

  return (
    <div className={styles.controls}>
      <div className={styles.dpad}>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('up')}>▲</button>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('left')}>◀</button>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('right')}>▶</button>
        <span />
        <button type="button" className={styles.dpadBtn} disabled={disabled} {...bind('down')}>▼</button>
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
