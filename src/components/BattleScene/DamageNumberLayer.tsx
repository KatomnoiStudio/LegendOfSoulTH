import { useEffect, useRef } from 'react'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { ScreenProjection } from './ScreenProjector'
import styles from './BattleScene.module.css'

/**
 * เลขดาเมจลอยขึ้นจากตัวที่โดนตี
 *
 * ── ทำไมต้องเป็น pool ──────────────────────────────────────
 * สเปกข้อ 23 ห้ามสร้าง/ทำลาย DOM จำนวนมากต่อเนื่อง การต่อสู้หนึ่งครั้งมีดาเมจได้หลายร้อย
 * ครั้ง ถ้า mount/unmount ทุกครั้งจะเกิด layout thrash และ GC ถี่จนเฟรมตก
 * ชั้นนี้จึงสร้างช่องไว้จำนวนคงที่แล้ววนใช้ซ้ำ — จำนวน DOM node ไม่เปลี่ยนเลยตลอดการต่อสู้
 * ────────────────────────────────────────────────────────────
 *
 * และไม่มี `setState` เลยแม้แต่ครั้งเดียว: ทุกอย่างเขียนลง `style` ของ element ผ่าน ref
 * ในลูป rAF เดียว ตามข้อห้ามของสเปกข้อ 8 เรื่อง re-render ต่อเฟรม
 */

const POOL_SIZE = 24
const LIFETIME_MS = 700

export function DamageNumberLayer({
  runtime,
  projection,
}: {
  runtime: RealtimeBattleRuntime
  projection: { current: ScreenProjection }
}) {
  const nodes = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    /** ช่องที่กำลังใช้อยู่: เก็บ event ที่ผูกกับช่องนั้นและเวลาที่เริ่มแสดง */
    const slots = Array.from({ length: POOL_SIZE }, () => ({
      position: { x: 0, y: 0 },
      startedAtMs: -Infinity,
    }))
    const seen = new Set<string>()
    let nextSlot = 0
    let frame = 0

    const tick = () => {
      frame = window.requestAnimationFrame(tick)

      const state = runtime.getState()
      const project = projection.current.project

      const events = runtime.getSnapshot().damageEvents

      /*
        ลืม id ที่หลุดจากรายการไปแล้ว

        runtime ทิ้ง event หลัง EVENT_TTL_MS และ id ไม่ซ้ำกันเลย id ที่ไม่อยู่ในรายการแล้ว
        จึงไม่มีทางกลับมาอีก ถ้าไม่ตัดทิ้ง Set นี้จะโตตามจำนวนครั้งที่ตีตลอดการต่อสู้
        ทั้งที่พูลตัวเลขนี้ตั้งใจออกแบบให้ใช้หน่วยความจำคงที่
      */
      if (seen.size > events.length) {
        for (const id of seen) {
          if (!events.some((event) => event.id === id)) seen.delete(id)
        }
      }

      for (const event of events) {
        if (seen.has(event.id)) continue
        seen.add(event.id)

        const slot = slots[nextSlot]
        const node = nodes.current[nextSlot]
        nextSlot = (nextSlot + 1) % POOL_SIZE

        slot.position = event.position
        slot.startedAtMs = state.elapsedMs

        if (node) {
          node.textContent = String(event.amount)
          node.dataset.critical = String(event.critical)
        }
      }

      for (const [index, slot] of slots.entries()) {
        const node = nodes.current[index]
        if (!node) continue

        const age = state.elapsedMs - slot.startedAtMs
        if (age > LIFETIME_MS || !Number.isFinite(slot.startedAtMs)) {
          node.style.opacity = '0'
          continue
        }

        const screen = project?.(slot.position)
        if (!screen) {
          node.style.opacity = '0'
          continue
        }

        const progress = age / LIFETIME_MS
        node.style.opacity = String(1 - progress)
        node.style.left = `${screen.left}%`
        node.style.top = `${screen.top}%`
        // ลอยขึ้นเรื่อย ๆ ตามอายุ ให้เห็นชัดว่าเป็นดาเมจใหม่ ไม่ใช่ค่าเดิมค้าง
        node.style.transform = `translate(-50%, calc(-50% - ${progress * 42}px))`
      }
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime, projection])

  return (
    <div className={styles.damageLayer} aria-hidden="true">
      {Array.from({ length: POOL_SIZE }, (_, index) => (
        <span
          key={index}
          ref={(node) => {
            nodes.current[index] = node
          }}
          className={styles.damageNumber}
          style={{ opacity: 0 }}
        />
      ))}
    </div>
  )
}
