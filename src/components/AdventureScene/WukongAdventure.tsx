import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { projectToWalkableArea, type Point } from '../../game/adventure/movement'
import { ROSTER, type Character } from '../../game/characters'
import { SCENE_WIDTH, SCENE_HEIGHT } from '../../game/sceneDimensions'
import { getWalkKit } from '../../game/walkKits'
import {
  selectNormalAttackPreviewAnimation,
  type BattleAnimationId,
} from '../../game/battleSpriteSequences'
import { TEMPLE_LOBBY_BG } from '../../game/backgroundAssets'
import { publicUrl } from '../../lib/publicUrl'
import styles from './WukongAdventure.module.css'

// url('/ui/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_TEMPLE_STYLE: CSSProperties = {
  ['--bg-temple' as string]: `url(${TEMPLE_LOBBY_BG})`,
}

const WALK_SPEED = 215
const RUN_SPEED = 345
type ErlangNormalAttackId = Extract<BattleAnimationId, 'attack-1' | 'attack-2' | 'attack-3'>

const ERLANG_NORMAL_ATTACKS: Record<
  ErlangNormalAttackId,
  { prefix: string; frameCount: number; frameDuration: number }
> = {
  'attack-1': {
    prefix: publicUrl('characters/erlang-shen-attack-v1'),
    frameCount: 18,
    frameDuration: 60,
  },
  'attack-2': {
    prefix: publicUrl('characters/erlang-shen-normal-attack-v2'),
    frameCount: 8,
    frameDuration: 90,
  },
  'attack-3': {
    prefix: publicUrl('characters/erlang-shen-normal-attack-v3-final'),
    frameCount: 8,
    frameDuration: 90,
  },
}

/**
 * เพดาน commit ของ React state (ไม่ใช่เพดาน physics) — 60fps เป็นค่ามาตรฐานสากลที่ยึดได้จริง
 * (baseline ของงานภาพเคลื่อนไหว/เกมทั่วไป, ตรงกับสมมติฐานพื้นฐานของ requestAnimationFrame เอง)
 *
 * physics ยังคำนวณทุกเฟรมเนทีฟของจอเสมอ (ผ่าน ref ไม่ผ่าน state) ตัวเลขนี้จำกัดแค่ "commit
 * ขึ้นจอกี่ครั้ง/วิ" — จอ 120Hz/144Hz จะ re-render ไม่เกิน 60 ครั้ง/วิเหมือนจอ 60Hz ทั่วไป
 * เพราะสไปรต์เดินเป็นเฟรมขั้นบันได (step) ไม่ใช่ interpolation ต่อเนื่อง re-render ถี่กว่านี้
 * ไม่ได้ให้ภาพลื่นขึ้นจริง มีแต่เปลืองซีพียู/แบตเปล่า ๆ
 */
const TARGET_COMMIT_HZ = 60
const COMMIT_INTERVAL_MS = 1000 / TARGET_COMMIT_HZ

const DEPTH_TOP = 530
const DEPTH_BOTTOM = 790

/**
 * สไปรต์หงอคงเป็น side-view เดียว (หันขวา, ซ้ายพลิกกระจก) ไม่มีมุมหน้า/หลัง/เฉียงจริง —
 * ทิศที่มีผลต่อภาพจึงเหลือแค่ซ้าย-ขวา ต่างจากทิศเดิน 8 ทิศเต็มที่ระบบฟิสิกส์ยังรองรับอยู่
 * (WALKABLE_AREA/velocity ยังเดินได้ทุกมุมเหมือนเดิม อันนี้กระทบแค่ "เลือกภาพไหนมาแสดง")
 */
type Facing = 'left' | 'right'
const FACINGS: Facing[] = ['left', 'right']
const FACING_LABEL: Record<Facing, string> = { left: 'ซ้าย', right: 'ขวา' }
const PRELOADED_IMAGES = new Map<string, HTMLImageElement>()

