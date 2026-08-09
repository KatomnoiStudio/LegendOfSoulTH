import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import { ERLANG_SKILL_1_STRIKE_FRAMES } from '../../game/battleSpriteSequences'
import { getBattleTexture } from '../../game/realtimeBattle/battleAssets'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { BattleEffectEvent } from '../../game/realtimeBattle/types'

export function SkillLightningEffect({
  runtime,
  event,
}: {
  runtime: RealtimeBattleRuntime
  event: BattleEffectEvent
}) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const stage = runtime.getState().stage

  useFrame(() => {
    const elapsed = runtime.getState().elapsedMs - event.createdAtMs
    const progress = Math.max(0, Math.min(0.999, elapsed / event.durationMs))
    const frame = Math.floor(progress * ERLANG_SKILL_1_STRIKE_FRAMES.length)
    if (meshRef.current) meshRef.current.visible = elapsed >= 0 && elapsed < event.durationMs
    if (materialRef.current)
      materialRef.current.map = getBattleTexture(ERLANG_SKILL_1_STRIKE_FRAMES[frame])
  })

  return (
    <mesh
      ref={meshRef}
      position={[
        (event.position.x - stage.width / 2) * WORLD_SCALE,
        1.15,
        (event.position.y - stage.height / 2) * WORLD_SCALE,
      ]}
      rotation={[-0.12, 0, 0]}
    >
      <planeGeometry args={[2.5, 2]} />
      <meshBasicMaterial ref={materialRef} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
