import type { CSSProperties } from 'react'
import { publicUrl } from '../../lib/publicUrl'
import styles from './StartAdventure.module.css'

interface StartAdventureProps {
  onStart: () => void
}

// url('/ui/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_RAHU_STYLE: CSSProperties = {
  ['--bg-rahu' as string]: `url(${publicUrl('ui/thai/rahu-button-frame.png')})`,
}

/** ปุ่มหลักของหน้า Lobby สำหรับเข้าสู่ฉากผจญภัยจริง */
export function StartAdventure({ onStart }: StartAdventureProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.tagline}>เหล่าตำนานพร้อมออกศึกแล้ว</span>
      <button type="button" className={styles.button} onClick={onStart} style={BG_RAHU_STYLE}>
        <span className={styles.halo} />
        <span className={styles.buttonText}>เริ่มการผจญภัย</span>
      </button>
    </div>
  )
}