async function preload(urls: string[]): Promise<boolean> {
  const results = await Promise.all(
    urls.map(
      (url) =>
        new Promise<boolean>((resolve) => {
          const cached = PRELOADED_IMAGES.get(url)
          if (cached?.complete && cached.naturalWidth > 0) {
            resolve(true)
            return
          }
          const image = new Image()
          // Retain the decoded element for the lifetime of the page. Vite serves
          // dev assets with revalidation, so dropping this reference can make the
          // visible <img> reload a frame while the animation is already running.
          PRELOADED_IMAGES.set(url, image)
          image.addEventListener(
            'load',
            () => {
              void (async () => {
                try {
                  await image.decode()
                  resolve(true)
                } catch {
                  resolve(false)
                }
              })()
            },
            { once: true },
          )
          image.addEventListener('error', () => resolve(false), { once: true })
          image.src = url
        }),
    ),
  )
  return results.every(Boolean)
}

/**
 * โหมดของฉาก — ใช้ระบบเดินชุดเดียวกันทั้งหมด ต่างกันแค่บรรยากาศและข้อความ
 * 'trial'     ลานฝึกวายุ — ปัจจุบันไม่มีจุดเรียกใช้ใน src/ (ปุ่ม "เริ่มการผจญภัย" เปิด
 *             GameExplorationSession/useExploration แทน — ระบบกริด 4 ทิศคนละตัวกับที่นี่)
 *             เก็บโหมดนี้ไว้เป็นค่า default เผื่อ mount ตรง ๆ ในอนาคต ไม่ใช่ dead code ที่ลืมลบ
 * 'moonlight' เดินชมจันทร์ (เข้าจาก LobbyPage mount ตรง ๆ) — ฉากเดียวกันแต่ย้อมโทนคืนเดือนเพ็ญ
 */
export type AdventureMode = 'trial' | 'moonlight'

const MODE_COPY: Record<
  AdventureMode,
  {
    eyebrow: string
    heading: string
    caption: string
    place: string
    placeEn: string
  }
> = {
  trial: {
    eyebrow: 'บทฝึกที่ ๑ · วิถีราชาวานร',
    heading: 'ลานฝึกวายุ',
    caption: 'ควบคุมซุนหงอคงอย่างอิสระในฉาก 2.5D',
    place: 'ลานฝึกวายุ',
    placeEn: 'WIND TRIAL COURT',
  },
  moonlight: {
    eyebrow: 'ยามสาม · คืนเดือนเพ็ญ',
    heading: 'เดินชมจันทร์',
    caption: 'พาขุนพลออกเดินเล่นรอบลานวัดใต้แสงจันทร์',
    place: 'ลานพระจันทร์',
    placeEn: 'MOONLIT COURTYARD',
  },
}

interface WukongAdventureProps {
  /** โหมด moonlight เปิดค้างในลอบบี้ ไม่มีปุ่มออก จึงไม่ต้องส่งมา */
  onExit?: () => void
  mode?: AdventureMode
  /** ตัวละครที่ผู้เล่นครอบครอง — ใช้เป็นตัวเลือกในแถบเลือกขุนพล */
  characters: Character[]
  /**
   * ตัวที่จะพาเดิน — มาจากปุ่ม "เดินชมจันทร์" ในโปรไฟล์ (ดู ProfileModal.tsx)
   * ซึ่งเป็นทางเดียวที่เปลี่ยนตัวได้ ไม่ส่งมา (หรือส่ง null) ก็ใช้ตัวแรกที่มีชุดเฟรมเดิน
   */
  activeCharacterId?: string | null
  /** ลำดับคำขอเล่นพรีวิวโจมตีจาก HUD ของ Lobby */
  attackPreviewRequestId?: number
}

