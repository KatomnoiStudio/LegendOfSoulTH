import { useEffect, useRef } from 'react'
import { DASH_CONFIG } from '../../game/realtimeBattle/attacks'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import styles from './BattleScene.module.css'

/**
 * ปุ่มพุ่งหลบ พร้อมวงคูลดาวน์
 *
 * วงคูลดาวน์อัปเดตผ่าน ref ในลูป rAF เดียว ไม่ใช่ผ่าน snapshot ที่ publish ทุก 100 ms
 * เพราะคูลดาวน์ที่กระตุกเป็นขั้น ๆ ทำให้ผู้เล่นกะจังหวะกดไม่ได้ ซึ่งเป็นข้อมูลที่สำคัญ
 * ที่สุดของปุ่มนี้
 */
export function DashButton({
  runtime,
  onPress,
}: {
  runtime: RealtimeBattleRuntime
  onPress: () => void
}) {
  const fill = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0

    const tick = () => {
      frame = window.requestAnimationFrame(tick)
      if (!fill.current) return

      const remaining = runtime.getState().player.dashCooldownRemainingMs
      const ratio = Math.max(0, Math.min(1, remaining / DASH_CONFIG.cooldownMs))
      // เต็มวง = เพิ่งกด, ว่างเปล่า = พร้อมใช้อีกครั้ง
      fill.current.style.height = `${ratio * 100}%`
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime])

  return (
    <button
      type="button"
      className={styles.dashBtn}
      aria-label="พุ่งหลบ"
      onPointerDown={(event) => {
        event.preventDefault()
        onPress()
      }}
    >
      <span ref={fill} className={styles.dashCooldown} aria-hidden="true" />
      <span className={styles.dashLabel}>หลบ</span>
    </button>
  )
}
