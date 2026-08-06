import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export type QualityTier = 'high' | 'medium' | 'low'
export type QualityOverride = QualityTier | 'auto'

const TIERS: QualityTier[] = ['low', 'medium', 'high']

/** เฟรมช้าต่อเนื่องกี่วินาทีก่อนลดระดับ — ไวกว่าขึ้นระดับ กันผู้เล่นเห็นอาการกระตุกนาน */
const DOWNGRADE_AFTER_S = 2
/** เฟรมโล่งต่อเนื่องกี่วินาทีก่อนขึ้นระดับ — ช้ากว่าลดระดับตั้งใจ กันสวิงถี่ (flap) ไปมา */
const UPGRADE_AFTER_S = 10
/** เฟรมถือว่า "หนักเกินงบ" เมื่อใช้เวลานานกว่างบเท่านี้เท่า */
const OVERBUDGET_FACTOR = 1.5

/**
 * วัดว่าอุปกรณ์รับเรนเดอร์ไหวจริงระหว่างเล่น แล้วปรับระดับคุณภาพให้ — ต้องเรียกภายใน
 * <Canvas> เท่านั้น (ใช้ useFrame ของ R3F อ่าน delta ต่อเฟรม แทนการตั้ง requestAnimationFrame
 * คู่ขนานเอง — เลี่ยงมีตัวจับเวลาเฟรมสองตัวทำงานซ้อนกันในฉากเดียว)
 *
 * budgetMs = งบเวลาต่อเฟรมจากอัตรารีเฟรชจอจริง (ดู useDeviceRefreshRate) — จอ 120Hz ต้องเร็ว
 * กว่าจอ 60Hz สองเท่าจึงจะลื่นเท่ากัน งบจึงเหลือครึ่งเดียว
 *
 * override !== 'auto' → ตัดลูปวัดทิ้งทั้งหมด ไม่ใช่แค่เมินผลวัด — กันไม่ให้ auto-tier
 * แซงค่าที่ผู้เล่นล็อกเองแบบเงียบ ๆ (ask-CB opinion lane, 2026-08-06: seat "feeling" พบว่า
 * ถ้า sampler ยังวิ่งอยู่เบื้องหลังตอน override เปิด ผู้เล่นจะเห็นค่าที่ตัวเองเลือกถูกแทนที่
 * แบบไม่มีคำอธิบาย)
 */
export function usePerformanceQuality(
  budgetMs: number,
  override: QualityOverride,
  onTierChange: (tier: QualityTier) => void,
): void {
  const tierIndex = useRef(TIERS.indexOf('high'))
  const goodStreak = useRef(0)
  const badStreak = useRef(0)
  const lastTier = useRef<QualityTier>('high')

  useEffect(() => {
    // ทั้งสองทาง (ล็อก↔auto) ต้อง sync ref ภายในให้ตรงกับสิ่งที่ประกาศออกไปเสมอ — ไม่งั้นตอนกลับ
    // จาก override เป็น auto ลูปใน useFrame จะเทียบ next กับ lastTier.current ที่ค้างจากก่อน
    // override (เช่นยังเป็น 'high' จากตอน mount) แล้วไม่เห็นความต่างเลย เลยไม่เรียก onTierChange
    // อีก ฉากค้างที่ระดับ override เก่าตลอดไปทั้งที่วัดผ่าน useFrame ว่าเครื่องโอเคแล้ว (rot-canary)
    goodStreak.current = 0
    badStreak.current = 0
    if (override !== 'auto') {
      tierIndex.current = TIERS.indexOf(override)
      lastTier.current = override
      onTierChange(override)
    } else {
      // กลับเป็น auto — ประกาศระดับที่ ref ภายในถืออยู่ทันที ไม่รอให้ useFrame รอบถัดไปเจอความต่าง
      onTierChange(TIERS[tierIndex.current])
    }
  }, [override, onTierChange])

  useFrame((_state, delta) => {
    if (override !== 'auto') return
    // แท็บถูกซ่อน (สลับแอป/มินิไมซ์) — เบราว์เซอร์หน่วง/หยุด rAF เอง เฟรมแรกหลังกลับมา
    // เดลตาเพี้ยนมหาศาลเสมอ ไม่ใช่สัญญาณว่าเครื่องช้าจริง ทิ้งรอบนี้แล้วรีเซ็ตตัวนับ
    // (ask-CB: 4/4 seat เจอช่องโหว่นี้ตรงกัน — ไม่มี guard นี้ = downgrade มั่วตอนกลับมาจากแท็บอื่น)
    if (document.hidden) {
      goodStreak.current = 0
      badStreak.current = 0
      return
    }

    const frameMs = delta * 1000
    if (frameMs > budgetMs * OVERBUDGET_FACTOR) {
      badStreak.current += delta
      goodStreak.current = 0
    } else {
      goodStreak.current += delta
      badStreak.current = 0
    }

    if (badStreak.current >= DOWNGRADE_AFTER_S && tierIndex.current > 0) {
      tierIndex.current -= 1
      badStreak.current = 0
    } else if (goodStreak.current >= UPGRADE_AFTER_S && tierIndex.current < TIERS.length - 1) {
      tierIndex.current += 1
      goodStreak.current = 0
    }

    const next = TIERS[tierIndex.current]
    if (next !== lastTier.current) {
      lastTier.current = next
      onTierChange(next)
    }
  })
}
