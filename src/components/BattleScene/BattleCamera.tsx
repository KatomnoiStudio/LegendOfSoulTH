import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import type { PerspectiveCamera } from 'three'
import {
  BATTLE_CAMERA_DISTANCE,
  BATTLE_CAMERA_FOLLOW_RATE,
  BATTLE_CAMERA_HEIGHT_BIAS,
  BATTLE_CAMERA_PITCH_DEG,
  runtimeToWorldXZ,
} from '../../game/realtimeBattle/battleCoordinates'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'

/**
 * กล้องห้องต่อสู้ — 2.5D side-down (Blueprint v3 P1)
 *
 * มองจากด้านหน้าสนาม (+Z) เฉียงลงเล็กน้อย ไล่ตามผู้เล่นบนแกน X (ซ้าย–ขวา)
 * และ Z (depth) — ไม่ใช่ top-down อีกต่อไป
 */

/** สัดส่วนของความกว้างห้องที่ยอมให้เห็นนอกขอบเล็กน้อย */
const HORIZONTAL_VIEW_MARGIN = 0.92

export function BattleCamera({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const { camera, size } = useThree()
  const stage = runtime.getState().stage

  const worldWidth = stage.width * WORLD_SCALE
  const worldDepth = stage.height * WORLD_SCALE

  const rig = useMemo(() => {
    const cam = camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const pitch = (BATTLE_CAMERA_PITCH_DEG * Math.PI) / 180
    const halfFov = (cam.fov * Math.PI) / 180 / 2

    const height = BATTLE_CAMERA_DISTANCE * Math.sin(pitch) + BATTLE_CAMERA_HEIGHT_BIAS
    const back = BATTLE_CAMERA_DISTANCE * Math.cos(pitch)

    // ครึ่งความกว้างที่มองเห็น ณ ระยะของจุดเล็ง (พื้น y=0)
    const viewDistance = height / Math.sin(pitch)
    const halfWidth = Math.tan(halfFov) * aspect * viewDistance * HORIZONTAL_VIEW_MARGIN

    return {
      height,
      back,
      limitX: Math.max(0, worldWidth / 2 - halfWidth),
      limitZ: Math.max(0, worldDepth / 2 - worldDepth * 0.08),
    }
  }, [camera, size.width, size.height, worldWidth, worldDepth])

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera
    const player = runtime.getState().player
    const world = runtimeToWorldXZ(player.position, stage)

    const lookX = Math.min(Math.max(world.x, -rig.limitX), rig.limitX)
    const lookZ = Math.min(Math.max(world.z, -rig.limitZ), rig.limitZ)

    const targetX = lookX
    const targetY = rig.height
    const targetZ = lookZ + rig.back

    const k = Math.min(1, delta * BATTLE_CAMERA_FOLLOW_RATE)
    cam.position.x += (targetX - cam.position.x) * k
    cam.position.y += (targetY - cam.position.y) * k
    cam.position.z += (targetZ - cam.position.z) * k
    cam.lookAt(lookX, 0, lookZ)
  })

  return null
}
