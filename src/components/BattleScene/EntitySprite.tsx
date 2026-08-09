import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide } from 'three'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import {
  getBattleSpriteSet,
  toSpriteDirection,
  type BattleAnimationId,
} from '../../game/battleSpriteSequences'
import type { CharacterModelKind } from '../../game/characters'
import { getBattleTexture } from '../../game/realtimeBattle/battleAssets'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
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
const SPRITE_WIDTH = SPRITE_HEIGHT * SPRITE_ASPECT
const IDLE_PIXEL_WORLD_SIZE = SPRITE_HEIGHT / 512
const IDLE_VISIBLE_FOOT_WORLD_Y = SPRITE_HEIGHT - 480 * IDLE_PIXEL_WORLD_SIZE
const SKILL_2_CAST_PIXEL_SCALE = 370 / 454
const SKILL_2_CAST_SIZE = { width: 800, height: 640, footY: 520 }

function spriteGeometry(animationId: BattleAnimationId) {
  if (animationId !== 'skill-2') {
    return { width: SPRITE_WIDTH, height: SPRITE_HEIGHT, meshY: SPRITE_HEIGHT / 2 }
  }

  // Cast frames retain their native source pixels. One shared renderer scale
  // makes Erlang's 454 px body match Idle's 370 px body; all six frames use
  // the same X/Y root and no frame-level zoom.
  const pixelWorldSize = IDLE_PIXEL_WORLD_SIZE * SKILL_2_CAST_PIXEL_SCALE
  const width = SKILL_2_CAST_SIZE.width * pixelWorldSize
  const height = SKILL_2_CAST_SIZE.height * pixelWorldSize
  return {
    width,
    height,
    meshY: IDLE_VISIBLE_FOOT_WORLD_Y + SKILL_2_CAST_SIZE.footY * pixelWorldSize - height / 2,
  }
}

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
    case 'dash':
      return 'dash'
    case 'hit':
      return 'hit'
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
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const shadow = useRef<Mesh>(null)
  const spriteSet = useMemo(() => getBattleSpriteSet(kind), [kind])

  /** เฟรมเริ่มของแอนิเมชันที่ไม่วน — ต้องรู้ว่าเริ่มเล่นตอนไหนถึงจะเล่นจบแล้วค้างได้ */
  const animationStartMs = useRef(0)
  const currentAnimation = useRef<BattleAnimationId>('idle')

  const half = useMemo(() => {
    const state = runtime.getState()
    return { x: state.stage.width / 2, y: state.stage.height / 2 }
  }, [runtime])

  useFrame(() => {
    const entity = findEntity(runtime, entityId)
    if (!group.current || !mesh.current) return

    if (!entity) {
      group.current.visible = false
      return
    }
    group.current.visible = true

    // พิกัด runtime (x = ขวา, y = ลงล่างของจอ) → พิกัดโลกของ three.js บนระนาบ XZ
    group.current.position.set(
      (entity.position.x - half.x) * WORLD_SCALE,
      0,
      (entity.position.y - half.y) * WORLD_SCALE,
    )

    const animationId =
      entity.state === 'attack' || entity.state === 'skill'
        ? (entity.attackAnimationId ?? 'attack-1')
        : animationForState(entity.state)
    const elapsedMs = runtime.getState().elapsedMs
    if (animationId !== currentAnimation.current) {
      currentAnimation.current = animationId
      animationStartMs.current = elapsedMs
    }

    const animation = spriteSet[animationId]
    const geometry = spriteGeometry(animationId)
    mesh.current.scale.set(geometry.width / SPRITE_WIDTH, geometry.height / SPRITE_HEIGHT, 1)
    mesh.current.position.y = geometry.meshY
    const frames = animation.frames[toSpriteDirection(entity.facing)]
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

      <mesh ref={mesh} position={[0, SPRITE_HEIGHT / 2, 0]} rotation={[-Math.PI / 8, 0, 0]}>
        <planeGeometry args={[SPRITE_WIDTH, SPRITE_HEIGHT]} />
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
