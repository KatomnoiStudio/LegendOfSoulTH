import { useEffect, useRef } from 'react'
import { ULTIMATE_GAUGE_CONFIG } from '../../game/realtimeBattle/ultimateGauge'
import {
  getRealtimeSkillKit,
  getSkillFromKit,
  type SkillSlot,
} from '../../game/realtimeBattle/skills'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import styles from './BattleScene.module.css'

const SKILL_SLOTS: SkillSlot[] = ['skill1', 'skill2', 'skill3', 'ultimate']

const SLOT_LABELS: Record<SkillSlot, string> = {
  skill1: '1',
  skill2: '2',
  skill3: '3',
  ultimate: 'U',
}

/**
 * แถบสกิล 3+Ultimate — Blueprint v3 P3 (ไม่มีปุ่ม dash)
 */
export function SkillBar({
  runtime,
  onPress,
}: {
  runtime: RealtimeBattleRuntime
  onPress: (slot: SkillSlot) => void
}) {
  const characterId = runtime.getState().player.characterId
  const kit = getRealtimeSkillKit(characterId)
  if (!kit) return null

  return (
    <div className={styles.skillBar}>
      {SKILL_SLOTS.map((slot) => (
        <SkillSlotButton
          key={slot}
          runtime={runtime}
          slot={slot}
          definition={getSkillFromKit(kit, slot)}
          label={SLOT_LABELS[slot]}
          onPress={() => onPress(slot)}
        />
      ))}
    </div>
  )
}

function SkillSlotButton({
  runtime,
  slot,
  definition,
  label,
  onPress,
}: {
  runtime: RealtimeBattleRuntime
  slot: SkillSlot
  definition: { name: string; cooldownMs: number }
  label: string
  onPress: () => void
}) {
  const fill = useRef<HTMLSpanElement>(null)
  const isUltimate = slot === 'ultimate'

  useEffect(() => {
    let frame = 0
    const tick = () => {
      frame = window.requestAnimationFrame(tick)
      if (!fill.current) return

      const player = runtime.getState().player
      if (isUltimate) {
        const ratio = 1 - player.ultimateGauge / ULTIMATE_GAUGE_CONFIG.max
        fill.current.style.height = `${Math.max(0, Math.min(1, ratio)) * 100}%`
        return
      }

      const remaining = player.skillCooldownsMs[slot]
      const ratio = Math.max(0, Math.min(1, remaining / definition.cooldownMs))
      fill.current.style.height = `${ratio * 100}%`
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime, slot, definition.cooldownMs, isUltimate])

  return (
    <button
      type="button"
      className={isUltimate ? styles.ultimateBtn : styles.skillBtn}
      aria-label={isUltimate ? `อัลติเมท ${definition.name}` : `สกิล ${label} ${definition.name}`}
      onPointerDown={(event) => {
        event.preventDefault()
        onPress()
      }}
    >
      <span
        ref={fill}
        className={isUltimate ? styles.ultimateCooldown : styles.skillCooldown}
        aria-hidden="true"
      />
      <span className={isUltimate ? styles.ultimateLabel : styles.skillLabel}>{label}</span>
    </button>
  )
}
