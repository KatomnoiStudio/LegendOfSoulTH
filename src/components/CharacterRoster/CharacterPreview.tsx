import { useEffect, useRef, useState } from 'react'
import type { Character } from '../../game/characters'
import { getSpriteSequence } from '../../game/spriteSequences'
import {
  exitBattleFullscreen,
  isFullscreenSupported,
  requestBattleFullscreen,
} from '../../lib/battle/battleViewport'
import styles from './CharacterPreview.module.css'

/** ระยะจางออก-จางเข้าเวลาเปลี่ยนตัวละคร (ต้องตรงกับ transition ใน CSS) */
const SWAP_MS = 200

/*
  ค่าซูมสไปรต์ — จุดเดียวทั้งไฟล์ (desktop/mobile ใช้ค่าเดียวกัน — ดูเหตุผลด้านล่าง)

  ก่อนหน้านี้ .frame มี transform: scale(1.82) กับ scale(1.55) แยกกันคนละที่ (desktop vs
  @media max-width:900px) ปัญหาคือ transform: scale() คำนวณจากกล่องตัวเอง ไม่ใช่ viewport
  จึงควรเป็นค่าเดียวกันเสมอไม่ว่าจอไหน — สองค่านี้แยกจูนกันคนละเวลาโดยไม่รู้ว่าควรเท่ากัน
  (มือถือแก้ค่าหนึ่งสเกลคอมพัง คอมแก้ค่าหนึ่งสเกลมือถือพัง — ตามที่ HetCreep ชี้ไว้ 2026-08-08)

  รอบแรก (2026-08-08 เช้า) วัดได้ 1.31 จากสไปรต์ต้นฉบับ 640x512 ที่มี transparent padding
  รอบข้างเยอะ — เป็นค่าสูงสุดที่ไม่ตัดเนื้อหาแม้แต่พิกเซลเดียว ต่ำกว่า 1.82 เดิมมาก เพราะ
  CSS scale() ต้องแบกงานซูมทั้งหมดเอง

  รอบสอง (2026-08-08 บ่าย) — sprite source ถูก re-crop จริงแล้ว (Adobe image_crop_to_bounds,
  crop rect เดียวกันร่วมทั้ง 3 ตัวละคร = union ของ safe bbox ต่อตัวจาก alpha-channel scan,
  ไฟล์ใหม่ 396x376 แทน 640x512 เดิม) ผลคือ transparent padding รอบตัวละครถูกตัดออกไปแล้ว
  ตั้งแต่ระดับไฟล์ภาพ ตัวละครจึงเต็มกล่อง .figure อยู่แล้วที่ scale 1 (เทียบสัดส่วนจริง:
  ซุนหงอคงกินพื้นที่แนวนอน ~78% ของกล่องใหม่ที่ scale 1 เทียบกับ ~64% ของกล่องเก่าที่ scale
  1.31 — คือ "ใหญ่ขึ้น" แล้วจากการ crop ไม่ต้องพึ่ง CSS scale มาช่วยอีก)

  ค่าที่ปลอดภัยจริงตอนนี้คำนวณได้ 1.0053 (bbox scan รอบสองบนไฟล์ crop ใหม่ ทุกเฟรมทุกตัว
  เหมือนรอบแรก) เฟรมที่ตึงที่สุดคือ tripitaka-turn-4 (บนสุดของเนื้อหาห่างขอบกล่องแค่ ~0.5%)
  — floor ลง 2 ตำแหน่งเป็น 1.00 ให้มี margin กันพิกเซลขอบหลุดจาก antialiasing เป้าหมายเดิม
  "กลับไปใกล้ 1.82" คือเป้าหมายด้าน "ตัวละครดูใหญ่พอ" ไม่ใช่ตัวเลขนี้ตรง ๆ — crop ที่แน่นแล้ว
  ทำให้เป้าหมายนั้นสำเร็จโดยไม่ต้องพึ่ง SPRITE_ZOOM สูงอีกต่อไป (ถ้าคง 1.31 ไว้ตอนนี้จะ
  ตัดภาพจริงเพราะไม่มี padding เหลือให้ซูมเข้าไปกินแล้ว)

  แก้ค่านี้ที่เดียว ไม่ต้องหาที่สอง — ถ้าจะรีคำนวณหลัง sprite เปลี่ยนอีก ดูสคริปต์วัดที่ใช้ตอน
  ตัดสินใจนี้ใน git history (2026-08-08) เป็นจุดเริ่มต้น
*/
const SPRITE_ZOOM = 1

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
/*
  auto-rotate — โชว์มุมหมุนครั้งเดียวตอนเปิดกล่องนี้ครั้งแรก ไม่ทำซ้ำทุกครั้งที่สลับตัวละคร
  (จะแย่งความสนใจตอนอ่าน stats ข้าง ๆ — CB opinion-board 2026-08-08 ชี้ไว้ชัด) จบแล้วกลับ
  ท่านิ่งอัตโนมัติ ไม่ค้างหมุนตลอด และหยุดทันทีถ้าผู้เล่นแตะ/ลาก/กดปุ่มเอง — ไม่ต้องมีปุ่ม
  pause แยก (WCAG 2.2.2 กำหนดไว้กับ motion ที่ค้างเกิน 5 วิ; รอบนี้จบใน ~3.4 วิ และหยุดเองเสมอ)
  ผู้เล่นที่ตั้ง prefers-reduced-motion ไม่ได้เห็นเลย
*/
const AUTO_ROTATE_MS = 3400

