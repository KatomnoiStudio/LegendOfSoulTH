import type { ReactNode } from 'react'
import { DEFAULT_LOADING_IMAGE_SRC } from './loadingImage'
import styles from './LoadingScreen.module.css'

interface LoadingScreenProps {
  /** ข้อความใต้ visual — ไม่ใส่ก็ได้ */
  label?: string
  /**
   * เนื้อหาแทนที่ visual เริ่มต้น (ลาย 魂) — ใช้ตอนต้องการเนื้อหาเฉพาะทาง เช่น การ์ด VS
   * ของ BattleTransition ที่มีข้อมูลคู่ต่อสู้ ไม่ใช่แค่ "กำลังโหลด" ทั่วไป
   */
  children?: ReactNode
  /**
   * 'opaque' (ค่าเริ่มต้น) — พื้นหลังทึบธีมเข้ม ใช้ตอนยังไม่มีอะไรอยู่ข้างหลังเลย
   * (เช่น Suspense fallback ระหว่างรอ chunk โหลด)
   * 'overlay' — พื้นหลังโปร่งดำ ใช้ตอนซ้อนทับฉากที่ยังแสดงอยู่จริง (เช่น BattleTransition)
   */
  background?: 'opaque' | 'overlay'
}

/**
 * หน้าจอ/overlay ระหว่างรอ — ใช้ร่วมกันทุกจุดที่มีอะไรให้รอจริง ๆ (Suspense boundary จริง
 * เท่านั้น — ไม่ใช่การสลับฉาก/mode ที่เป็นแค่ state flip ไม่มีอะไรให้รอ ดู MEMORY.md
 * item เกี่ยวกับ ask-CB ของระบบนี้สำหรับเหตุผลที่ไม่ครอบทุกจุดสลับฉาก)
 *
 * ยังไม่มีภาพ loading จริง — ใช้ลาย 魂 (สูญ) แบบเดียวกับ TitlePage แทนไปก่อน
 * เปลี่ยนเป็นภาพจริงได้ที่ loadingImage.ts จุดเดียว ไม่ต้องแก้ตรงนี้หรือที่เรียกใช้เลย
 */
export function LoadingScreen({ label, children, background = 'opaque' }: LoadingScreenProps) {
  return (
    <div
      className={background === 'overlay' ? styles.overlayScreen : styles.opaqueScreen}
      // เนื้อหาที่ส่งมาเอง (children เช่นการ์ด VS ของ BattleTransition) เป็นเจ้าของ
      // aria-live ตัวเองอยู่แล้ว — ใส่ role/aria-live ที่นี่เฉพาะตอนใช้ visual เริ่มต้น
      // เท่านั้น กันไม่ให้เกิด live region ซ้อนกันสอง politeness level
      {...(children ? {} : { role: 'status', 'aria-live': 'polite' })}
    >
      {children ?? (
        <div className={styles.visual}>
          {DEFAULT_LOADING_IMAGE_SRC ? (
            <img src={DEFAULT_LOADING_IMAGE_SRC} alt="" draggable={false} />
          ) : (
            <div className={styles.seal} aria-hidden="true">
              <span className={styles.sealOrbit} />
              <span className={styles.sealCore}>魂</span>
            </div>
          )}
        </div>
      )}
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  )
}
