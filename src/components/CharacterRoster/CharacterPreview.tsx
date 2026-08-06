import { useEffect, useRef, useState } from 'react'
import type { Character } from '../../game/characters'
import { getSpriteSequence } from '../../game/spriteSequences'
import styles from './CharacterPreview.module.css'

/** ระยะจางออก-จางเข้าเวลาเปลี่ยนตัวละคร (ต้องตรงกับ transition ใน CSS) */
const SWAP_MS = 200

interface CharacterPreviewProps {
  character: Character
}

/**
 * ภาพตัวละครขนาดใหญ่ในหน้าทำเนียบวีรชน
 *
 * ใช้ชุดเฟรม idle เดิมจาก src/game/spriteSequences.ts ชุดเดียวกับฉาก 3D
 * ไม่มีการสร้างไฟล์ภาพหรือโมเดลใหม่ และไม่แตะฉาก Lobby
 *
 * การล็อกตำแหน่ง:
 * - ทุกเฟรมเป็น <img> ซ้อนทับกันที่พิกัดเดียวกัน (position:absolute; inset:0)
 *   เปลี่ยนเฉพาะ opacity จึงไม่มีทางขยับหรือขยาย-หดระหว่างเฟรม
 * - object-position ยึดขอบล่าง ทำให้แนวเท้าคงที่แม้กล่องเปลี่ยนขนาดตามจอ
 * - แอนิเมชันหายใจ หาง และผ้าคลุม ถูกวาดอยู่ในเฟรมเหล่านี้อยู่แล้ว จึงยังทำงานครบ
 */
export function CharacterPreview({ character }: CharacterPreviewProps) {
  const [shown, setShown] = useState(character)
  const [swapping, setSwapping] = useState(false)
  const [frame, setFrame] = useState(0)
  const [turn, setTurn] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ pointerId: number; lastX: number } | null>(null)

  // สลับตัวละคร: จางออกก่อน แล้วค่อยเปลี่ยนภาพ แล้วจางเข้า
  useEffect(() => {
    if (character.id === shown.id) return

    setSwapping(true)
    const timer = window.setTimeout(() => {
      setShown(character)
      setFrame(0)
      setTurn(0)
      setSwapping(false)
    }, SWAP_MS)

    return () => window.clearTimeout(timer)
  }, [character, shown.id])

  const sequence = getSpriteSequence(shown.model.kind)
  const frameCount = sequence.idleUrls.length
  const rate = sequence.idleRate

  // เดินเฟรม idle ด้วยนาฬิกาจริง ไม่ผูกกับอัตราเฟรมของจอ
  const startRef = useRef(0)
  useEffect(() => {
    let raf = 0
    startRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000
      setFrame(Math.floor(elapsed * rate) % frameCount)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [frameCount, rate, shown.id])

  const accent = { '--hero-accent': shown.model.accent } as React.CSSProperties
  const normalizedTurn = ((turn % 360) + 360) % 360
  const turnIndex = Math.round(normalizedTurn / 45) % sequence.turnUrls.length
  const showingTurnaround = dragging || Math.abs(turn) > 0.5

  const endTurn = () => {
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div className={styles.stage} style={accent}>
      <span className={styles.glow} aria-hidden="true" />

      <span className={styles.mandala} aria-hidden="true">
        <svg viewBox="0 0 300 100" fill="none">
          <ellipse cx="150" cy="50" rx="146" ry="46" stroke="currentColor" strokeOpacity="0.4" />
          <ellipse cx="150" cy="50" rx="118" ry="36" stroke="currentColor" strokeOpacity="0.22" strokeDasharray="9 13" />
          <ellipse cx="150" cy="50" rx="86" ry="26" stroke="currentColor" strokeOpacity="0.3" />
          {/* กลีบกนกสี่ทิศ */}
          {[0, 90, 180, 270].map((deg) => (
            <path
              key={deg}
              d="M150 4c6 9 14 13 24 14-10 3-18 8-24 18-6-10-14-15-24-18 10-1 18-5 24-14z"
              fill="currentColor"
              fillOpacity="0.5"
              transform={`rotate(${deg} 150 50)`}
            />
          ))}
        </svg>
      </span>

      <div className={styles.interactionHint} aria-hidden="true">
        <span className={styles.dragGlyph}>↔</span>
        ลากซ้าย–ขวาเพื่อหมุน 360°
      </div>

      <div
        className={styles.figure}
        data-swapping={swapping}
        data-dragging={dragging}
        /*
          role="slider" ไม่ใช่ "group"

          ของชิ้นนี้คือค่าต่อเนื่องหนึ่งแกนที่ผู้ใช้ปรับเองได้ (มุมหมุน 0–360) มี tabIndex
          และรับลูกศรซ้าย/ขวากับ Home อยู่แล้ว — ตรงกับนิยาม slider ของ WAI-ARIA พอดี
          ส่วน role="group" เป็น role ที่ไม่โต้ตอบ การแขวน tabIndex กับตัวจัดการ pointer/keyboard
          ไว้บนนั้นจึงขัดกันเอง และทำให้โปรแกรมอ่านหน้าจอไม่บอกผู้ใช้ว่ากดลูกศรได้

          เพิ่ม aria-valuenow/min/max ด้วย ไม่งั้น slider ที่ไม่มีค่าก็ไร้ความหมาย
        */
        role="slider"
        aria-label={`หมุนโมเดล${shown.name} ลากซ้ายขวา หรือกดลูกศรซ้ายขวา (Home = กลับท่าตั้งต้น)`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(normalizedTurn)}
        aria-valuetext={`${Math.round(normalizedTurn)} องศา`}
        tabIndex={0}
        onDoubleClick={() => setTurn(0)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') setTurn((value) => value - 45)
          if (event.key === 'ArrowRight') setTurn((value) => value + 45)
          if (event.key === 'Home') setTurn(0)
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = { pointerId: event.pointerId, lastX: event.clientX }
          setDragging(true)
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag || drag.pointerId !== event.pointerId) return
          const delta = event.clientX - drag.lastX
          drag.lastX = event.clientX
          setTurn((value) => value + delta * 0.72)
        }}
        onPointerUp={endTurn}
        onPointerCancel={endTurn}
      >
        {sequence.idleUrls.map((url, index) => (
          <img
            key={url}
            className={styles.frame}
            data-active={!showingTurnaround && index === frame}
            src={url}
            alt={index === 0 ? `ภาพของ${shown.name}` : ''}
            aria-hidden={index !== 0}
            draggable={false}
          />
        ))}
        {sequence.turnUrls.map((url, index) => (
          <img
            key={url}
            className={styles.frame}
            data-active={showingTurnaround && index === turnIndex}
            src={url}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        ))}
      </div>

      <button
        type="button"
        className={styles.resetTurn}
        onClick={() => setTurn(0)}
        aria-label="คืนโมเดลกลับมุมตรง"
        title="คืนมุมตรง"
      >
        ↺
      </button>

      <div className={styles.nameplate}>
        <span className={styles.plateName}>{shown.name}</span>
        <span className={styles.plateEpithet}>{shown.epithet}</span>
      </div>
    </div>
  )
}
