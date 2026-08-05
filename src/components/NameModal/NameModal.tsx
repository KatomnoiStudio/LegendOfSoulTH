import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './NameModal.module.css'

/** ความยาวชื่อตัวละครที่ยอมรับได้ */
const MIN_LENGTH = 2
const MAX_LENGTH = 10

/**
 * อักษรที่อนุญาต: ไทย (U+0E00–U+0E7F), อังกฤษ, ตัวเลข และช่องว่าง
 * อักขระพิเศษถูกตัดทิ้งทันทีที่พิมพ์ เพื่อกันชื่อแปลกปลอมและปัญหาการแสดงผล
 */
const DISALLOWED = /[^฀-๿a-zA-Z0-9 ]/g

interface NameModalProps {
  /** เรียกเมื่อผู้เล่นยืนยันชื่อ (ชื่อผ่านการ trim แล้ว) */
  onConfirm: (name: string) => void
}

/**
 * หน้าต่างตั้งชื่อตัวละคร — เด้งขึ้นกลางจอหลังกด "เริ่มเกม"
 *
 * ปิดไม่ได้โดยตั้งใจ (ไม่มีปุ่มปิด/กด backdrop/Esc) เพราะต้องมีชื่อ
 * ก่อนเข้าหน้า Lobby
 */
export function NameModal({ onConfirm }: NameModalProps) {
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const trimmed = name.trim()
  const isValid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH
  const showLengthError = touched && !isValid && trimmed.length > 0

  const handleChange = (value: string) => {
    const clean = value.replace(DISALLOWED, '')
    setBlocked(clean !== value)
    setName(clean)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (isValid) onConfirm(trimmed)
  }

  const hint = blocked
    ? 'ใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข'
    : showLengthError
      ? `ชื่อต้องมี ${MIN_LENGTH}–${MAX_LENGTH} ตัวอักษร`
      : `${MIN_LENGTH}–${MAX_LENGTH} ตัวอักษร (ห้ามใช้อักขระพิเศษ)`

  return (
    <div className={styles.backdrop}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-modal-title"
        onSubmit={handleSubmit}
      >
        <h2 id="name-modal-title" className={styles.title}>
          โปรดใส่ชื่อตัวละคร
        </h2>
        <p className={styles.subtitle}>ชื่อนี้จะแสดงให้ผู้เล่นคนอื่นเห็นในลานประลอง</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="character-name">
            ชื่อตัวละคร
          </label>
          <input
            ref={inputRef}
            id="character-name"
            className={styles.input}
            type="text"
            value={name}
            maxLength={MAX_LENGTH}
            autoComplete="off"
            placeholder="พิมชื่อตัวละครที่นี้..."
            aria-describedby="character-name-hint"
            onChange={(event) => handleChange(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          <div className={styles.footRow} id="character-name-hint">
            <span className={blocked || showLengthError ? styles.error : undefined}>{hint}</span>
            <span className={styles.counter}>
              {trimmed.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        <button type="submit" className={styles.confirm} disabled={!isValid}>
          ยืนยันชื่อ
        </button>
      </form>
    </div>
  )
}
