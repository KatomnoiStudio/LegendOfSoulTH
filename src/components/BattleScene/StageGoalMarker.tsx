import { DoubleSide } from 'three'
import { runtimeToWorldXZ } from '../../game/realtimeBattle/battleCoordinates'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'

/** Visible arena goals for stage types whose target is positional. Static meshes need no frame state. */
export function StageGoalMarker({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const stage = runtime.getState().stage
  const target =
    stage.stageType === 'defend'
      ? stage.defend?.position
      : stage.stageType === 'chase'
        ? stage.chase?.targetPosition
        : null

  if (!target) return null

  const world = runtimeToWorldXZ(target, stage)
  const color = stage.stageType === 'defend' ? '#67d6a0' : '#ffd765'

  return (
    <group position={[world.x, 0.015, world.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.54, 0.72, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.72}
          toneMapped={false}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.035, 0.12, 0.68, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.52} toneMapped={false} />
      </mesh>
    </group>
  )
}
