import { useState } from 'react'
import { useDeployWatcher } from '../../hooks/useDeployWatcher'
import styles from './UpdateBanner.module.css'

/**
 * แถบแจ้งเตือนลอยด้านบนสุด — โผล่เมื่อมี build ใหม่ถูก deploy ขึ้นระหว่างเปิดแท็บค้างไว้
 * ไม่บังคับรีเฟรช (ผู้เล่นอาจกำลังเล่นอยู่) แค่เตือน + ให้ปุ่มกดรีเฟรชเอง ปิดแล้วปิดเลย
 */
export function UpdateBanner() {
  const hasUpdate = useDeployWatcher()
  const [dismissed, setDismissed] = useState(false)

  if (!hasUpdate || dismissed) return null

  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>มีอัปเดตใหม่ของเกม — รีเฟรชเพื่อใช้เวอร์ชันล่าสุด</span>
      <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
        รีเฟรชตอนนี้
      </button>
      <button type="button" className={styles.dismiss} onClick={() => setDismissed(true)} aria-label="ปิด">
        ×
      </button>
    </div>
  )
}
