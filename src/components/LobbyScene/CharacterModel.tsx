import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, SRGBColorSpace, TextureLoader } from 'three'
import type { Mesh, MeshBasicMaterial } from 'three'
import type { Character, ModelSpec } from '../../game/characters'
import { getSpriteSequence } from '../../game/spriteSequences'
import type { SlotTransform } from '../../game/team'

/**
 * ตัวละครหนึ่งตัวในฉาก Lobby — วาดด้วยภาพสไปรต์ที่วาดมือไว้แล้ว
 *
 * แอนิเมชันหายใจ หาง และผ้าคลุม อยู่ในเฟรมภาพเอง (ดู src/game/spriteSequences.ts)
 * ไฟล์นี้จึงมีหน้าที่แค่เล่นลำดับเฟรม จัดตำแหน่งตามช่องในทีม และรับการกด
 *
 * ── ถ้าจะเปลี่ยนไปใช้โมเดล 3D จริงในอนาคต ──────────────────
 * เพิ่มฟิลด์ modelUrl กลับเข้า ModelSpec แล้วแตกสาขาตรง <SpriteRig>
 * ส่วนโครงรอบนอก (ตำแหน่งช่อง hitbox วงเลือก hover) ใช้ซ้ำได้ทั้งหมด
 * ───────────────────────────────────────────────────────────
 */

interface CharacterModelProps {
  character: Character
  /** ตำแหน่งช่องที่ผู้เล่นจัดตัวละครนี้ไว้ (มาจากผังทีม ไม่ใช่จากตัวละคร) */
  transform: SlotTransform
  isSelected: boolean
  onSelect: (id: string) => void
}

