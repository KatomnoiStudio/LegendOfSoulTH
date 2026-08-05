import { Suspense, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { getCharacter } from '../../game/characters'
import { publicUrl } from '../../lib/publicUrl'
import { SLOT_INDEXES, SLOT_TRANSFORM, normalizeTeam, type TeamSlots } from '../../game/team'
import { ArenaSlotRing } from './ArenaSlotRing'
import { CharacterModel } from './CharacterModel'
import styles from './LobbyScene.module.css'

/**
 * ฉาก Lobby แบบ 2.5D — กล้องเพอร์สเปกทีฟมองเฉียงลงมาในมุมคงที่
 * (ผู้เล่นหมุนกล้องเองไม่ได้ มีเพียงการโยกตามเมาส์เล็กน้อยเพื่อให้รู้สึกมีความลึก)
 */

interface LobbySceneProps {
  /** ผังทีมของผู้เล่น 4 ช่อง — null คือช่องว่าง */
  teamSlots: TeamSlots
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/**
 * จุดที่กล้องเล็ง และตำแหน่งฐานของกล้อง
 *
 * ค่า y ของ LOOK_AT คุมว่าระนาบพื้น (y=0) ไปตกที่ความสูงเท่าไรของจอ
 * ลานพื้นในภาพพื้นหลังอยู่ราว 78–85% จากขอบบน จึงเล็งที่ 1.6
 * ทำให้เท้าตัวละครสล็อตข้างอยู่ที่ ~77% และสล็อตกลาง (อยู่ใกล้กล้องกว่า) ~85%
 * คือยืนบนลานพอดีแทนที่จะลอยอยู่กลางอากาศ
 */
const LOOK_AT: [number, number, number] = [0, 1.6, 0]
const CAM_BASE: [number, number, number] = [0, 3.75, 8.4]

/**
 * สวิตช์เปิด-ปิดการแสดงวงแหวนและโมเดลตัวละครในลานประลอง
 *
 * ตอนนี้ปิดไว้ตามที่ตกลง — ลอบบี้เหลือแต่ฉากวัดเปล่า ๆ
 * ไฟล์ ArenaSlotRing.tsx และ CharacterModel.tsx ยังอยู่ครบ ไม่ได้ลบ
 * เปลี่ยนเป็น true เมื่อไหร่ ทุกอย่างกลับมาเหมือนเดิมทันที
 */
const SHOW_ARENA_SLOTS = false

// url('/ui/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_TEMPLE_STYLE: CSSProperties = {
  ['--bg-temple' as string]: `url(${publicUrl('ui/thai/thai-temple-lobby.webp')})`,
}

const EMBERS = [
  { left: '18%', delay: '0s', duration: '9s' },
  { left: '24%', delay: '-4s', duration: '11s' },
  { left: '76%', delay: '-2s', duration: '10s' },
  { left: '82%', delay: '-6s', duration: '12s' },
]

export function LobbyScene({ teamSlots, selectedId, onSelect }: LobbySceneProps) {
  const team = normalizeTeam(teamSlots)
  const [webglAvailable] = useState(() => WebGL.isWebGL2Available())
  const [contextLost, setContextLost] = useState(false)

  if (!webglAvailable) {
    return (
      <div className={styles.scene} style={BG_TEMPLE_STYLE}>
        <div className={styles.fallback}>เบราว์เซอร์นี้ไม่รองรับ WebGL2 — ไม่สามารถแสดงฉาก 3D ได้</div>
      </div>
    )
  }

  return (
    <div className={styles.scene} style={BG_TEMPLE_STYLE}>
      {contextLost ? (
        <div className={styles.fallback}>การ์ดจอขาดการเชื่อมต่อ — กำลังลองใหม่ ลองรีเฟรชหน้าถ้ายังไม่กลับมา</div>
      ) : null}
      <Canvas
        className={styles.canvas}
        shadows
        dpr={[1, 2]}
        // วัดขนาดผืนผ้าใบจาก offsetWidth/offsetHeight — เสถียรกว่า getBoundingClientRect() เมื่อ layout อยู่ระหว่าง reflow
        resize={{ offsetSize: true }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: CAM_BASE, fov: 32, near: 0.1, far: 60 }}
        // คลิกพื้นที่ว่าง = ยกเลิกการเลือก
        onPointerMissed={() => onSelect(null)}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            console.error('[LobbyScene] WebGL context lost')
            setContextLost(true)
          })
          gl.domElement.addEventListener('webglcontextrestored', () => {
            setContextLost(false)
          })
        }}
      >
        <Suspense fallback={null}>
          <CameraRig />
          <Lighting />
          {/*
            วนจากช่องทั้ง 4 ไม่ใช่จากรายชื่อตัวละครทั้งเกม
            วงแหวนจึงขึ้นครบ 4 วงเสมอ ส่วนโมเดลขึ้นเฉพาะช่องที่ผู้เล่นจัดไว้
          */}
          {SHOW_ARENA_SLOTS && SLOT_INDEXES.map((index) => {
            const transform = SLOT_TRANSFORM[index]
            const character = getCharacter(team[index])

            return (
              <group key={index}>
                <ArenaSlotRing
                  transform={transform}
                  filled={character !== null}
                  phase={index * 1.6}
                />
                {character ? (
                  <CharacterModel
                    character={character}
                    transform={transform}
                    isSelected={selectedId === character.id}
                    onSelect={onSelect}
                  />
                ) : null}
              </group>
            )
          })}
        </Suspense>
      </Canvas>

      <div className={styles.embers} aria-hidden="true">
        {EMBERS.map((e) => (
          <span
            key={e.left}
            className={styles.ember}
            style={{ left: e.left, animationDelay: e.delay, animationDuration: e.duration }}
          />
        ))}
      </div>
      <div className={styles.vignette} aria-hidden="true" />
    </div>
  )
}

