import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { PerspectiveCamera } from 'three'

/**
 * กล้องของห้องต่อสู้ — แยกจากกล้อง Lobby และ Exploration โดยสิ้นเชิง (§22)
 *
 * มุมมอง top-down เฉียง ผู้เล่นหมุนกล้องเองไม่ได้ในเวอร์ชันแรก
 * ระยะถอยกล้องคิดจากขนาดห้องและอัตราส่วนจอ เพื่อให้เห็นห้องครบทั้งใบบนจอมือถือแนวนอน
 * ที่อัตราส่วนต่างกัน (เช่น 19.5:9 ของ iPhone กับ 16:9 ของแท็บเล็ต)
 *
 * การไล่กล้องตามผู้เล่นแบบ smooth จะเข้ามาพร้อมระบบเดิน — ตอนนี้กล้องนิ่งครอบทั้งห้อง
 */

/** มุมก้มของกล้อง (0 = มองจากด้านข้าง, 1 = มองจากบนตรง ๆ) */
const TILT = 0.72

interface BattleCameraProps {
  /** ขนาดห้องในหน่วยโลกของ three.js */
  worldWidth: number
  worldDepth: number
}

export function BattleCamera({ worldWidth, worldDepth }: BattleCameraProps) {
  const { camera, size } = useThree()

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const fovRadians = (cam.fov * Math.PI) / 180

    // ระยะที่ทำให้ห้องพอดีจอทั้งแนวตั้งและแนวนอน แล้วเผื่อขอบไว้ 12%
    const distanceForHeight = worldDepth / 2 / Math.tan(fovRadians / 2)
    const distanceForWidth = worldWidth / 2 / Math.tan(fovRadians / 2) / aspect
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.12

    cam.position.set(0, distance * TILT, distance * (1 - TILT) + worldDepth * 0.32)
    cam.lookAt(0, 0, 0)
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height, worldWidth, worldDepth])

  return null
}
