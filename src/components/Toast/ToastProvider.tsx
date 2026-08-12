import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playSfx } from '../../lib/audio/AudioEngine'
import { ToastContext, type ToastApi } from './ToastContext'
import styles from './Toast.module.css'

const VISIBLE_MS = 2200
const LEAVE_MS = 260
const MAX_VISIBLE = 3

interface ToastItem {
  id: number
  message: string
  leaving: boolean
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  /**
   * กระจกของรายการที่ render อยู่จริง — และเป็น "แหล่งเดียว" ของการกันข้อความซ้ำด้วย
   *
   * เคยแยกเป็น Set ของข้อความต่างหาก แล้วเพี้ยน: `.slice(-MAX_VISIBLE)` เบียด toast เก่า
   * ตกจอทันที แต่ชื่อมันยังค้างใน Set จนกว่า timer ของตัวเองจะหมด (สูงสุด 2460ms) —
   * ระหว่างนั้นกดเรียกข้อความเดิมจะถูกกลืนเงียบ ๆ ไม่มี toast ไม่มีเสียง ไม่มีอะไรบอกผู้ใช้
   * ว่าทำไมปุ่มไม่ทำงาน อ่านจากรายการที่ render จริงแทน จึงไม่มีสองแหล่งให้เพี้ยนอีก
   */
  const live = useRef<ToastItem[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
      live.current = []
    }
  }, [])

  const showToast = useCallback(
    (message: string, variant: 'success' | 'error' | 'currency' = 'success') => {
      /** กันการกดปุ่มเดิมรัว ๆ แล้วข้อความเดียวกันกองทับหลายชั้น — เฉพาะตัวที่ยังอยู่บนจอ */
      if (live.current.some((t) => t.message === message)) return
      void playSfx(
        variant === 'error' ? 'error' : variant === 'currency' ? 'currencyGain' : 'notification',
      )

      const id = nextId.current++
      live.current = [...live.current, { id, message, leaving: false }].slice(-MAX_VISIBLE)
      setToasts(live.current)

      const fade = setTimeout(() => {
        live.current = live.current.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        setToasts(live.current)
        const drop = setTimeout(() => {
          live.current = live.current.filter((t) => t.id !== id)
          setToasts(live.current)
          timers.current.delete(drop)
        }, LEAVE_MS)
        timers.current.add(drop)
        timers.current.delete(fade)
      }, VISIBLE_MS)
      timers.current.add(fade)
    },
    [],
  )

  const api = useMemo<ToastApi>(
    () => ({
      showToast,
      comingSoon: (feature: string) => showToast(`${feature} — เร็ว ๆ นี้`),
    }),
    [showToast],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast} data-leaving={toast.leaving}>
            <span className={styles.spark} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
