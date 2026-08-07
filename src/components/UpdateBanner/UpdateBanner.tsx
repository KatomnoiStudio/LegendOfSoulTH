import { useEffect } from 'react'
import { useDeployWatcher } from '../../hooks/useDeployWatcher'
import styles from './UpdateBanner.module.css'

/** เวลาก่อนรีเฟรชอัตโนมัติ — ให้เห็นข้อความก่อนโดนดีดออกจากเกม ไม่ใช่หายไปเงียบ ๆ ทันที */
const AUTO_RELOAD_DELAY_MS = 5000

/**
 * แถบแจ้งเตือนลอยด้านบนสุด — โผล่เมื่อมี build ใหม่ถูก deploy ขึ้นระหว่างเปิดแท็บค้างไว้
 *
 * บังคับรีเฟรชอัตโนมัติหลัง AUTO_RELOAD_DELAY_MS (HetCreep 2026-08-07 — เดิมแค่เตือนเฉย ๆ
 * ให้ผู้เล่นกดเอง แต่ session ฝั่ง accountRepository ตอนนี้ผูกกับเลขเวอร์ชันด้วย build เก่า
 * ที่ยังไม่รีเฟรชจะพังคาแอปอยู่ดีถ้าปล่อยไว้ — ปุ่ม "รีเฟรชตอนนี้" ยังกดข้ามการรอได้ ไม่มีปุ่มปิด
 * เฉย ๆ อีกต่อไปเพราะ "ไม่รีเฟรช" ไม่ใช่ทางเลือกที่ใช้งานได้จริงอีกแล้ว
 */
export function UpdateBanner() {
  const hasUpdate = useDeployWatcher()

  useEffect(() => {
    if (!hasUpdate) return
    const timer = window.setTimeout(() => window.location.reload(), AUTO_RELOAD_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [hasUpdate])

  if (!hasUpdate) return null

  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>มีอัปเดตใหม่ของเกม — กำลังรีเฟรชอัตโนมัติ...</span>
      <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
        รีเฟรชตอนนี้
      </button>
    </div>
  )
}
