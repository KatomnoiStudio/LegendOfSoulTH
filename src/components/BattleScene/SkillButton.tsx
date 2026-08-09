import { useEffect, useRef } from 'react'
import { getRealtimeSkillForCharacter } from '../../game/realtimeBattle/skills'
import type { SkillAnimationId } from '../../game/realtimeBattle/skills'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import styles from './BattleScene.module.css'

/**
 * ปุ่มสกิล พร้อมวงคูลดาวน์
 *
 * แสดงเฉพาะตัวละครที่มีสกิลใน registry (§18) — ตัวอื่นไม่โชว์ปุ่มที่กดแล้วไม่เกิดอะไร
 */
export function SkillButton({
  runtime,
  animationId,
  onPress,
}: {
  runtime: RealtimeBattleRuntime
  animationId: SkillAnimationId
  onPress: (animationId: SkillAnimationId) => void
}) {
  const fill = useRef<HTMLSpanElement>(null)
  const characterId = runtime.getState().player.characterId
  const skill = getRealtimeSkillForCharacter(characterId, animationId)

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
      data-skill={animationId}
      aria-label={`สกิล ${skill.name}`}
      onPointerDown={(event) => {
        event.preventDefault()
        onPress(animationId)
      }}
    >
      <span ref={fill} className={styles.skillCooldown} aria-hidden="true" />
      <span className={styles.skillLabel} aria-hidden="true">
        {animationId === 'skill-1' ? '1' : '2'}
      </span>
      <span className={styles.skillLabel}>สกิล</span>
    </button>
  )
}
