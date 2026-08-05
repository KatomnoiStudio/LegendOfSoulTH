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
import { ROSTER, type Character } from '../../game/characters'
import { getWalkKit } from '../../game/walkKits'
import { publicUrl } from '../../lib/publicUrl'
import styles from './WukongAdventure.module.css'

// url('/ui/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_TEMPLE_STYLE: CSSProperties = {
  ['--bg-temple' as string]: `url(${publicUrl('ui/thai/thai-temple-lobby.webp')})`,
}

const WORLD_WIDTH = 1600
const WORLD_HEIGHT = 900
const FRAME_COUNT = 8
const WALK_SPEED = 215
const RUN_SPEED = 345

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

type Direction =
  | 'down'
  | 'down-right'
  | 'right'
  | 'up-right'
  | 'up'
  | 'up-left'
  | 'left'
  | 'down-left'

type Point = { x: number; y: number }

/**
 * Navigation mesh traced from the visible courtyard floor. The narrow top is
 * the temple stairway: the player can approach the door, while the two upper
 * wings remain solid walls instead of invisible walkable scenery.
 */
const WALKABLE_AREA: Point[] = [
  { x: 735, y: 530 },
  { x: 865, y: 530 },
  { x: 1015, y: 642 },
  { x: 1425, y: 662 },
  { x: 1490, y: 715 },
  { x: 1490, y: 790 },
  { x: 110, y: 790 },
  { x: 110, y: 715 },
  { x: 175, y: 662 },
  { x: 585, y: 642 },
]

const DEPTH_TOP = 530
const DEPTH_BOTTOM = 790

const DIRECTIONS: Direction[] = [
  'down',
  'down-right',
  'right',
  'up-right',
  'up',
  'up-left',
  'left',
  'down-left',
]

const TURN_INDEX: Record<Direction, number> = {
  down: 0,
  'down-right': 1,
  right: 2,
  'up-right': 3,
  up: 4,
  'up-left': 5,
  left: 6,
  'down-left': 7,
}

const DIRECTION_LABEL: Record<Direction, string> = {
  down: 'หน้า',
  'down-right': 'เฉียงขวาล่าง',
  right: 'ขวา',
  'up-right': 'เฉียงขวาบน',
  up: 'หลัง',
  'up-left': 'เฉียงซ้ายบน',
  left: 'ซ้าย',
  'down-left': 'เฉียงซ้ายล่าง',
}

function directionFromVector(x: number, y: number): Direction {
  const angle = Math.atan2(y, x)
  const octant = Math.round(angle / (Math.PI / 4))
  const lookup: Record<number, Direction> = {
    0: 'right',
    1: 'down-right',
    2: 'down',
    3: 'down-left',
    4: 'left',
    [-4]: 'left',
    [-3]: 'up-left',
    [-2]: 'up',
    [-1]: 'up-right',
  }
  return lookup[octant] ?? 'down'
}

function isInsideWalkableArea(point: Point) {
  let inside = false
  for (let index = 0, previous = WALKABLE_AREA.length - 1; index < WALKABLE_AREA.length; previous = index++) {
    const currentPoint = WALKABLE_AREA[index]
    const previousPoint = WALKABLE_AREA[previous]
    const crossesRay =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (crossesRay) inside = !inside
  }
  return inside
}

function closestPointOnSegment(point: Point, start: Point, end: Point) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  if (lengthSquared === 0) return start
  const amount = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
        lengthSquared,
    ),
  )
  return { x: start.x + segmentX * amount, y: start.y + segmentY * amount }
}

function projectToWalkableArea(point: Point) {
  if (isInsideWalkableArea(point)) return point

  let closest = WALKABLE_AREA[0]
  let closestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < WALKABLE_AREA.length; index++) {
    const candidate = closestPointOnSegment(
      point,
      WALKABLE_AREA[index],
      WALKABLE_AREA[(index + 1) % WALKABLE_AREA.length],
    )
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }
  return closest
}

function preload(urls: string[]) {
  urls.forEach((url) => {
    const image = new Image()
    image.src = url
  })
}

/**
 * โหมดของฉาก — ใช้ระบบเดินชุดเดียวกันทั้งหมด ต่างกันแค่บรรยากาศและข้อความ
 * 'trial'     ลานฝึกวายุ (เข้าจากปุ่มเริ่มการผจญภัย)
 * 'moonlight' เดินชมจันทร์ (เข้าจากโปรไฟล์) — ฉากเดียวกันแต่ย้อมโทนคืนเดือนเพ็ญ
 */
