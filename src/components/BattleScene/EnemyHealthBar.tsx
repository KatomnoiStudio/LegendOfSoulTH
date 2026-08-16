import { useEffect, useRef } from 'react'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { ScreenProjection } from './ScreenProjector'
import styles from './BattleScene.module.css'

/**
 * หลอดเลือดลอยเหนือหัวศัตรูทุกตัว
 *
 * ใช้วิธีเดียวกับเลขดาเมจ: จำนวน DOM คงที่เท่าจำนวนศัตรูสูงสุดของด่าน แล้วอัปเดตด้วย ref
 * ในลูป rAF เดียว ไม่มี setState ต่อเฟรม
 *
 * ซ่อนเมื่อ: ศัตรูตาย · ถูกฉายไปหลังกล้อง · เลือดยังเต็ม (ลดสิ่งรบกวนบนจอก่อนเริ่มตี)
 */
export function EnemyHealthBar({
  runtime,
  projection,
}: {
  runtime: RealtimeBattleRuntime
  projection: { current: ScreenProjection }
}) {
  const wraps = useRef<(HTMLDivElement | null)[]>([])
  const fills = useRef<(HTMLDivElement | null)[]>([])
  /*
    รวมทุกคลื่น ไม่ใช่เอาคลื่นที่ใหญ่ที่สุด

    runtime ต่อศัตรูคลื่นใหม่ท้ายรายการเดิมโดยไม่ลบศพออก (`state.enemies = [...state.enemies,
    ...nextWaveEnemies]`) ความยาวของรายการจึงเป็นผลรวมสะสม ถ้ากันช่องไว้แค่เท่าคลื่นที่ใหญ่สุด
    ลูปด้านล่างจะวนถึงแค่ศพของคลื่นก่อน ศัตรูที่ยังมีชีวิตในคลื่นหลังจะไม่มีหลอดเลือดเลย
  */
  const capacity = runtime
    .getState()
    .stage.waves.reduce((total, wave) => total + wave.enemies.length, 0)

  useEffect(() => {
    let frame = 0

    const tick = () => {
      frame = window.requestAnimationFrame(tick)

      const enemies = runtime.getState().enemies
      const project = projection.current.project

      for (let index = 0; index < wraps.current.length; index += 1) {
        const wrap = wraps.current[index]
        const fill = fills.current[index]
        if (!wrap || !fill) continue

        const enemy = enemies[index]
        if (!enemy || enemy.hp <= 0 || enemy.hp >= enemy.maxHp) {
          wrap.style.opacity = '0'
          continue
        }

        const screen = project?.(enemy.position, 2.1)
        if (!screen) {
          wrap.style.opacity = '0'
          continue
        }

        wrap.style.opacity = '1'
        wrap.style.left = `${screen.left}%`
        wrap.style.top = `${screen.top}%`
        fill.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`
      }
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime, projection])

  return (
    <div className={styles.enemyBarLayer} aria-hidden="true">
      {Array.from({ length: capacity }, (_, index) => (
        <div
          key={index}
          ref={(node) => {
            wraps.current[index] = node
          }}
          className={styles.enemyBar}
          style={{ opacity: 0 }}
        >
          <div
            ref={(node) => {
              fills.current[index] = node
            }}
            className={styles.enemyBarFill}
          />
        </div>
      ))}
    </div>
  )
}
