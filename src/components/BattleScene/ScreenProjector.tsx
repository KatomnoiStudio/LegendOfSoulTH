import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import {
  BATTLE_HUD_HEIGHT_OFFSET,
  runtimeToWorldXZ,
} from '../../game/realtimeBattle/battleCoordinates'
import type { RealtimeBattleStage } from '../../game/realtimeBattle/stageConfig'
import type { Vec2 } from '../../game/realtimeBattle/types'

/**
 * สะพานเชื่อมพิกัดในโลก 3 มิติ → ตำแหน่งบนจอ สำหรับชั้น DOM ที่ทับ canvas อยู่
 *
 * ทำไมต้องมี: เลขดาเมจกับหลอดเลือดศัตรูเป็น DOM (ถูกกว่าและคมกว่าการวาดข้อความใน
 * three.js) แต่มันต้องลอยอยู่เหนือหัวตัวละครที่อยู่ในฉาก 3 มิติซึ่งกล้องขยับตลอดเวลา
 * การคำนวณเป็น % ของขนาดห้องจะเพี้ยนทันทีที่กล้องเลื่อนตาม
 *
 * component นี้อยู่ "ข้างใน" Canvas จึงเข้าถึงกล้องจริงได้ แล้วเขียนฟังก์ชันฉายพิกัด
 * ลงใน ref ที่ชั้น DOM ข้างนอกถืออยู่ — ไม่มีการ setState เลย จึงไม่มี re-render ต่อเฟรม
 */

export interface ScreenProjection {
  /** คืนตำแหน่งเป็นเปอร์เซ็นต์ของผืนผ้าใบ หรือ null เมื่ออยู่หลังกล้อง */
  project: ((position: Vec2, heightOffset?: number) => { left: number; top: number } | null) | null
}

export function ScreenProjector({
  stage,
  projection,
}: {
  stage: RealtimeBattleStage
  projection: { current: ScreenProjection }
}) {
  const { camera } = useThree()

  useFrame(() => {
    projection.current.project = (position, heightOffset = BATTLE_HUD_HEIGHT_OFFSET) => {
      const world = runtimeToWorldXZ(position, stage)
      const point = new Vector3(world.x, heightOffset, world.z)
      point.project(camera)

      // z > 1 แปลว่าจุดอยู่หลังระนาบตัดของกล้อง ฉายออกมาเป็นตำแหน่งกลับด้าน
      if (point.z > 1) return null

      return {
        left: ((point.x + 1) / 2) * 100,
        top: ((1 - point.y) / 2) * 100,
      }
    }
  })

  return null
}
