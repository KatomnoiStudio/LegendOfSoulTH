import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import {
  DEFAULT_COMBAT_CAMERA_CONFIG,
  type CombatCameraConfig,
} from '../../game/realtimeBattle/combatCameraConfig'
import {
  clampLookTarget,
  computeCameraPose,
  computeCameraRigLimits,
  computeCombatSpan,
  computeDesiredZoom,
  computeEnemyGroupFocus,
  computeLookTarget,
  smoothToward,
  type CameraEnemySample,
} from '../../game/realtimeBattle/combatCameraFraming'
import { runtimeToWorldXZ } from '../../game/realtimeBattle/battleCoordinates'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'

/**
 * Combat camera — elevated side / 2.5D action framing (presentation only).
 *
 * Frames the fight area between player and relevant enemies with dynamic zoom,
 * smoothing, and aspect-aware limits. Does not alter battle coordinates.
 */

export function BattleCamera({
  runtime,
  config = DEFAULT_COMBAT_CAMERA_CONFIG,
}: {
  runtime: RealtimeBattleRuntime
  config?: CombatCameraConfig
}) {
  const { camera, size } = useThree()
  const stage = runtime.getState().stage
  const zoomRef = useRef(1)
  /*
     Reused sample buffer — this fills once per rendered frame.

     Rebuilding it with `enemies.map()` allocated one sample plus one world
     vector per enemy every frame, for corpses too: `state.enemies` keeps every
     enemy the battle has ever spawned, and only the framing math downstream
     dropped the dead ones. Fill living enemies only, into slots that persist.
  */
  const samplesRef = useRef<CameraEnemySample[]>([])

  const worldWidth = stage.width * WORLD_SCALE
  const worldDepth = stage.height * WORLD_SCALE
  const aspect = size.width / Math.max(1, size.height)

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera
    if (Math.abs(cam.fov - config.fovDeg) > 0.01) {
      cam.fov = config.fovDeg
      cam.updateProjectionMatrix()
    }

    const state = runtime.getState()
    const playerWorld = runtimeToWorldXZ(state.player.position, stage)

    const enemySamples = samplesRef.current
    let sampleCount = 0
    let hasBoss = false
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue

      const world = runtimeToWorldXZ(enemy.position, stage)
      const slot = enemySamples[sampleCount]
      if (slot) {
        slot.world = world
        slot.hp = enemy.hp
        slot.entityType = enemy.entityType
      } else {
        enemySamples.push({ world, hp: enemy.hp, entityType: enemy.entityType })
      }
      sampleCount += 1
      if (enemy.entityType === 'boss') hasBoss = true
    }
    enemySamples.length = sampleCount

    const enemyFocus = computeEnemyGroupFocus(playerWorld, enemySamples, config)

    const lookRaw = computeLookTarget(playerWorld, enemyFocus, config)
    const combatSpan = enemyFocus
      ? computeCombatSpan(playerWorld, enemyFocus)
      : config.minCombatSpanWorld
    const desiredZoom = computeDesiredZoom(combatSpan, aspect, config, hasBoss)

    zoomRef.current = smoothToward(zoomRef.current, desiredZoom, config.zoomSmoothing, delta)

    const limits = computeCameraRigLimits(config, aspect, worldWidth, worldDepth, zoomRef.current)
    const look = clampLookTarget(lookRaw, limits)
    const pose = computeCameraPose(look, zoomRef.current, config)

    const followK = (value: number, target: number) =>
      smoothToward(value, target, config.followSmoothing, delta)

    cam.position.x = followK(cam.position.x, pose.positionX)
    cam.position.y = followK(cam.position.y, pose.positionY)
    cam.position.z = followK(cam.position.z, pose.positionZ)
    cam.lookAt(pose.lookX, pose.lookY, pose.lookZ)
  })

  return null
}