export function CharacterPreview({ character }: CharacterPreviewProps) {
  const [shown, setShown] = useState(character)
  const [swapping, setSwapping] = useState(false)
  const [frame, setFrame] = useState(0)
  const [turn, setTurn] = useState(0)
  const [dragging, setDragging] = useState(false)
  // jsdom (เทสต์) และเบราว์เซอร์เก่าบางตัวไม่มี matchMedia — ไม่มีก็ถือว่าไม่ได้ขอ reduced motion
  const [autoRotating, setAutoRotating] = useState(
    () =>
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const dragRef = useRef<{ pointerId: number; lastX: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  /*
    Fullscreen — ใช้ helper เดิมจาก battleViewport.ts (มี isFullscreenSupported/graceful
    fallback อยู่แล้ว ไม่ต้องเขียนใหม่) แต่กล่องนี้ไม่ใช่ battle เลยเพิ่ม 2 อย่างที่ battle
    ไม่ต้องมี:
    - ปุ่ม exit ที่มองเห็นได้ในแอป (battle fullscreen ไม่มี พึ่ง native Escape/gesture อย่างเดียว
      ซึ่ง CB opinion-board ชี้ว่าอาจทำผู้เล่นติดอยู่ในโหมดนี้โดยไม่รู้ทางออก)
    - กันไม่ให้ Escape ตอนออกจาก fullscreen ไปโดนตัวจับ Escape ระดับ window ของ
      useModalA11y (ปิด modal ทำเนียบวีรชนทั้งกล่องไปด้วยโดยไม่ตั้งใจ) — ดักที่ capture phase
      บน element นี้เองแล้ว stopPropagation เฉพาะตอน fullscreen ใช้งานอยู่เท่านั้น
  */
  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const stopEscapeFromReachingModal = (event: KeyboardEvent) => {
      if (event.key === 'Escape') event.stopPropagation()
    }
    window.addEventListener('keydown', stopEscapeFromReachingModal, { capture: true })
    return () =>
      window.removeEventListener('keydown', stopEscapeFromReachingModal, { capture: true })
  }, [isFullscreen])

  const toggleFullscreen = () => {
    if (isFullscreen) {
      void exitBattleFullscreen()
    } else if (stageRef.current) {
      void requestBattleFullscreen(stageRef.current)
    }
  }

  // เดินรอบเดียวตอน mount แล้วปิดตัวเองกลับท่านิ่ง — ไม่ผูกกับ shown.id ตั้งใจ (สลับตัวละคร
  // ไม่เรียกซ้ำ) ต้องมี autoRotating ใน deps จริง ๆ (ไม่ใช่แค่กัน lint) — onPointerDown/
  // onKeyDown สั่ง setAutoRotating(false) กลางคันได้ ถ้าไม่มีใน deps effect จะไม่ re-run
  // เพื่อ cleanup rAF loop เดิม กลายเป็นหมุนต่อทับกับที่ผู้เล่นลากเอง (ขัดกับ WCAG 2.2.2
  // ที่ต้องหยุดทันทีเมื่อผู้เล่นโต้ตอบ)
  useEffect(() => {
    if (!autoRotating) return
    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      if (elapsed >= AUTO_ROTATE_MS) {
        setTurn(0)
        setAutoRotating(false)
        return
      }
      setTurn((elapsed / AUTO_ROTATE_MS) * 360)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoRotating])

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

  const accent = {
    '--hero-accent': shown.model.accent,
    '--sprite-zoom': SPRITE_ZOOM,
  } as React.CSSProperties
  const normalizedTurn = ((turn % 360) + 360) % 360
  const turnIndex = Math.round(normalizedTurn / 45) % sequence.turnUrls.length
  const showingTurnaround = dragging || Math.abs(turn) > 0.5

  const endTurn = () => {
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div className={styles.stage} style={accent} ref={stageRef} data-fullscreen={isFullscreen}>
      <span className={styles.glow} aria-hidden="true" />

      <span className={styles.mandala} aria-hidden="true">
        <svg viewBox="0 0 300 100" fill="none">
          <ellipse cx="150" cy="50" rx="146" ry="46" stroke="currentColor" strokeOpacity="0.4" />
          <ellipse
            cx="150"
            cy="50"
            rx="118"
            ry="36"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeDasharray="9 13"
          />
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
          setAutoRotating(false)
          if (event.key === 'ArrowLeft') setTurn((value) => value - 45)
          if (event.key === 'ArrowRight') setTurn((value) => value + 45)
          if (event.key === 'Home') setTurn(0)
        }}
        onPointerDown={(event) => {
          setAutoRotating(false)
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

      {isFullscreenSupported() ? (
        <button
          type="button"
          className={styles.fullscreenToggle}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'ออกจากเต็มจอ' : 'ดูแบบเต็มจอ'}
          title={isFullscreen ? 'ออกจากเต็มจอ' : 'ดูแบบเต็มจอ'}
        >
          {isFullscreen ? '⤢' : '⛶'}
        </button>
      ) : null}

      <div className={styles.nameplate}>
        <span className={styles.plateName}>{shown.name}</span>
        <span className={styles.plateEpithet}>{shown.epithet}</span>
      </div>
    </div>
  )
}
