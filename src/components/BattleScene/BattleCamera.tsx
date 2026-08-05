import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'

/**
 * กล้องของห้องต่อสู้ — แยกจากกล้อง Lobby และ Exploration โดยสิ้นเชิง (§22)
 *
 * มุมมอง top-down เฉียง ไล่ตามผู้เล่นแบบนุ่ม ๆ และ **ไม่ยอมให้เห็นนอกห้อง**
 * ผู้เล่นหมุนกล้องเองไม่ได้ในเวอร์ชันแรก
 *
 * ระยะถอยกล้องคิดจากขนาดห้องและอัตราส่วนจอ เพื่อให้จอมือถือแนวนอนที่อัตราส่วนต่างกัน
 * (19.5:9 ของมือถือ กับ 16:9 ของแท็บเล็ต) เห็นพื้นที่เล่นใกล้เคียงกัน
 */

/** มุมก้มของกล้อง (0 = มองจากด้านข้าง, 1 = มองจากบนตรง ๆ) */
const TILT = 0.72

/**
 * สัดส่วนของห้องที่ให้เห็นในหนึ่งเฟรม — ต่ำกว่า 1 คือกล้องเข้าใกล้กว่าเห็นทั้งห้อง
 *
 * เคยลอง 0.66 แล้วแคบเกินไป: ศัตรูที่ยืนแถวบนหลุดออกนอกจอตั้งแต่ผู้เล่นยังไม่ได้ขยับ
 * ซึ่งอันตรายสำหรับเกมที่ศัตรูวิ่งเข้าหา 0.85 ให้เห็นเกือบทั้งห้องแต่กล้องยังขยับตามได้
 */
const VIEW_PORTION = 0.85

/** ความไวในการไล่ตาม (ต่อวินาที) — สูงไปจะกระตุกตามทุกก้าว ต่ำไปจะตามไม่ทัน */
const FOLLOW_RATE = 4.2

export function BattleCamera({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const { camera, size } = useThree()
  const distance = useRef(12)

  const stage = runtime.getState().stage
  const worldWidth = stage.width * WORLD_SCALE
  const worldDepth = stage.height * WORLD_SCALE

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const fovRadians = (cam.fov * Math.PI) / 180

    const forHeight = (worldDepth * VIEW_PORTION) / 2 / Math.tan(fovRadians / 2)
    const forWidth = (worldWidth * VIEW_PORTION) / 2 / Math.tan(fovRadians / 2) / aspect

    distance.current = Math.max(forHeight, forWidth)
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height, worldWidth, worldDepth])

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera
    const player = runtime.getState().player

    const targetX = (player.position.x - stage.width / 2) * WORLD_SCALE
    const targetZ = (player.position.y - stage.height / 2) * WORLD_SCALE

    /*
      จำกัดจุดที่กล้องเล็งไม่ให้หลุดออกนอกห้อง (§22)

      ระยะที่กล้องขยับได้จากกึ่งกลาง = ครึ่งหนึ่งของส่วนที่ "เกิน" พื้นที่ที่มองเห็น
      ถ้าห้องเล็กกว่าพื้นที่ที่มองเห็น ค่าจะเป็น 0 คือกล้องล็อกอยู่กลางห้อง
    */
    const limitX = Math.max(0, (worldWidth * (1 - VIEW_PORTION)) / 2)
    const limitZ = Math.max(0, (worldDepth * (1 - VIEW_PORTION)) / 2)
    const lookX = Math.min(Math.max(targetX, -limitX), limitX)
    const lookZ = Math.min(Math.max(targetZ, -limitZ), limitZ)

    const desiredY = distance.current * TILT
    const desiredZ = lookZ + distance.current * (1 - TILT) + worldDepth * 0.16

    const k = Math.min(1, delta * FOLLOW_RATE)
    cam.position.x += (lookX - cam.position.x) * k
    cam.position.y += (desiredY - cam.position.y) * k
    cam.position.z += (desiredZ - cam.position.z) * k
    cam.lookAt(lookX, 0, lookZ)
  })

  return null
}
