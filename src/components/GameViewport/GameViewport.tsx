import type { ReactNode } from 'react'
import styles from './GameViewport.module.css'

/**
 * เวทีเกม — เต็มวิวพอร์ตจริงเสมอ ไม่มี letterbox
 *
 * เดิมล็อกทุกอย่างไว้บนเวทีขนาดคงที่ 1600x900 แล้วย่อทั้งก้อนด้วย transform
 * เพื่อกันตำแหน่ง HUD เพี้ยนตอนย่อ-ขยายจอ ผลข้างเคียงคือจอที่อัตราส่วนต่างจาก
 * 16:9 มาก (มือถือแนวตั้ง, จอออฟฟิศ 4:3) จะถูกย่อทั้งชุดจนตัวหนังสือ/ปุ่มเล็กเกินอ่าน-กด
 * แทนที่จะได้พื้นที่จริงที่มี
 *
 * ตอนนี้แต่ละ component รับผิดชอบ responsive ของตัวเอง (media query/relative unit)
 * แทนการพึ่ง scale เดียวจากตรงนี้
 */
export function GameViewport({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <div className={styles.stage}>{children}</div>
    </div>
  )
}