export function WukongAdventure({
  onExit,
  mode = 'trial',
  characters,
  activeCharacterId,
  attackPreviewRequestId = 0,
}: WukongAdventureProps) {
  const copy = MODE_COPY[mode]
  // Migrating local accounts can briefly have no owned characters. This is
  // Wukong's trial, so keep a safe playable fallback instead of crashing.
  const ownedOrFallback = characters.length > 0 ? characters : [ROSTER[0]]

  /*
     แสดงเฉพาะตัวที่มีชุดเฟรมเดินจริง
     ตัวที่ยังไม่มีจะไม่ขึ้นในแถบเลือกเลย ดีกว่าให้เลือกแล้วเลื่อนไปแบบขาไม่ขยับ
     เมื่อวาดเฟรมเดินเพิ่มใน src/game/walkKits.ts ตัวนั้นจะโผล่มาเองทันที
  */
  const availableCharacters = ownedOrFallback.filter(
    (entry) => getWalkKit(entry.model.kind).walkPrefix !== null,
  )

  /*
     ตัวเริ่มต้นคือตัวแรกที่มีชุดเฟรมเดิน ส่วนการ "เปลี่ยนตัว" ทำได้จากปุ่ม
     "เดินชมจันทร์" ในโปรไฟล์ทางเดียว (ส่งมาทาง activeCharacterId) — เดิมมีแถบเลือก
     ลอยอยู่กลางฉากลอบบี้ด้วย แต่ถอดออกแล้วเพราะบังฉากและซ้ำซ้อนกับปุ่มในโปรไฟล์
  */
  const [internalActiveId] = useState(availableCharacters[0]?.id ?? '')
  // ค่าจากภายนอก (activeCharacterId) ชนะถ้ามี — ดู comment ของ prop ด้านบน
  const activeId = activeCharacterId ?? internalActiveId
  // undefined ได้ ถ้าผู้เล่นมีแต่ตัวที่ยังไม่มีเฟรมเดิน — จัดการหลัง hook ทั้งหมด
  const active: Character | undefined =
    availableCharacters.find((entry) => entry.id === activeId) ?? availableCharacters[0]

  // ใช้ชุดเฟรมของซุนหงอคงเป็นตัวยืนพื้น เพื่อให้ hook ด้านล่างมีค่าคงที่เสมอ
  const kit = getWalkKit((active ?? ROSTER[0]).model.kind)
  const walkPrefix = kit.walkPrefix ?? getWalkKit(ROSTER[0].model.kind).walkPrefix!
  const walkFrameCount = kit.walkFrameCount
  const sceneRef = useRef<HTMLElement>(null)
  const pressedRef = useRef(new Set<string>())
  const virtualRef = useRef(new Set<string>())
  const positionRef = useRef<Point>({ x: 800, y: 650 })
  const velocityRef = useRef<Point>({ x: 0, y: 0 })
  const targetRef = useRef<Point | null>(null)
  const directionRef = useRef<Facing>('right')
  const frameRef = useRef(0)
  const distanceRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const lastCommitRef = useRef(0)
  const [view, setView] = useState({
    x: 800,
    y: 650,
    direction: 'right' as Facing,
    frame: 0,
    moving: false,
    running: false,
  })
  const [destination, setDestination] = useState<Point | null>(null)
  const [dustTick, setDustTick] = useState(0)
  const [sceneSize, setSceneSize] = useState({ width: SCENE_WIDTH, height: SCENE_HEIGHT })
  const [attackFrame, setAttackFrame] = useState<number | null>(null)
  const [attackPlaybackId, setAttackPlaybackId] = useState(0)
  const [attackAssetsReady, setAttackAssetsReady] = useState(false)
  const [attackAnimationId, setAttackAnimationId] = useState<ErlangNormalAttackId>('attack-1')
  const attackAnimation = ERLANG_NORMAL_ATTACKS[attackAnimationId]

  // ฉากนี้ไม่ได้อยู่บนเวทีคงที่ 1600x900 อีกแล้ว (GameViewport ตัด letterbox ออก) —
  // ต้องวัดขนาดจริงของ .scene เองแล้วแม็ปพิกัดโลก (SCENE_WIDTH/HEIGHT) เป็นพิกัดจอจริง
  // ด้วยสูตรเดียวกับที่ CSS background-size:cover ใช้กับภาพพื้นหลัง (ย่อ/ขยายเท่ากันทั้งสองแกน
  // แล้ว crop ส่วนเกิน) ตำแหน่งเดินจึงตรงกับลานวัดในภาพเสมอไม่ว่าอัตราส่วนจอจะเป็นเท่าไหร่
  useLayoutEffect(() => {
    const el = sceneRef.current
    if (!el) return
    // วัด sync ทันทีตอน mount กัน ResizeObserver callback แรก (async เสมอ) ทำให้ตัวละคร
    // กระพริบไปโผล่ตำแหน่งเดิม (world coords ดิบ) ก่อนขยับมาตำแหน่งจริงในเฟรมถัดไป
    const rect = el.getBoundingClientRect()
    setSceneSize({ width: rect.width, height: rect.height })
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSceneSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
    // active?.id (ไม่ใช่ []): ตอน mount แรก active อาจยังเป็น undefined (ยังไม่มีขุนพลที่มีชุดเฟรมเดิน)
    // ซึ่ง branch นั้นไม่มี ref เลย พอ active มีค่าทีหลังในเซสชันเดียวกัน (component ไม่ unmount)
    // ต้อง re-run effect นี้เพื่อ attach ref เข้ากับ <section> จริงที่เพิ่งขึ้น
  }, [active?.id])

  // โหลดเฟรมของตัวที่กำลังใช้ล่วงหน้า เพื่อไม่ให้ภาพกระพริบตอนเริ่มเดิน
  const allFrames = useMemo(() => {
    const walk = kit.walkPrefix
      ? FACINGS.flatMap((direction) =>
          Array.from(
            { length: walkFrameCount },
            (_, frame) =>
              `${kit.walkPrefix}-${kit.usesMirroredSideView ? 'right' : direction}-${frame}.webp`,
          ),
        )
      : []
    // ไม่พรีโหลดเฟรมหันทิศ (turnPrefix) แล้ว — สไปรต์ idle ชุดใหม่หายใจได้ทุกทิศอยู่แล้ว
    // (ดูคอมเมนต์ที่ spriteUrl ด้านล่าง) เฟรมหันทิศเลยไม่ได้ใช้แสดงผลในฉากนี้อีกต่อไป
    const idle = Array.from(
      { length: kit.idleCount },
      (_, frame) => `${kit.idlePrefix}-${frame}.webp`,
    )
    return [...walk, ...idle]
  }, [kit, walkFrameCount])

  useEffect(() => {
    void preload(allFrames)
  }, [allFrames])

  const attackFrames = useMemo(() => {
    if (active?.model.kind !== 'spear-warrior') return []
    return Object.values(ERLANG_NORMAL_ATTACKS).flatMap(({ prefix, frameCount }) =>
      Array.from({ length: frameCount }, (_, frame) => `${prefix}-${frame}.webp`),
    )
  }, [active?.model.kind])

  useEffect(() => {
    let cancelled = false
    setAttackAssetsReady(false)
    void (async () => {
      const ready = await preload(attackFrames)
      if (!cancelled) setAttackAssetsReady(ready)
    })()
    return () => {
      cancelled = true
    }
  }, [attackFrames])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      /*
        ไม่แตะคีย์ที่ผู้เล่นกำลังพิมพ์ลงช่องกรอก

        ตัวเดินนี้ถูก mount ค้างไว้ตลอดเวลาที่อยู่ในลอบบี้ และ listener อยู่บน window
        คีย์จึงถึงที่นี่แม้โฟกัสอยู่ในช่องกรอกของโมดัลที่เปิดทับอยู่ ผลคือพิมพ์ w/a/s/d
        แล้วตัวละครหลังโมดัลเดิน และลูกศร/เว้นวรรคถูก preventDefault จนเลื่อนเคอร์เซอร์
        ในช่องกรอกไม่ได้ (ช่องคูปองในตั้งค่า และช่องรหัสเพื่อน) — ช่องแชทโลกกันปัญหานี้
        ด้วย stopPropagation ของตัวเอง ที่นี่กันให้ครบทุกช่องในที่เดียวแทน
      */
      const target = event.target as HTMLElement | null
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault()
      }
      pressedRef.current.add(event.key.toLowerCase())
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
          event.key.toLowerCase(),
        )
      ) {
        setAttackFrame(null)
        setAttackPlaybackId(0)
        targetRef.current = null
        setDestination(null)
      }
    }
    const up = (event: KeyboardEvent) => pressedRef.current.delete(event.key.toLowerCase())
    const clear = () => {
      pressedRef.current.clear()
      virtualRef.current.clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useEffect(() => {
    let animationId = 0
    const animate = (time: number) => {
      const previous = lastTimeRef.current ?? time
      const delta = Math.min((time - previous) / 1000, 0.04)
      lastTimeRef.current = time

      const keys = new Set([...pressedRef.current, ...virtualRef.current])
      let inputX = 0
      let inputY = 0
      if (keys.has('a') || keys.has('arrowleft')) inputX -= 1
      if (keys.has('d') || keys.has('arrowright')) inputX += 1
      if (keys.has('w') || keys.has('arrowup')) inputY -= 1
      if (keys.has('s') || keys.has('arrowdown')) inputY += 1

      const position = positionRef.current
      if (inputX === 0 && inputY === 0 && targetRef.current) {
        const dx = targetRef.current.x - position.x
        const dy = targetRef.current.y - position.y
        const distance = Math.hypot(dx, dy)
        if (distance <= 12) {
          targetRef.current = null
          setDestination(null)
        } else {
          inputX = dx / distance
          inputY = dy / distance
        }
      }

      const magnitude = Math.hypot(inputX, inputY)
      if (magnitude > 0) {
        inputX /= magnitude
        inputY /= magnitude
      }

      const running = keys.has('shift')
      const desiredSpeed = running ? RUN_SPEED : WALK_SPEED
      const response = magnitude > 0 ? 1 - Math.exp(-18 * delta) : 1 - Math.exp(-24 * delta)
      const velocity = velocityRef.current
      velocity.x += (inputX * desiredSpeed - velocity.x) * response
      velocity.y += (inputY * desiredSpeed - velocity.y) * response
      if (Math.abs(velocity.x) < 0.5) velocity.x = 0
      if (Math.abs(velocity.y) < 0.5) velocity.y = 0

      const oldX = position.x
      const oldY = position.y
      const proposed = {
        x: position.x + velocity.x * delta,
        y: position.y + velocity.y * delta,
      }
      const resolved = projectToWalkableArea(proposed)
      position.x = resolved.x
      position.y = resolved.y

      // Remove only the velocity that pushes into a wall. Keeping the tangent
      // component makes movement slide naturally along diagonal boundaries.
      const correctionX = proposed.x - resolved.x
      const correctionY = proposed.y - resolved.y
      const correctionLength = Math.hypot(correctionX, correctionY)
      if (correctionLength > 0.001) {
        const normalX = correctionX / correctionLength
        const normalY = correctionY / correctionLength
        const intoWall = velocity.x * normalX + velocity.y * normalY
        if (intoWall > 0) {
          velocity.x -= normalX * intoWall
          velocity.y -= normalY * intoWall
        }
      }
      const travelled = Math.hypot(position.x - oldX, position.y - oldY)
      const moving = travelled > 0.05

      // เดินขึ้น/ลงตรง ๆ (inputX ~0) คงทิศหันเดิมไว้ — สไปรต์ไม่มีมุมหน้า/หลังให้เลือก
      if (Math.abs(inputX) > 0.01) {
        directionRef.current = inputX < 0 ? 'left' : 'right'
      }

      if (moving) {
        distanceRef.current += travelled
        // ลดจาก 28/34 เดิม — ชุดสไปรต์ใหม่มีแค่ 8 คีย์เฟรมต่อรอบก้าว (ต่างจากเดิม) ท่าเปลี่ยน
        // ต่อเฟรมกระโดดแรงกว่า ถ้าคง stride เดิมขาจะดูขยับช้า ต้องสลับเฟรมถี่ขึ้นให้ทันความรู้สึก
        const stride = running ? kit.walkFrameStride.running : kit.walkFrameStride.walking
        frameRef.current = Math.floor(distanceRef.current / stride) % walkFrameCount
      } else {
        frameRef.current = Math.floor(time / kit.idleFrameDuration) % kit.idleCount
      }

      // ยืนนิ่งไม่ขยับ ตำแหน่ง/เฟรมก็ไม่เปลี่ยนทุก tick (เฟรม idle ขยับแค่ทุก 170ms ไม่ใช่ 60fps) —
      // คืน object เดิม (ไม่ใช่ตัวใหม่) เมื่อค่าไม่เปลี่ยนจริง ให้ React ข้าม re-render รอบนั้นไปเลย
      // (setState แบบ functional: ถ้าคืนค่าเดิมด้วย Object.is React จะไม่ re-render)
      // ไม่งั้นทั้ง component จะ re-render รัว ๆ ตามอัตราเฟรมเนทีฟของจอตลอดเวลาที่อยู่ Lobby แม้ผู้เล่น AFK
      //
      // ส่วนตอนกำลังเดิน (ค่าเปลี่ยนจริงทุกเฟรม) ยัง cap commit ไว้ที่ TARGET_COMMIT_HZ อยู่ดี —
      // จอ 120Hz/144Hz ไม่จำเป็นต้อง re-render ถี่กว่าจอ 60Hz เพราะสไปรต์เดินเป็นเฟรมขั้นบันได
      // (ดูคอมเมนต์ที่ค่าคงที่ด้านบนไฟล์) physics ใน ref ด้านบนยังคำนวณทุกเฟรมเนทีฟเหมือนเดิม
      // แค่ "ขึ้นจอ" ถูกจำกัดอัตราเท่านั้น ไม่กระทบความแม่นยำของตำแหน่ง/ชนกำแพง
      if (time - lastCommitRef.current >= COMMIT_INTERVAL_MS) {
        lastCommitRef.current = time
        setView((previousView) => {
          const next = {
            x: position.x,
            y: position.y,
            direction: directionRef.current,
            frame: frameRef.current,
            moving,
            running,
          }
          const unchanged =
            previousView.x === next.x &&
            previousView.y === next.y &&
            previousView.direction === next.direction &&
            previousView.frame === next.frame &&
            previousView.moving === next.moving &&
            previousView.running === next.running
          return unchanged ? previousView : next
        })
      }
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [
    kit.idleCount,
    kit.idleFrameDuration,
    kit.walkFrameStride.running,
    kit.walkFrameStride.walking,
    walkFrameCount,
  ])

  useEffect(() => {
    if (!view.moving) return
    const timer = window.setInterval(
      () => setDustTick((value) => value + 1),
      view.running ? 105 : 165,
    )
    return () => window.clearInterval(timer)
  }, [view.moving, view.running])

  useEffect(() => {
    if (
      attackPreviewRequestId === 0 ||
      active?.model.kind !== 'spear-warrior' ||
      !attackAssetsReady
    )
      return
    pressedRef.current.clear()
    virtualRef.current.clear()
    velocityRef.current = { x: 0, y: 0 }
    targetRef.current = null
    setDestination(null)
    // Preview cycles 1 -> 2 -> 3 so every animation is directly testable.
    // Gameplay separately keeps the equal-probability randomized selector.
    setAttackAnimationId(selectNormalAttackPreviewAnimation(attackPreviewRequestId))
    setAttackPlaybackId(attackPreviewRequestId)
  }, [active?.model.kind, attackAssetsReady, attackPreviewRequestId])

  useEffect(() => {
    if (attackPlaybackId === 0) return

    let currentFrame = 0
    setAttackFrame(0)
    const timer = window.setInterval(() => {
      currentFrame += 1
      if (currentFrame >= attackAnimation.frameCount) {
        window.clearInterval(timer)
        setAttackFrame(null)
        setAttackPlaybackId(0)
        return
      }
      // Sequential counter by design: never derive the frame from elapsed time,
      // because a delayed render must not skip a sprite number.
      setAttackFrame(currentFrame)
    }, attackAnimation.frameDuration)
    return () => window.clearInterval(timer)
  }, [attackAnimation, attackPlaybackId])

  const courtyardScale = Math.max(sceneSize.width / SCENE_WIDTH, sceneSize.height / SCENE_HEIGHT)
  const courtyardOffsetX = (sceneSize.width - SCENE_WIDTH * courtyardScale) / 2
  const courtyardOffsetY = (sceneSize.height - SCENE_HEIGHT * courtyardScale) / 2
  const worldToScreen = useCallback(
    (point: Point) => ({
      x: courtyardOffsetX + point.x * courtyardScale,
      y: courtyardOffsetY + point.y * courtyardScale,
    }),
    [courtyardScale, courtyardOffsetX, courtyardOffsetY],
  )

  const onFloorPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return
      const bounds = sceneRef.current?.getBoundingClientRect()
      if (!bounds) return
      const target = projectToWalkableArea({
        x: (event.clientX - bounds.left - courtyardOffsetX) / courtyardScale,
        y: (event.clientY - bounds.top - courtyardOffsetY) / courtyardScale,
      })
      setAttackFrame(null)
      setAttackPlaybackId(0)
      targetRef.current = target
      setDestination(target)
    },
    [courtyardScale, courtyardOffsetX, courtyardOffsetY],
  )

  // ชื่อ `pressed` ไม่ใช่ `active` — `active` ด้านบนคือตัวละครที่กำลังแสดงอยู่ คนละเรื่องกัน
  const setVirtualDirection = (key: string, pressed: boolean) => {
    if (pressed) {
      setAttackFrame(null)
      setAttackPlaybackId(0)
      virtualRef.current.add(key)
      targetRef.current = null
      setDestination(null)
    } else {
      virtualRef.current.delete(key)
    }
  }

  const depthProgress = Math.min(1, Math.max(0, (view.y - DEPTH_TOP) / (DEPTH_BOTTOM - DEPTH_TOP)))
  const perspectiveScale = 0.8 + depthProgress * 0.24
  /*
     สไปรต์หงอคงชุดใหม่เป็น side-view เดียว (หันขวา) ไม่มีมุมหน้า/หลังจริง — เฟรม idle
     (หายใจ) จึงใช้ได้ทุกทิศเหมือนกัน ต่างกันแค่ทิศฝั่งซ้ายต้องพลิกกระจกด้วย CSS ตอนแสดงผล
     (เดิมมีเงื่อนไข "หันหน้า (down) เท่านั้นถึงหายใจ ทิศอื่นใช้ turnUrl ภาพนิ่ง" ซึ่งเป็น
     ของชุดสไปรต์เก่าที่มีมุมจริงแยกทิศ ไม่ตรงกับชุดนี้แล้ว — ตัดทิ้ง ยืนนิ่งหายใจได้ทุกทิศ)
     idleFrame ไม่คูณ 3 แบบเดิม (ของเดิมกระโดดข้ามเฟรมเพื่อสุ่มตัวอย่างจากชุด 24 เฟรม
     ชุดใหม่มีแค่ 8 เฟรมพอดีเรียงลำดับการหายใจอยู่แล้ว คูณ 3 จะทำให้ลำดับสลับมั่ว)
  */
  const idleFrame = view.frame % kit.idleCount
  const spriteMirrored =
    (kit.usesMirroredSideView && view.direction === 'left') ||
    (!kit.usesMirroredSideView && !view.moving && view.direction === 'left')
  const walkDirection = kit.usesMirroredSideView ? 'right' : view.direction
  const isAttackPreview = active.model.kind === 'spear-warrior' && attackFrame !== null

  // เดิน = เฟรมเดินตามทิศ (เบคพลิกกระจกไว้แล้วในไฟล์), ยืนนิ่ง = เฟรม idle หายใจทุกทิศ
  const spriteUrl = isAttackPreview
    ? `${attackAnimation.prefix}-${attackFrame}.webp`
    : view.moving
      ? `${walkPrefix}-${walkDirection}-${view.frame}.webp`
      : `${kit.idlePrefix}-${idleFrame}.webp`
  const spriteStyle = spriteMirrored ? { ['--sprite-mirror' as string]: -1 } : undefined

  const actorScreenPos = worldToScreen(view)
  const actorStyle = {
    '--actor-x': `${actorScreenPos.x}px`,
    '--actor-y': `${actorScreenPos.y}px`,
    '--actor-scale': perspectiveScale,
    zIndex: Math.round(view.y),
  } as CSSProperties
  const destinationScreenPos = destination ? worldToScreen(destination) : null

  // ผู้เล่นมีตัวละครแต่ยังไม่มีตัวไหนที่มีชุดเฟรมเดิน
  if (!active) {
    // โหมดชมจันทร์อยู่ในหน้าหลักตลอดเวลา — ไม่มีขุนพลเดินได้ก็แค่ไม่ต้องแสดงอะไรเลย
    // (การ์ดเต็มจอแบบเดิมเหมาะกับโหมดผจญภัยที่เป็นฉากแยกต่างหากเท่านั้น)
    if (mode === 'moonlight') return null

    return (
      <section
        className={`${styles.scene} ${styles.moonlight}`}
        aria-label={copy.heading}
        style={BG_TEMPLE_STYLE}
      >
        <div className={styles.emptyCast}>
          <strong>ยังไม่มีขุนพลที่ออกเดินได้</strong>
          <p>ขุนพลที่ท่านมีอยู่ยังไม่มีชุดท่าเดิน โปรดรอการอัญเชิญขุนพลที่พร้อมออกเดิน</p>
          <button type="button" onClick={() => onExit?.()}>
            กลับลานประลอง
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sceneRef}
      className={`${styles.scene} ${mode === 'moonlight' ? styles.moonlight : ''}`}
      aria-label={`${copy.heading} — ควบคุม${active.name}`}
      onPointerDown={onFloorPointerDown}
      style={BG_TEMPLE_STYLE}
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      {mode === 'moonlight' ? <div className={styles.moonBeam} aria-hidden="true" /> : null}

      {mode === 'moonlight' ? null : (
        <header className={styles.hud}>
          <div className={styles.chapter}>
            <span className={styles.eyebrow}>{copy.eyebrow}</span>
            <strong>{copy.heading}</strong>
            <span>{copy.caption}</span>
          </div>
          <div className={styles.status}>
            <span className={view.moving ? styles.activeDot : styles.idleDot} />
            <div>
              <small>สถานะ</small>
              <b>{view.moving ? (view.running ? 'วิ่ง' : 'เดิน') : 'พร้อมรบ'}</b>
            </div>
            <i />
            <div>
              <small>ทิศ</small>
              <b>{FACING_LABEL[view.direction]}</b>
            </div>
          </div>
          <button className={styles.exitButton} type="button" onClick={() => onExit?.()}>
            <span aria-hidden="true">‹</span> กลับลานประลอง
          </button>
        </header>
      )}

      <div className={styles.locationTitle} aria-hidden="true">
        <span />
        <b>{copy.place}</b>
        <small>{copy.placeEn}</small>
      </div>

      {destinationScreenPos ? (
        <div
          className={styles.destination}
          style={{ left: destinationScreenPos.x, top: destinationScreenPos.y }}
          aria-hidden="true"
        >
          <span />
        </div>
      ) : null}

      <div className={styles.actor} style={actorStyle} aria-label={active.name}>
        <div className={styles.shadow} />
        {view.moving ? (
          <div className={styles.dust} key={dustTick} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        ) : null}
        <img
          className={styles.sprite}
          src={spriteUrl}
          alt={active.name}
          draggable={false}
          style={spriteStyle}
        />
        {mode === 'moonlight' ? null : (
          <div className={styles.nameplate}>
            <span>{active.epithet}</span>
            <strong>{active.name}</strong>
          </div>
        )}
      </div>

      {mode === 'moonlight' ? null : (
        <div className={styles.helpBar}>
          <span>
            <kbd>WASD</kbd>
            <kbd>↑↓←→</kbd> เคลื่อนที่
          </span>
          <i />
          <span>
            <kbd>SHIFT</kbd> วิ่ง
          </span>
          <i />
          <span>
            <kbd className={styles.mouse}>◉</kbd> คลิกพื้นเพื่อเดิน
          </span>
        </div>
      )}

      <div className={styles.mobilePad} aria-label="ปุ่มควบคุมทิศทาง">
        <HoldButton
          label="ขึ้น"
          symbol="▲"
          keyName="w"
          className={styles.up}
          onChange={setVirtualDirection}
        />
        <HoldButton
          label="ซ้าย"
          symbol="◀"
          keyName="a"
          className={styles.left}
          onChange={setVirtualDirection}
        />
        <span className={styles.padCenter}>◆</span>
        <HoldButton
          label="ขวา"
          symbol="▶"
          keyName="d"
          className={styles.right}
          onChange={setVirtualDirection}
        />
        <HoldButton
          label="ลง"
          symbol="▼"
          keyName="s"
          className={styles.down}
          onChange={setVirtualDirection}
        />
      </div>
    </section>
  )
}

interface HoldButtonProps {
  label: string
  symbol: string
  keyName: string
  className: string
  onChange: (key: string, active: boolean) => void
}

function HoldButton({ label, symbol, keyName, className, onChange }: HoldButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        onChange(keyName, true)
      }}
      onPointerUp={() => onChange(keyName, false)}
      onPointerCancel={() => onChange(keyName, false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {symbol}
    </button>
  )
}
