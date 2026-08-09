import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
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

// ponytail: scratch vector reused across every project() call — never allocate inside the hot path
const scratchPoint = new Vector3()

export function ScreenProjector({
  stage,
  projection,
}: {
  stage: RealtimeBattleStage
  projection: { current: ScreenProjection }
}) {
  const { camera } = useThree()

  // ตั้งฟังก์ชันฉายพิกัดครั้งเดียวต่อ camera/stage (ไม่ใช่ทุกเฟรม) — camera เป็น object
  // เดิมที่ R3F อัปเดต matrix ให้เองทุกเฟรม ไม่ต้อง re-close ทับใหม่
  useEffect(() => {
    projection.current.project = (position, heightOffset = BATTLE_HUD_HEIGHT_OFFSET) => {
      const world = runtimeToWorldXZ(position, stage)
      scratchPoint.set(world.x, heightOffset, world.z)
      scratchPoint.project(camera)

      // z > 1 แปลว่าจุดอยู่หลังระนาบตัดของกล้อง ฉายออกมาเป็นตำแหน่งกลับด้าน
      if (scratchPoint.z > 1) return null

      return {
        left: ((scratchPoint.x + 1) / 2) * 100,
        top: ((1 - scratchPoint.y) / 2) * 100,
      }
    }
  }, [camera, stage, projection])

  return null
}
