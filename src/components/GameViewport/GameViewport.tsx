import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import styles from './GameViewport.module.css'

/**
 * ขนาดออกแบบมาตรฐานของเกม (16:9) — ทุกหน้าจอวางบนพิกัดนี้
 *
 * เลือก 1600x900 ไม่ใช่ 1920x1080 เพราะเวทียิ่งกว้าง ตัวคูณย่อยิ่งเล็ก
 * ไอคอนและตัวหนังสือก็ยิ่งดูเล็กลงบนจอเดียวกัน
 * ที่ 1600x900 บนหน้าต่างสูงราว 900px ตัวคูณจะใกล้ 1.0 คือเห็นขนาดจริงตามที่ออกแบบ
 *
 * เปลี่ยนตรงนี้ที่เดียวถ้าจะย้ายไปออกแบบที่ความละเอียดอื่น (ต้องคง 16:9)
 */
export const BASE_WIDTH = 1600
export const BASE_HEIGHT = 900

/**
 * ล็อกจอเกมให้เต็มหน้าต่างเสมอ
 *
 * ปัญหาที่แก้: เดิม HUD อ้างอิง vw/dvh โดยตรง พอผู้เล่นย่อ-ขยายจอ ซูมเบราว์เซอร์
 * หรือเปิดบนจอเล็ก ตำแหน่งของกรอบพญานาค ปุ่มราหู และเมนูจะเลื่อนไม่ตรงกัน
 *
 * วิธีแก้: วางทุกอย่างบนเวทีขนาดคงที่ 1920x1080 แล้วย่อทั้งก้อนด้วย transform
 * ตามด้านที่คับที่สุด ผลคือสัดส่วนของทุกชิ้นคงที่เป๊ะทุกขนาดจอ
 * ส่วนที่เหลือจากอัตราส่วน 16:9 กลายเป็นแถบดำ (letterbox) แบบเกมทั่วไป
 *
 * หมายเหตุ: transform บนเวทีทำให้ลูกที่เป็น position:fixed (พวกหน้าต่างป๊อปอัป)
 * ยึดกับเวทีแทนหน้าต่างเบราว์เซอร์ ซึ่งเป็นสิ่งที่ต้องการ — ป๊อปอัปจะย่อ-ขยาย
 * ไปพร้อมเกม ไม่หลุดออกนอกกรอบ
 */
export function GameViewport({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(() => computeScale())

  useEffect(() => {
    const update = () => setScale(computeScale())

    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    // visualViewport จับการซูมด้วยนิ้วบนมือถือที่ resize ธรรมดาไม่รายงาน
    window.visualViewport?.addEventListener('resize', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  // เขียน transform เป็นสตริงเดียวจบ ไม่ผ่าน CSS variable
  // เพื่อไม่ให้ค่าตัวเลขถูกเติมหน่วยจนทั้งบรรทัด transform ใช้ไม่ได้
  const style: CSSProperties = {
    // ขนาดมาจากค่าคงที่ด้านบนจุดเดียว จะได้ไม่หลุดจากค่าที่ใช้คำนวณ scale
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    transform: `translate(-50%, -50%) scale(${scale})`,
  }

  return (
    <div className={styles.frame}>
      <div className={styles.stage} style={style}>
        {children}
      </div>
    </div>
  )
}

/** ย่อตามด้านที่คับกว่า เพื่อให้เห็นเวทีครบทั้งจอโดยไม่ถูกตัดขอบ */
function computeScale(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT)
}
