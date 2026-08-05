import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide } from 'three'
import type { Mesh } from 'three'
import type { SlotTransform } from '../../game/team'

interface ArenaSlotRingProps {
  transform: SlotTransform
  /** ช่องนี้มีตัวละครยืนอยู่หรือไม่ — ช่องว่างจะเรืองแสงเชิญชวนมากกว่า */
  filled: boolean
  /** ให้วงแหวนของแต่ละช่องหมุนไม่พร้อมกัน */
  phase: number
}

/**
 * วงแหวนประจำช่องในลานประลอง
 *
 * ขึ้นครบทั้ง 4 ช่องเสมอ ไม่ว่าช่องนั้นจะมีตัวละครยืนหรือไม่
 * (ต่างจากวงเลือกตัวละครใน CharacterModel ซึ่งเป็นของ "ตัวละคร"
 *  วงนี้เป็นของ "ช่อง" จึงยังอยู่แม้ช่องว่าง)
 */
export function ArenaSlotRing({ transform, filled, phase }: ArenaSlotRingProps) {
  const outer = useRef<Mesh>(null)
  const inner = useRef<Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    if (outer.current) outer.current.rotation.z = t * 0.16
    if (inner.current) {
      inner.current.rotation.z = -t * 0.24
      // ช่องว่างเต้นเป็นจังหวะให้เห็นว่ายังเติมตัวละครได้
      const pulse = filled ? 1 : 1 + Math.sin(t * 1.7) * 0.045
      inner.current.scale.setScalar(pulse)
    }
  })

  const tint = filled ? '#f0c85a' : '#63c7a3'
  const outerOpacity = filled ? 0.42 : 0.5
  const innerOpacity = filled ? 0.16 : 0.3

  return (
    <group position={transform.position}>
      {/* ขอบนอก 8 เหลี่ยม — โครงแท่นยืน */}
      <mesh ref={outer} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.94, 1.06, 8, 1]} />
        <meshBasicMaterial
          color={tint}
          transparent
          opacity={outerOpacity}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      {/* วงในบาง ๆ */}
      <mesh ref={inner} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.68, 6, 1]} />
        <meshBasicMaterial
          color={tint}
          transparent
          opacity={innerOpacity}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      {/* แผ่นเรืองแสงบาง ๆ เฉพาะช่องว่าง ให้อ่านออกว่าเป็นที่ว่าง */}
      {filled ? null : (
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.94, 24]} />
          <meshBasicMaterial color={tint} transparent opacity={0.07} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
