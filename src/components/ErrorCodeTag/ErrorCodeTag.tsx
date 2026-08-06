import { ERROR_CODES, type ErrorCode } from '../../lib/errors/codes'
import styles from './ErrorCodeTag.module.css'

/**
 * ตัวเลขบรรทัดเล็ก ๆ มุมล่างของกล่อง error — โชว์ error code ให้เห็นเสมอทั้ง dev/prod
 * (เจตนา: มีค่ากับคนดูแลโปรเจกต์ตอนไล่ debug เป็นหลัก ไม่ได้สัญญาว่าผู้เล่นเอาไปรายงาน
 * ที่ไหนได้ — เกมนี้ยังไม่มีช่องทางรับรายงานจริง ถ้าจะเพิ่มทีหลัง ค่อยขยาย component นี้
 * ให้เป็นลิงก์ได้ ไม่ต้องแก้จุดเรียกทั้งหมด)
 *
 * รายละเอียดเพิ่ม (stack trace ฯลฯ) แยกเป็นหน้าที่ของผู้เรียก แสดงเฉพาะ import.meta.env.DEV
 */
export function ErrorCodeTag({ code }: { code: ErrorCode }) {
  return (
    <p className={styles.tag}>
      {code} — {ERROR_CODES[code]}
    </p>
  )
}
