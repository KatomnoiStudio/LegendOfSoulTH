import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import {
  ERLANG_SKILL_2_AURA_FRAMES,
  ERLANG_SKILL_2_HOUND_FRAMES,
} from '../../game/battleSpriteSequences'
import { runtimeToWorldXZ } from '../../game/realtimeBattle/battleCoordinates'
import { getBattleTexture } from '../../game/realtimeBattle/battleAssets'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { BattleEffectEvent } from '../../game/realtimeBattle/types'

const CAST_MS = 600
const AURA_MS = 630
const HOUND_MS = 660

export function ErlangHoundSkillEffect({
  runtime,
  event,
}: {
  runtime: RealtimeBattleRuntime
  event: BattleEffectEvent
}) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    const state = runtime.getState()
    const elapsed = state.elapsedMs - event.createdAtMs
    const origin = runtimeToWorldXZ(event.position, state.stage)
    const mesh = meshRef.current
    if (!mesh) return

    mesh.visible = elapsed >= CAST_MS && elapsed < event.durationMs
    if (!mesh.visible) return

    if (elapsed < CAST_MS + AURA_MS) {
      const progress = Math.max(0, Math.min(0.999, (elapsed - CAST_MS) / AURA_MS))
      const frame = Math.floor(progress * ERLANG_SKILL_2_AURA_FRAMES.length)
      mesh.position.set(origin.x, 1.35, origin.z)
      if (materialRef.current) {
        materialRef.current.map = getBattleTexture(ERLANG_SKILL_2_AURA_FRAMES[frame])
      }
      return
    }

    const progress = Math.max(0, Math.min(0.999, (elapsed - CAST_MS - AURA_MS) / HOUND_MS))
    const frame = Math.floor(progress * ERLANG_SKILL_2_HOUND_FRAMES.length)
    const target = state.enemies.find((enemy) => enemy.state !== 'dead' && enemy.hp > 0)
    const targetWorld = target ? runtimeToWorldXZ(target.position, state.stage) : origin
    mesh.position.set(
      origin.x + (targetWorld.x - origin.x) * progress,
      1.35,
      origin.z + (targetWorld.z - origin.z) * progress,
    )
    if (materialRef.current) {
      materialRef.current.map = getBattleTexture(ERLANG_SKILL_2_HOUND_FRAMES[frame])
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-0.12, 0, 0]}>
      <planeGeometry args={[3.4, 2.72]} />
      <meshBasicMaterial ref={materialRef} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
