import type { CSSProperties, ReactNode } from 'react'
import { getFrame } from '../../game/frames'
import styles from './AvatarFrame.module.css'

/**
 * กรอบโปรไฟล์ที่ครอบรูปประจำตัว — ทรงแผ่นป้ายสี่เหลี่ยมมุมมน ตีขึ้นจากโลหะ
 * (ไม่ใช้วงแหวนไล่สีเรืองแสงแบบวงกลม เพื่อให้ดูเป็นของที่ถูกออกแบบ/ตีขึ้นจริง
 * มากกว่าเอฟเฟกต์ glow อัตโนมัติ)
 *
 * รูปด้านในส่งเข้ามาทาง children เพื่อให้ใช้กับ avatar แบบไหนก็ได้ในอนาคต
 */
interface AvatarFrameProps {
  frameId: string
  /**
   * ขนาดกรอบมาจาก CSS ผ่านตัวแปร `--frame-size` ที่ตั้งใน class นี้
   * (ไม่ใช้ inline style เพื่อให้ media query override ขนาดได้)
   */
  className?: string
  children: ReactNode
}

/** ตำแหน่งหมุดยึดมุมทั้ง 4 จุด บน viewBox 100x100 */
const RIVET_POSITIONS: [number, number][] = [
  [11, 11],
  [89, 11],
  [11, 89],
  [89, 89],
]

export function AvatarFrame({ frameId, className, children }: AvatarFrameProps) {
  const frame = getFrame(frameId)
  const style = {
    '--frame-ring': frame.ring,
    '--frame-gem': frame.gem,
  } as CSSProperties

  return (
    <div className={`${styles.wrap} ${className ?? ''}`} style={style}>
      <div className={styles.plate}>
        <div className={styles.bezel}>
          <div className={styles.inner}>{children}</div>
        </div>
      </div>

      {/* หมุดยึดมุมกรอบ — รายละเอียดที่ทำให้ดูเหมือนแผ่นโลหะที่ประกอบขึ้นจริง */}
      <svg className={styles.rivets} viewBox="0 0 100 100" aria-hidden="true">
        {RIVET_POSITIONS.map(([cx, cy]) => (
          <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy})`}>
            <circle r="4" fill="var(--frame-ring)" stroke="rgb(0 0 0 / 60%)" strokeWidth="1" />
            <circle r="4" fill="none" stroke="rgb(255 255 255 / 30%)" strokeWidth="0.6" />
            <path
              d="M-1.7 -0.6 1.7 0.6"
              stroke="rgb(0 0 0 / 50%)"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
