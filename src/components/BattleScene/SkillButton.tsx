import { useEffect, useRef } from 'react'
import { getRealtimeSkillForCharacter } from '../../game/realtimeBattle/skills'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import styles from './BattleScene.module.css'

/**
 * ปุ่มสกิล พร้อมวงคูลดาวน์
 *
 * แสดงเฉพาะตัวละครที่มีสกิลใน registry (§18) — ตัวอื่นไม่โชว์ปุ่มที่กดแล้วไม่เกิดอะไร
 */
export function SkillButton({
  runtime,
  onPress,
}: {
  runtime: RealtimeBattleRuntime
  onPress: () => void
}) {
  const fill = useRef<HTMLSpanElement>(null)
  const characterId = runtime.getState().player.characterId
  const skill = getRealtimeSkillForCharacter(characterId)

  useEffect(() => {
    if (!skill) return

    let frame = 0
    const tick = () => {
      frame = window.requestAnimationFrame(tick)
      if (!fill.current) return

      const remaining = runtime.getState().player.skillCooldownRemainingMs
      const ratio = Math.max(0, Math.min(1, remaining / skill.cooldownMs))
      fill.current.style.height = `${ratio * 100}%`
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime, skill])

  if (!skill) return null

  return (
    <button
      type="button"
      className={styles.skillBtn}
      aria-label={`สกิล ${skill.name}`}
      onPointerDown={(event) => {
        event.preventDefault()
        onPress()
      }}
    >
      <span ref={fill} className={styles.skillCooldown} aria-hidden="true" />
      <span className={styles.skillLabel}>สกิล</span>
    </button>
  )
}
