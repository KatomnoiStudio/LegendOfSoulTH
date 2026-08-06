import { useEffect, useState } from 'react'
import { ERROR_CODES, type ErrorCode } from '../../lib/errors/codes'
import { subscribeToVisibleErrors } from '../../lib/errors/reportError'
import styles from './GlobalErrorBanner.module.css'

/**
 * แถบแจ้ง error ที่ผู้เล่นควรเห็น — ตัวรับกลางเพียงตัวเดียวของ tier 'visible'
 *
 * มีอยู่เพราะสามที่ในเกมรายงาน error ระดับ 'visible' ได้แต่แสดงเองไม่ได้:
 * `globalErrorHandlers` อยู่นอก React ทั้งหมด (ดัก error จาก useFrame และ promise ที่ไม่มี
 * ใครรอ), `useAuth.updatePlayer` ถูกเรียกเหนือ ToastProvider จึงเรียก useToast ไม่ได้,
 * และจอ error ของห้องต่อสู้แสดงข้อความแต่ไม่แสดงรหัส ก่อนหน้านี้ทั้งสามจึงลงเหลือแค่
 * console.error ซึ่งผู้เล่นไม่มีทางเห็น
 *
 * เกมนี้ไม่ส่ง telemetry ไปไหนตามที่ตัดสินไว้ รหัสที่ผู้เล่นอ่านออกและพิมพ์ต่อได้จึงทำหน้าที่
 * แทน stack trace — ถ้ารหัสไม่เคยขึ้นจอ ก็เท่ากับไม่มีอะไรเลย
 *
 * วางไว้เป็นพี่น้องของ <App /> ใน main.tsx ตั้งใจ: มันต้องทำงานได้แม้ App จะอยู่ในสถานะแปลก ๆ
 * และต้องไม่พึ่ง context ตัวไหนที่อาจยังไม่ mount
 */
export function GlobalErrorBanner() {
  const [current, setCurrent] = useState<ErrorCode | null>(null)

  useEffect(() => {
    /*
      แสดงตัวล่าสุดตัวเดียว ไม่สะสมเป็นคิว

      error ระดับนี้มักมาเป็นชุดจากต้นเหตุเดียวกัน (context หาย → หลาย system รายงานพร้อมกัน)
      การซ้อนกล่องสิบใบไม่ได้ช่วยให้เข้าใจอะไรเพิ่ม มีแต่ทำให้ปิดไม่ทัน
    */
    return subscribeToVisibleErrors((code) => setCurrent(code))
  }, [])

  if (!current) return null

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.text}>
        <strong className={styles.title}>{ERROR_CODES[current]}</strong>
        {/* รหัสต้องเลือกคัดลอกได้ ไม่ใช่แค่มองเห็น — ผู้เล่นต้องเอาไปแปะในรายงานปัญหา */}
        <code className={styles.code}>{current}</code>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => setCurrent(null)}
        aria-label="ปิดข้อความแจ้งเตือน"
      >
        ×
      </button>
    </div>
  )
}
