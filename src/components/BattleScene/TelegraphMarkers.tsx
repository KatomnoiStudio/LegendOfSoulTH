import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { runtimeToWorldXZ } from '../../game/realtimeBattle/battleCoordinates'

/**
 * Ground telegraph markers — required P4 feedback layer (presentation only).
 */
export function TelegraphMarkers({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const mesh = useRef<Mesh>(null)

  useFrame(() => {
    if (!mesh.current) return
    const stage = runtime.getState().stage
    const markers = runtime.getTelegraphMarkers()
    mesh.current.visible = markers.length > 0
    if (markers.length === 0) return

    const marker = markers[0]
    const world = runtimeToWorldXZ(marker.position, stage)
    mesh.current.position.set(world.x, 0.02, world.z)
    const pulse = 0.85 + Math.sin(runtime.getState().elapsedMs * 0.012) * 0.15
    mesh.current.scale.setScalar(pulse)
  })

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.22, 0.38, 32]} />
      <meshBasicMaterial
        color="#ff4d6d"
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