export type AdventureMode = 'trial' | 'moonlight'

const MODE_COPY: Record<AdventureMode, {
  eyebrow: string
  heading: string
  caption: string
  place: string
  placeEn: string
}> = {
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
}

export function WukongAdventure({ onExit, mode = 'trial', characters }: WukongAdventureProps) {
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

  // โหมดชมจันทร์เลือกขุนพลได้ ส่วนลานฝึกยังเป็นบทของซุนหงอคงตามเนื้อเรื่อง
  const canPickCharacter = mode === 'moonlight' && availableCharacters.length > 1
  const [activeId, setActiveId] = useState(availableCharacters[0]?.id ?? '')
  // undefined ได้ ถ้าผู้เล่นมีแต่ตัวที่ยังไม่มีเฟรมเดิน — จัดการหลัง hook ทั้งหมด
  const active: Character | undefined =
    availableCharacters.find((entry) => entry.id === activeId) ?? availableCharacters[0]

  // ใช้ชุดเฟรมของซุนหงอคงเป็นตัวยืนพื้น เพื่อให้ hook ด้านล่างมีค่าคงที่เสมอ
  const kit = getWalkKit((active ?? ROSTER[0]).model.kind)
  const walkPrefix = kit.walkPrefix ?? getWalkKit(ROSTER[0].model.kind).walkPrefix!
  const sceneRef = useRef<HTMLElement>(null)
  const pressedRef = useRef(new Set<string>())
  const virtualRef = useRef(new Set<string>())
  const positionRef = useRef<Point>({ x: 800, y: 650 })
  const velocityRef = useRef<Point>({ x: 0, y: 0 })
  const targetRef = useRef<Point | null>(null)
  const directionRef = useRef<Direction>('down')
  const frameRef = useRef(0)
  const distanceRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const lastCommitRef = useRef(0)
  const [view, setView] = useState({
    x: 800,
    y: 650,
    direction: 'down' as Direction,
    frame: 0,
    moving: false,
    running: false,
  })
  const [destination, setDestination] = useState<Point | null>(null)
  const [dustTick, setDustTick] = useState(0)
  const [sceneSize, setSceneSize] = useState({ width: WORLD_WIDTH, height: WORLD_HEIGHT })

  // ฉากนี้ไม่ได้อยู่บนเวทีคงที่ 1600x900 อีกแล้ว (GameViewport ตัด letterbox ออก) —
  // ต้องวัดขนาดจริงของ .scene เองแล้วแม็ปพิกัดโลก (WORLD_WIDTH/HEIGHT) เป็นพิกัดจอจริง
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
      ? DIRECTIONS.flatMap((direction) =>
          Array.from(
            { length: FRAME_COUNT },
            (_, frame) => `${kit.walkPrefix}-${direction}-${frame}.webp`,
          ),
        )
      : []
    const turn = Array.from(
      { length: FRAME_COUNT },
      (_, frame) => `${kit.turnPrefix}-${frame}.webp`,
    )
    const idle = Array.from(
      { length: kit.idleCount },
      (_, frame) => `${kit.idlePrefix}-${frame}.webp`,
    )
    return [...walk, ...turn, ...idle]
  }, [kit])

  useEffect(() => preload(allFrames), [allFrames])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault()
      }
      pressedRef.current.add(event.key.toLowerCase())
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
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

      if (magnitude > 0) {
        directionRef.current = directionFromVector(inputX, inputY)
      }

      if (moving) {
        distanceRef.current += travelled
        const stride = running ? 28 : 34
        frameRef.current = Math.floor(distanceRef.current / stride) % FRAME_COUNT
      } else {
        frameRef.current = Math.floor(time / 170) % FRAME_COUNT
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
  }, [])

  useEffect(() => {
    if (!view.moving) return
    const timer = window.setInterval(() => setDustTick((value) => value + 1), view.running ? 105 : 165)
    return () => window.clearInterval(timer)
  }, [view.moving, view.running])

  const courtyardScale = Math.max(sceneSize.width / WORLD_WIDTH, sceneSize.height / WORLD_HEIGHT)
  const courtyardOffsetX = (sceneSize.width - WORLD_WIDTH * courtyardScale) / 2
  const courtyardOffsetY = (sceneSize.height - WORLD_HEIGHT * courtyardScale) / 2
  const worldToScreen = useCallback(
    (point: Point) => ({
      x: courtyardOffsetX + point.x * courtyardScale,
      y: courtyardOffsetY + point.y * courtyardScale,
    }),
    [courtyardScale, courtyardOffsetX, courtyardOffsetY],
  )

  const onFloorPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    const bounds = sceneRef.current?.getBoundingClientRect()
    if (!bounds) return
    const target = projectToWalkableArea({
      x: (event.clientX - bounds.left - courtyardOffsetX) / courtyardScale,
      y: (event.clientY - bounds.top - courtyardOffsetY) / courtyardScale,
    })
    targetRef.current = target
    setDestination(target)
  }, [courtyardScale, courtyardOffsetX, courtyardOffsetY])

  const setVirtualDirection = (key: string, active: boolean) => {
    if (active) {
      virtualRef.current.add(key)
      targetRef.current = null
      setDestination(null)
    } else {
      virtualRef.current.delete(key)
    }
  }

  const depthProgress = Math.min(1, Math.max(0, (view.y - DEPTH_TOP) / (DEPTH_BOTTOM - DEPTH_TOP)))
  const perspectiveScale = 0.8 + depthProgress * 0.24
  const turnUrl = `${kit.turnPrefix}-${TURN_INDEX[view.direction]}.webp`
  const idleFrame = view.direction === 'down' ? (view.frame * 3) % kit.idleCount : null

  // เดิน = เฟรมเดินตามทิศ, ยืนหันหน้า = เฟรม idle, ยืนหันทิศอื่น = เฟรมหันทิศ
  const spriteUrl = view.moving
    ? `${walkPrefix}-${view.direction}-${view.frame}.webp`
    : idleFrame !== null
      ? `${kit.idlePrefix}-${idleFrame}.webp`
      : turnUrl

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
      <section className={`${styles.scene} ${styles.moonlight}`} aria-label={copy.heading} style={BG_TEMPLE_STYLE}>
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
            <div><small>สถานะ</small><b>{view.moving ? (view.running ? 'วิ่ง' : 'เดิน') : 'พร้อมรบ'}</b></div>
            <i />
            <div><small>ทิศ</small><b>{DIRECTION_LABEL[view.direction]}</b></div>
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
            <i /><i /><i /><i />
          </div>
        ) : null}
        <img className={styles.sprite} src={spriteUrl} alt={active.name} draggable={false} />
        {mode === 'moonlight' ? null : (
          <div className={styles.nameplate}>
            <span>{active.epithet}</span>
            <strong>{active.name}</strong>
          </div>
        )}
      </div>

      {canPickCharacter ? (
        <div className={styles.castBar} role="group" aria-label="เลือกขุนพลที่จะพาเดิน">
          {availableCharacters.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={styles.castButton}
              aria-pressed={entry.id === active.id}
              aria-label={`พา${entry.name}เดิน`}
              onClick={() => setActiveId(entry.id)}
            >
              <img src={entry.model.spriteUrl} alt="" draggable={false} />
              <span className={styles.castName}>{entry.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {mode === 'moonlight' ? null : (
        <div className={styles.helpBar}>
          <span><kbd>WASD</kbd><kbd>↑↓←→</kbd> เคลื่อนที่</span>
          <i />
          <span><kbd>SHIFT</kbd> วิ่ง</span>
          <i />
          <span><kbd className={styles.mouse}>◉</kbd> คลิกพื้นเพื่อเดิน</span>
        </div>
      )}

      <div className={styles.mobilePad} aria-label="ปุ่มควบคุมทิศทาง">
        <HoldButton label="ขึ้น" symbol="▲" keyName="w" className={styles.up} onChange={setVirtualDirection} />
        <HoldButton label="ซ้าย" symbol="◀" keyName="a" className={styles.left} onChange={setVirtualDirection} />
        <span className={styles.padCenter}>◆</span>
        <HoldButton label="ขวา" symbol="▶" keyName="d" className={styles.right} onChange={setVirtualDirection} />
        <HoldButton label="ลง" symbol="▼" keyName="s" className={styles.down} onChange={setVirtualDirection} />
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