export function CharacterModel({ character, transform, isSelected, onSelect }: CharacterModelProps) {
  const { model: spec } = character

  const ring = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [actionKey, setActionKey] = useState(0)

  // กันเคอร์เซอร์ค้างเป็นรูปมือถ้า component ถูก unmount ตอนที่ยัง hover อยู่
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  /** ให้วงแหวนของแต่ละตัวเต้นไม่พร้อมกัน โดยสุ่มจาก id แบบคงที่ */
  const phase = useMemo(() => hashToPhase(character.id), [character.id])

  useFrame((state) => {
    if (!ring.current) return
    const t = state.clock.elapsedTime + phase
    ring.current.rotation.z = t * 0.55
    ring.current.scale.setScalar(1 + Math.sin(t * 2.6) * 0.04)
  })

  return (
    <group
      position={transform.position}
      rotation={[0, transform.rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation()
        setActionKey((key) => key + 1)
        onSelect(character.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {/* hitbox โปร่งใส — ทำให้กด/แตะโดนง่ายบนมือถือ */}
      <mesh position={[0, 0.95, 0]} visible={false}>
        <boxGeometry args={[1.3, 2.1, 1.1]} />
      </mesh>

      <group scale={0.8}>
        <SpriteRig spec={spec} actionKey={actionKey} />
      </group>

      <SelectionRing ref={ring} color={spec.accent} active={isSelected} hovered={hovered} />
    </group>
  )
}

/**
 * เล่นลำดับเฟรมภาพของตัวละคร
 *
 * ใช้ระนาบสองแผ่นซ้อนกันแล้วไล่ opacity ข้ามกัน (crossfade) แทนการสลับภาพห้วน ๆ
 * ทำให้ 8 เฟรมต่อวินาทีดูลื่นกว่าที่ควรจะเป็น
 */
function SpriteRig({ spec, actionKey }: { spec: ModelSpec; actionKey: number }) {
  const config = useMemo(() => getSpriteSequence(spec.kind), [spec.kind])
  const urls = useMemo(() => [...config.idleUrls, ...config.actionUrls], [config])
  const textures = useLoader(TextureLoader, urls)
  const currentMesh = useRef<Mesh>(null)
  const nextMesh = useRef<Mesh>(null)
  const pendingAction = useRef(false)
  const manualActionStart = useRef<number | null>(null)
  const previousActionKey = useRef(actionKey)
  const phase = useMemo(() => hashToPhase(spec.kind), [spec.kind])

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
    })
  }, [textures])

  useEffect(() => {
    if (actionKey !== previousActionKey.current) {
      previousActionKey.current = actionKey
      pendingAction.current = true
    }
  }, [actionKey])

  useFrame((state) => {
    if (!currentMesh.current || !nextMesh.current) return
    const elapsed = state.clock.elapsedTime
    if (pendingAction.current) {
      manualActionStart.current = elapsed
      pendingAction.current = false
    }

    const idleOrder = config.idleUrls.map((_, index) => index)
    const actionOffset = config.idleUrls.length
    const actionOrder = config.actionOrder.map((index) => actionOffset + index)
    const actionDuration = actionOrder.length / config.actionRate
    const manualTime = manualActionStart.current === null ? Number.POSITIVE_INFINITY : elapsed - manualActionStart.current
    const automaticTime = (elapsed + phase) % config.autoPeriod
    const automaticStart = config.autoPeriod - actionDuration
    const manualActive = actionOrder.length > 0 && manualTime >= 0 && manualTime < actionDuration
    const automaticActive = actionOrder.length > 0 && automaticTime >= automaticStart
    const order = manualActive || automaticActive ? actionOrder : idleOrder
    const rate = manualActive || automaticActive ? config.actionRate : config.idleRate
    const sequenceTime = manualActive ? manualTime : automaticActive ? automaticTime - automaticStart : elapsed + phase
    const rawFrame = sequenceTime * rate
    const frameStep = Math.floor(rawFrame)
    const currentIndex = order[Math.min(order.length - 1, frameStep % order.length)]
    const nextStep = manualActive || automaticActive
      ? Math.min(order.length - 1, frameStep + 1)
      : (frameStep + 1) % order.length
    const nextIndex = order[nextStep]
    const blend = smoothstep(Math.max(0, (rawFrame - frameStep - 0.68) / 0.32))
    const currentMaterial = currentMesh.current.material as MeshBasicMaterial
    const nextMaterial = nextMesh.current.material as MeshBasicMaterial

    currentMaterial.map = textures[currentIndex]
    currentMaterial.opacity = 1 - blend
    nextMaterial.map = textures[nextIndex]
    nextMaterial.opacity = blend
  })

  return (
    <group>
      {spec.kind === 'pilgrim-monk' ? <TripitakaEffects actionKey={actionKey} /> : null}
      <group position={[0, 1.393, 0]}>
        <mesh ref={currentMesh} raycast={() => {}}>
          <planeGeometry args={[4.018, 3.213]} />
          <meshBasicMaterial map={textures[0]} transparent alphaTest={0.025} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={nextMesh} position={[0, 0, 0.004]} raycast={() => {}}>
          <planeGeometry args={[4.018, 3.213]} />
          <meshBasicMaterial map={textures[1] ?? textures[0]} transparent opacity={0} alphaTest={0.025} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/** รัศมีพุทธบารมีและคลื่นพลังฝ่ามือ — เฉพาะพระถังซัมจั๋ง */
function TripitakaEffects({ actionKey }: { actionKey: number }) {
  const aura = useRef<Mesh>(null)
  const palm = useRef<Mesh>(null)
  const waves = useRef<Mesh[]>([])
  const auraTexture = useLoader(TextureLoader, '/characters/tripitaka-buddha-aura.png')

  useEffect(() => {
    auraTexture.colorSpace = SRGBColorSpace
    auraTexture.needsUpdate = true
  }, [auraTexture])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (aura.current) {
      const pulse = 1 + Math.sin(t * 1.45) * 0.025
      aura.current.scale.setScalar(pulse)
      ;(aura.current.material as MeshBasicMaterial).opacity = 0.15 + (Math.sin(t * 1.45) + 1) * 0.045
    }
    if (palm.current) {
      const pulse = 0.86 + (Math.sin(t * 3.2) + 1) * 0.16
      palm.current.scale.setScalar(pulse)
    }
    waves.current.forEach((wave, index) => {
      if (!wave) return
      const cycle = (t * 0.52 + index / waves.current.length + actionKey * 0.13) % 1
      wave.position.x = 0.7 + cycle * 0.72
      wave.scale.set(0.55 + cycle * 1.9, 0.55 + cycle * 1.35, 1)
      ;(wave.material as MeshBasicMaterial).opacity = (1 - cycle) * 0.48
    })
  })

  return (
    <group>
      <mesh ref={aura} position={[0, 1.393, -0.025]} raycast={() => {}}>
        <planeGeometry args={[4.018, 3.213]} />
        <meshBasicMaterial map={auraTexture} transparent opacity={0.18} depthWrite={false} toneMapped={false} blending={AdditiveBlending} />
      </mesh>
      <mesh ref={palm} position={[0.7, 1.48, 0.025]} raycast={() => {}}>
        <circleGeometry args={[0.105, 32]} />
        <meshBasicMaterial color="#ffe083" transparent opacity={0.74} depthWrite={false} toneMapped={false} blending={AdditiveBlending} />
      </mesh>
      {Array.from({ length: 3 }, (_, index) => (
        <mesh key={index} ref={(node) => { if (node) waves.current[index] = node }} position={[0.7, 1.48, 0.02]} raycast={() => {}}>
          <ringGeometry args={[0.11, 0.145, 32]} />
          <meshBasicMaterial color={index === 1 ? '#ffd05a' : '#fff0a8'} transparent opacity={0} depthWrite={false} toneMapped={false} blending={AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

/** วงแหวนใต้เท้าของตัวละคร — แสดงสถานะ hover / ถูกเลือก */
function SelectionRing({
  ref,
  color,
  active,
  hovered,
}: {
  ref: React.Ref<Mesh>
  color: string
  active: boolean
  hovered: boolean
}) {
  const opacity = active ? 0.95 : hovered ? 0.5 : 0.16
  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.62, 0.78, 6, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

function smoothstep(value: number) {
  const x = Math.min(1, Math.max(0, value))
  return x * x * (3 - 2 * x)
}

/** แปลง id เป็นตัวเลข 0..2π เพื่อให้จังหวะของแต่ละตัวไม่ตรงกัน */
function hashToPhase(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000
  return (h / 1000) * Math.PI * 2
}
