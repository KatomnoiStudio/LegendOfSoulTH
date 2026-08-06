import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import type { PerspectiveCamera } from 'three'
import { WORLD_SCALE } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'

/**
 * กล้องของห้องต่อสู้ — แยกจากกล้อง Lobby และ Exploration โดยสิ้นเชิง (§22)
 *
 * มุมมอง top-down เฉียง ไล่ตามผู้เล่นแบบนุ่ม ๆ และไม่ยอมให้เห็นนอกห้อง
 * ผู้เล่นหมุนกล้องเองไม่ได้ในเวอร์ชันแรก
 *
 * ── ทำไมต้องคำนวณเงาของ frustum บนพื้นจริง ๆ ──────────────
 * เวอร์ชันแรกคิดพื้นที่ที่มองเห็นเป็นสี่เหลี่ยมสมมาตรรอบจุดที่กล้องเล็ง แล้ว clamp
 * ด้วยครึ่งหนึ่งของส่วนที่เกิน ผลคือ **ผู้เล่นเดินหลุดออกนอกจอได้จริง** (เจอตอนทดสอบ
 * ในเบราว์เซอร์: เดินลงล่างจนสุดห้องแล้วตัวหายจากจอ)
 *
 * สาเหตุ: กล้องก้มลงมา เงาของ frustum บนพื้นเป็นสี่เหลี่ยมคางหมูที่ "ไม่สมมาตร"
 * รอบจุดเล็ง — ด้านไกลยืดออกไปมากกว่าด้านใกล้เสมอ การใช้ระยะสมมาตรจึงคลาดเคลื่อน
 * ไฟล์นี้จึงหาระยะจริงของขอบใกล้/ขอบไกลจากมุมก้มกับ fov แล้วค่อย clamp
 * ────────────────────────────────────────────────────────────
 */

/** มุมก้มของกล้องจากแนวระนาบ (องศา) */
const PITCH_DEG = 58

/** สัดส่วนความลึกของห้องที่ให้เห็นในหนึ่งเฟรม */
const VIEW_PORTION = 0.85

/** ความไวในการไล่ตาม (ต่อวินาที) — สูงไปจะกระตุกตามทุกก้าว ต่ำไปจะตามไม่ทัน */
const FOLLOW_RATE = 4.2

export function BattleCamera({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const { camera, size } = useThree()

  const stage = runtime.getState().stage
  const worldWidth = stage.width * WORLD_SCALE
  const worldDepth = stage.height * WORLD_SCALE

  /**
   * รูปทรงของกล้อง: ระยะ ความสูง และขอบเขตที่จุดเล็งขยับได้
   *
   * คิดใหม่เมื่อขนาดจอเปลี่ยน (หมุนจอมือถือ / ย่อหน้าต่าง) เท่านั้น ไม่ใช่ทุกเฟรม
   */
  const rig = useMemo(() => {
    const cam = camera as PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    const halfFov = ((cam.fov * Math.PI) / 180) / 2
    const pitch = (PITCH_DEG * Math.PI) / 180

    // มุมของรังสีขอบบน/ขอบล่างของจอ เทียบกับแนวระนาบ
    const nearAngle = pitch + halfFov
    const farAngle = pitch - halfFov

    /*
      ความลึกของเงา frustum บนพื้นต่อ 1 หน่วยระยะกล้อง

      ขอบไกลจะยืดไปไม่มีที่สิ้นสุดถ้ามุมก้มน้อยกว่าครึ่ง fov (มองเห็นเส้นขอบฟ้า)
      จำกัดไว้ที่ 6 เท่าเพื่อไม่ให้สูตรระเบิดถ้ามีคนไปแก้ค่ามุมทีหลัง
    */
    const nearUnit = Math.cos(nearAngle) / Math.sin(nearAngle)
    const farUnit = farAngle <= 0.01 ? 6 : Math.min(6, Math.cos(farAngle) / Math.sin(farAngle))
    const depthPerUnit = Math.sin(pitch) * (farUnit - nearUnit)

    const distance = (worldDepth * VIEW_PORTION) / Math.max(0.001, depthPerUnit)
    const height = distance * Math.sin(pitch)
    const back = distance * Math.cos(pitch)

    // ระยะจากจุดเล็งไปถึงขอบใกล้ (ด้านล่างจอ) และขอบไกล (ด้านบนจอ)
    const marginNear = back - height * nearUnit
    const marginFar = height * farUnit - back

    // ครึ่งความกว้างที่มองเห็น ณ ระยะของจุดเล็ง
    const halfWidth = Math.tan(halfFov) * aspect * distance

    return {
      distance,
      height,
      back,
      limitX: Math.max(0, worldWidth / 2 - halfWidth),
      limitNear: worldDepth / 2 - marginNear,
      limitFar: -worldDepth / 2 + marginFar,
    }
  }, [camera, size.width, size.height, worldWidth, worldDepth])

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera
    const player = runtime.getState().player

    const targetX = (player.position.x - stage.width / 2) * WORLD_SCALE
    const targetZ = (player.position.y - stage.height / 2) * WORLD_SCALE

    const lookX = Math.min(Math.max(targetX, -rig.limitX), rig.limitX)
    /*
      ถ้าเงาบนพื้นใหญ่กว่าห้อง (limitFar > limitNear) แปลว่าเห็นทั้งห้องอยู่แล้ว
      ล็อกกล้องไว้กลางห้องแทนการ clamp ที่จะสั่นไปมาระหว่างขอบสองข้าง
    */
    const lookZ =
      rig.limitFar > rig.limitNear
        ? 0
        : Math.min(Math.max(targetZ, rig.limitFar), rig.limitNear)

    const k = Math.min(1, delta * FOLLOW_RATE)
    cam.position.x += (lookX - cam.position.x) * k
    cam.position.y += (rig.height - cam.position.y) * k
    cam.position.z += (lookZ + rig.back - cam.position.z) * k
    cam.lookAt(lookX, 0, lookZ)
  })

  return null
}
