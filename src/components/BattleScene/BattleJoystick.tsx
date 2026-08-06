import { useCallback, useRef, useState } from 'react'
import type { Vec2 } from '../../game/realtimeBattle/types'
import styles from './BattleScene.module.css'

/**
 * จอยสติกเสมือนสำหรับจอสัมผัส (§12)
 *
 * ออกแบบให้เล่นด้วยสองนิ้วพร้อมกันได้: ตัวจอยจับเฉพาะ pointerId ของนิ้วที่แตะมันเป็นคนแรก
 * แล้ว setPointerCapture ไว้ นิ้วที่สองที่ไปกดปุ่มโจมตีจึงไม่ไปแย่งการควบคุมจอย
 * (ถ้าใช้ event ระดับ window ร่วมกันจะเกิดอาการ "เดินอยู่แล้วกดโจมตีทีนึงตัวหยุดเดิน")
 *
 * ค่าที่ส่งออกเป็นเวกเตอร์ -1..1 ตามระยะที่ลากจากจุดกึ่งกลาง — ผลักไปไกลกว่ารัศมีก็ตัดที่ 1
 */

/** รัศมีของแป้นจอยเป็นพิกเซล — ใช้แปลงระยะลากเป็นค่า -1..1 */
const STICK_RADIUS = 52

export function BattleJoystick({ onChange }: { onChange: (vector: Vec2) => void }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const [knob, setKnob] = useState<Vec2>({ x: 0, y: 0 })

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current
      if (!base) return

      const rect = base.getBoundingClientRect()
      const dx = clientX - (rect.left + rect.width / 2)
      const dy = clientY - (rect.top + rect.height / 2)

      /*
        แปลงเป็นพิกัดของเวทีก่อน แล้วค่อยหารด้วยรัศมี

        GameViewport ย่อทั้งเวทีด้วย transform: scale() ทำให้ระยะที่วัดจาก
        getBoundingClientRect เป็น "พิกเซลบนจอจริง" ซึ่งเล็กกว่าพิกเซลของเวที
        ถ้าไม่หารกลับ จอยจะรู้สึกหนืดผิดปกติเมื่อเปิดบนจอเล็ก
      */
      const scale = rect.width / (STICK_RADIUS * 2)
      const x = dx / scale / STICK_RADIUS
      const y = dy / scale / STICK_RADIUS

      const length = Math.hypot(x, y)
      const clamped = length > 1 ? { x: x / length, y: y / length } : { x, y }

      setKnob(clamped)
      onChange(clamped)
    },
    [onChange],
  )

  const release = useCallback(() => {
    activePointer.current = null
    setKnob({ x: 0, y: 0 })
    onChange({ x: 0, y: 0 })
  }, [onChange])

  return (
    <div
      ref={baseRef}
      className={styles.joystickBase}
      role="application"
      aria-label="แป้นบังคับทิศทาง"
      onPointerDown={(event) => {
        if (activePointer.current !== null) return
        activePointer.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        update(event.clientX, event.clientY)
      }}
      onPointerMove={(event) => {
        if (activePointer.current !== event.pointerId) return
        update(event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        if (activePointer.current !== event.pointerId) return
        release()
      }}
      onPointerCancel={(event) => {
        if (activePointer.current !== event.pointerId) return
        release()
      }}
    >
      <div
        className={styles.joystickKnob}
        style={{ transform: `translate(${knob.x * STICK_RADIUS}px, ${knob.y * STICK_RADIUS}px)` }}
      />
    </div>
  )
}
