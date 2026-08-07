import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import {
  getBattleSpriteSet,
  resolveBattleFrames,
  type BattleAnimationId,
} from '../../game/battleSpriteSequences'
import type { CharacterModelKind } from '../../game/characters'
import { getBattleTexture } from '../../game/realtimeBattle/battleAssets'
import {
  runtimeDepthNormalized,
  runtimeToWorldXZ,
} from '../../game/realtimeBattle/battleCoordinates'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { EntityState, RealtimeBattleEntity } from '../../game/realtimeBattle/types'

/**
 * ตัวละครหนึ่งตัวในห้องต่อสู้ — ระนาบภาพ PNG ยืนบนพื้น
 *
 * หัวใจของไฟล์นี้คือ "ไม่มี state ของ React เลย": ตำแหน่งและเฟรมภาพถูกเขียนลง
 * object ของ three.js ตรง ๆ ทุกเฟรมผ่าน ref โดยอ่านค่าจาก runtime (§8)
 * ถ้าเปลี่ยนมาใช้ setState ที่นี่ จะเกิด re-render 60 ครั้งต่อวินาทีต่อหนึ่งตัวละคร
 */

/** อัตราส่วนของภาพตัวละคร (กว้าง:สูง) — ชุดเฟรมทุกตัวใช้สัดส่วนเดียวกัน */
const SPRITE_ASPECT = 1.2508
const SPRITE_HEIGHT = 1.6

interface EntitySpriteProps {
  runtime: RealtimeBattleRuntime
  entityId: string
  kind: CharacterModelKind
  accent: string
}

/** สถานะของหน่วย → ชุดเฟรมที่ต้องเล่น */
function animationForState(state: EntityState): BattleAnimationId {
  switch (state) {
    case 'walk':
      return 'walk'
    case 'attack':
      return 'attack-1'
    case 'skill':
      return 'skill-1'
    case 'hit':
      return 'hit'
    // Knockdown/GetUp (§3.8.4) — ยืมแอนิเมชัน hit/idle ไปก่อน ยังไม่มีเฟรมภาพเฉพาะ
    // (ponytail: อัปเกรดตอนมีชุดเฟรมล้ม/ลุกจริงจากทีมอาร์ต ไม่ใช่ตอนนี้)
    case 'knockdown':
      return 'hit'
    case 'getUp':
      return 'idle'
    case 'dead':
      return 'death'
    case 'idle':
      return 'idle'
  }
}

function findEntity(runtime: RealtimeBattleRuntime, entityId: string): RealtimeBattleEntity | null {
  const state = runtime.getState()
  if (entityId === state.player.id) return state.player
  return state.enemies.find((enemy) => enemy.id === entityId) ?? null
}

export function EntitySprite({ runtime, entityId, kind, accent }: EntitySpriteProps) {
  const { camera } = useThree()
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const shadow = useRef<Mesh>(null)
  const worldPos = useRef(new Vector3())
  const spriteSet = useMemo(() => getBattleSpriteSet(kind), [kind])

  /** เฟรมเริ่มของแอนิเมชันที่ไม่วน — ต้องรู้ว่าเริ่มเล่นตอนไหนถึงจะเล่นจบแล้วค้างได้ */
  const animationStartMs = useRef(0)
  const currentAnimation = useRef<BattleAnimationId>('idle')

  useFrame(() => {
    const entity = findEntity(runtime, entityId)
    if (!group.current || !mesh.current) return

    if (!entity) {
      group.current.visible = false
      return
    }
    group.current.visible = true

    const stage = runtime.getState().stage
    const world = runtimeToWorldXZ(entity.position, stage)
    group.current.position.set(world.x, 0, world.z)

    // ตัวที่อยู่หน้ากว่า (runtime.y สูงกว่า) วาดทับตัวหลัง
    const depthOrder = Math.round(runtimeDepthNormalized(entity.position.y, stage) * 1000)
    group.current.renderOrder = depthOrder
    mesh.current.renderOrder = depthOrder
    if (shadow.current) shadow.current.renderOrder = depthOrder - 1

    const animationId = animationForState(entity.state)
    const elapsedMs = runtime.getState().elapsedMs
    if (animationId !== currentAnimation.current) {
      currentAnimation.current = animationId
      animationStartMs.current = elapsedMs
    }

    const animation = spriteSet[animationId]
    const frames = resolveBattleFrames(animation, entity.facing)
    if (frames.length === 0) return

    const localSeconds = Math.max(0, elapsedMs - animationStartMs.current) / 1000
    const rawIndex = Math.floor(localSeconds * animation.rate)
    const index = animation.loop ? rawIndex % frames.length : Math.min(frames.length - 1, rawIndex)

    const texture = getBattleTexture(frames[index])
    const material = mesh.current.material as MeshBasicMaterial
    if (texture && material.map !== texture) material.map = texture

    // ตายแล้วค่อย ๆ จางหาย, โดนตีแล้ววาบสีแดง — ทั้งสองท่าไม่มีเฟรมภาพของตัวเอง
    material.opacity = entity.state === 'dead' ? 0.35 : 1
    material.color.set(entity.state === 'hit' ? '#ff9d9d' : '#ffffff')

    if (shadow.current) {
      shadow.current.visible = entity.state !== 'dead'
    }

    // หันสไปรต์เข้าหากล้องแนวนอน — อ่านชัดที่มุมกล้อง ~30°
    mesh.current.getWorldPosition(worldPos.current)
    const dx = camera.position.x - worldPos.current.x
    const dz = camera.position.z - worldPos.current.z
    mesh.current.rotation.set(0, Math.atan2(dx, dz), 0)
  })

  return (
    <group ref={group}>
      {/* เงาใต้เท้า ช่วยให้เห็นว่าตัวละครยืนตรงไหนจริงบนพื้น */}
      <mesh ref={shadow} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={mesh} position={[0, SPRITE_HEIGHT / 2, 0]}>
        <planeGeometry args={[SPRITE_HEIGHT * SPRITE_ASPECT, SPRITE_HEIGHT]} />
        <meshBasicMaterial
          transparent
          alphaTest={0.025}
          depthWrite={false}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