/**
 * ล็อกกล้องไว้ที่มุมเฉียงคงที่
 * - ปรับระยะถอยหลังอัตโนมัติเมื่อจอแคบ เพื่อให้เห็นนักรบครบทั้ง 3 คน
 * - โยกตามเมาส์เล็กน้อย (ปิดอัตโนมัติเมื่อผู้ใช้ตั้งค่า prefers-reduced-motion)
 */
function CameraRig() {
  const { camera, size } = useThree()
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useFrame((state, delta) => {
    const cam = camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)

    // จอแนวตั้ง/แคบ → ถอยกล้องออกและยกสูงขึ้นเล็กน้อย
    const pullback = aspect < 1 ? 4.6 : aspect < 1.5 ? 2.0 : 0
    const targetX = CAM_BASE[0] + (reduced.current ? 0 : state.pointer.x * 0.42)
    const targetY = CAM_BASE[1] + pullback * 0.18 + (reduced.current ? 0 : state.pointer.y * 0.22)
    const targetZ = CAM_BASE[2] + pullback

    const k = Math.min(1, delta * 3.2)
    cam.position.x += (targetX - cam.position.x) * k
    cam.position.y += (targetY - cam.position.y) * k
    cam.position.z += (targetZ - cam.position.z) * k
    cam.lookAt(LOOK_AT[0], LOOK_AT[1], LOOK_AT[2])
  })

  return null
}

/** แสงของฉาก: ฟ้า-พื้น + คีย์ไลท์มีเงา + ริมไลท์เย็นด้านหลัง */
function Lighting() {
  return (
    <group>
      <hemisphereLight args={['#8fa3ff', '#161a2c', 0.75]} />
      <ambientLight intensity={0.28} />

      <directionalLight
        position={[4.5, 8.5, 5.5]}
        intensity={1.7}
        color="#fff0d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0009}
      />

      {/* ริมไลท์จากด้านหลังให้ตัวละครมีขอบเรืองแสง */}
      <directionalLight position={[-5, 4.5, -6]} intensity={1.1} color="#6d8cff" />
      {/* ไฟเสริมด้านหน้าให้ใบหน้าไม่มืดเกินไป */}
      <pointLight position={[0, 2.4, 5]} intensity={12} distance={16} decay={2} color="#b9c9ff" />
    </group>
  )
}
