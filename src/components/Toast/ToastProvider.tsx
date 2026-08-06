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
  /** กันการกดปุ่มเดิมรัว ๆ แล้วข้อความเดียวกันกองทับหลายชั้น */
  const activeMessages = useRef(new Set<string>())

  useEffect(() => {
    const pending = timers.current
    const messages = activeMessages.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
      messages.clear()
    }
  }, [])

  const showToast = useCallback(
    (message: string, variant: 'success' | 'error' | 'currency' = 'success') => {
      if (activeMessages.current.has(message)) return
      activeMessages.current.add(message)
      void playSfx(
        variant === 'error' ? 'error' : variant === 'currency' ? 'currencyGain' : 'notification',
      )

      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, leaving: false }].slice(-MAX_VISIBLE))

      const fade = setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
        const drop = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
          activeMessages.current.delete(message)
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
