import { useEffect, useState } from 'react'
import { ERROR_CODES, type ErrorCode } from '../../lib/errors/codes'
import { describeNormalizedError } from '../../lib/errors/normalizeError'
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
/*
  รหัสที่มีเจ้าของจอเป็นของตัวเองอยู่แล้ว — แถบนี้ต้องไม่ไปซ้ำ

  ตอนแอปพังระดับเรนเดอร์ ErrorBoundary ยึดทั้งจอและแสดง ErrorCodeTag ของรหัสนี้เด่นชัดอยู่แล้ว
  ปล่อยให้แถบลอยขึ้นทับอีกใบก็ได้ข้อความเดียวกันสองที่ในจังหวะที่ผู้เล่นสับสนที่สุด
*/
const OWNED_BY_ANOTHER_SCREEN: readonly ErrorCode[] = ['BOUNDARY_RENDER_CRASH']

interface VisibleError {
  code: ErrorCode
  /** บรรทัดสาเหตุสั้น ๆ จาก error จริง — null ถ้าผู้รายงานไม่ได้แนบ error มา */
  detail: string | null
}

export function GlobalErrorBanner() {
  const [current, setCurrent] = useState<VisibleError | null>(null)

  useEffect(() => {
    /*
      แสดงตัวล่าสุดตัวเดียว ไม่สะสมเป็นคิว

      error ระดับนี้มักมาเป็นชุดจากต้นเหตุเดียวกัน (context หาย → หลาย system รายงานพร้อมกัน)
      การซ้อนกล่องสิบใบไม่ได้ช่วยให้เข้าใจอะไรเพิ่ม มีแต่ทำให้ปิดไม่ทัน
    */
    /*
      รับ error ที่ผู้รายงานแนบมาด้วย ไม่ใช่แค่รหัส

      ตัวส่งต่อส่ง (code, error) มาตลอด แต่ตรงนี้เคยรับแค่ตัวแรก — สาเหตุจริงทั้งก้อน
      (รวมถึง code/details/hint ของ Supabase ที่แยก "RLS ปฏิเสธ" ออกจาก "เน็ตหลุด" ได้)
      จึงถูกทิ้งเงียบ ๆ ที่ชั้นที่ผู้เล่นเห็น ทั้งที่มันเดินทางมาถึงแล้ว
    */
    return subscribeToVisibleErrors((code, error) => {
      if (OWNED_BY_ANOTHER_SCREEN.includes(code)) return
      setCurrent({ code, detail: describeNormalizedError(error) })
    })
  }, [])

  if (!current) return null

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.text}>
        <strong className={styles.title}>{ERROR_CODES[current.code]}</strong>
        {/* รหัสต้องเลือกคัดลอกได้ ไม่ใช่แค่มองเห็น — ผู้เล่นต้องเอาไปแปะในรายงานปัญหา */}
        <code className={styles.code}>{current.code}</code>
        {current.detail ? <span className={styles.detail}>{current.detail}</span> : null}
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
