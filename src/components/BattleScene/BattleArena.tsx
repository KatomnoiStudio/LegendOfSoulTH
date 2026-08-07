import { useEffect, useMemo } from 'react'
import { DoubleSide } from 'three'
import { BATTLE_DEPTH_LANE_COUNT } from '../../game/realtimeBattle/battleCoordinates'
import { getBattleTexture } from '../../game/realtimeBattle/battleAssets'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import { BattleCamera } from './BattleCamera'
import { EnemyBattleSprite } from './EnemyBattleSprite'
import { PlayerBattleSprite } from './PlayerBattleSprite'

/**
 * สนามต่อสู้ 2.5D side-down — พื้นลาน + แถบ depth + ฉากหลังด้านไกล
 *
 * พิกัด runtime.y = แกน depth (หน้า–หลัง) แมปเป็น world Z
 * กล้องมองจากด้านหน้า (+Z) ไม่ใช่ top-down
 */

const EDGE_THICKNESS = 0.06

export function BattleArena({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const state = runtime.getState()
  const stage = state.stage

  const worldWidth = stage.width * WORLD_SCALE
  const worldDepth = stage.height * WORLD_SCALE

  const backdropTexture = useMemo(() => {
    const source = stage.backgroundAsset ? getBattleTexture(stage.backgroundAsset) : null
    if (!source) return null
    const cropped = source.clone()
    cropped.needsUpdate = true
    cropped.repeat.set(1, 1)
    cropped.offset.set(0, 0)
    return cropped
  }, [stage.backgroundAsset])

  useEffect(() => {
    if (!backdropTexture) return
    return () => backdropTexture.dispose()
  }, [backdropTexture])

  const depthLaneZs = useMemo(() => {
    const lanes: number[] = []
    for (let i = 1; i < BATTLE_DEPTH_LANE_COUNT; i += 1) {
      const t = i / BATTLE_DEPTH_LANE_COUNT
      lanes.push(-worldDepth / 2 + t * worldDepth)
    }
    return lanes
  }, [worldDepth])

  return (
    <group>
      <BattleCamera runtime={runtime} />

      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#c8d4ff', '#2a2038', 0.75]} />
      <directionalLight position={[3, 8, 5]} intensity={1.05} color="#fff0d0" />

      {backdropTexture ? (
        <mesh position={[0, worldDepth * 0.22, -worldDepth / 2 - 0.35]}>
          <planeGeometry args={[worldWidth * 1.35, worldDepth * 0.85]} />
          <meshBasicMaterial map={backdropTexture} toneMapped={false} />
        </mesh>
      ) : null}

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[worldWidth, worldDepth]} />
        <meshBasicMaterial color="#3d3258" side={DoubleSide} />
      </mesh>

      {depthLaneZs.map((z, index) => (
        <mesh key={`lane-${index}`} position={[0, 0.003, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[worldWidth * 0.96, 0.028]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? '#5a4d7a' : '#4a3f68'}
            transparent
            opacity={0.55}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[worldDepth * 0.12, worldDepth * 0.13, 48]} />
        <meshBasicMaterial
          color="#ffd765"
          transparent
          opacity={0.2}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      <mesh position={[-worldWidth / 2, 0.02, 0]}>
        <boxGeometry args={[EDGE_THICKNESS, EDGE_THICKNESS, worldDepth]} />
        <meshBasicMaterial color="#ffd765" transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <mesh position={[worldWidth / 2, 0.02, 0]}>
        <boxGeometry args={[EDGE_THICKNESS, EDGE_THICKNESS, worldDepth]} />
        <meshBasicMaterial color="#ffd765" transparent opacity={0.4} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0.02, worldDepth / 2]}>
        <boxGeometry args={[worldWidth, EDGE_THICKNESS, EDGE_THICKNESS]} />
        <meshBasicMaterial color="#ffd765" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, -worldDepth / 2]}>
        <boxGeometry args={[worldWidth, EDGE_THICKNESS, EDGE_THICKNESS]} />
        <meshBasicMaterial color="#ffd765" transparent opacity={0.35} toneMapped={false} />
      </mesh>

      <PlayerBattleSprite runtime={runtime} />
      {state.enemies.map((enemy) => (
        <EnemyBattleSprite key={enemy.id} runtime={runtime} enemy={enemy} />
      ))}
    </group>
  )
}
