import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PASSWORD_MIN_LENGTH } from '../../data/accountRepository.shared'
import { useModalA11y } from '../../hooks/useModalA11y'
import { getLastEmail, setLastEmail } from '../../lib/authUi'
import { reportError } from '../../lib/errors/reportError'
import styles from './AuthModal.module.css'

type Mode = 'register' | 'login'

interface AuthModalProps {
  /** คืน null เมื่อสำเร็จ คืนข้อความเมื่อผิดพลาด */
  onRegister: (email: string, password: string) => Promise<string | null>
  onLogin: (email: string, password: string) => Promise<string | null>
}

/**
 * หน้าสมัคร / เข้าสู่ระบบ
 *
 * ปิดไม่ได้โดยตั้งใจ — ต้องมีบัญชีก่อนถึงจะเข้าเกมได้
 * ตัวฟอร์มไม่รู้จัก localStorage เลย คุยผ่าน callback เท่านั้น
 * เปลี่ยนหลังบ้านเป็นเซิร์ฟเวอร์จริงเมื่อไหร่ ไฟล์นี้ไม่ต้องแก้
 */
export function AuthModal({ onRegister, onLogin }: AuthModalProps) {
  const [lastEmail] = useState(() => getLastEmail())
  // เคยล็อกอินเครื่องนี้มาก่อน (มีอีเมลจำไว้) → เปิดแท็บเข้าสู่ระบบให้เลย ไม่ต้องเดา
  const [mode, setMode] = useState<Mode>(() => (lastEmail ? 'login' : 'register'))
  const [email, setEmail] = useState(() => lastEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  // focus trap เท่านั้น — ปิดด้วย Esc/backdrop-click ไม่ได้โดยตั้งใจ (ดูคอมเมนต์หัวไฟล์)
  // จึงส่ง onClose เป็น no-op: Tab ยังคงวนอยู่ในกล่องนี้ แต่ Esc/backdrop ไม่ทำอะไร
  // (Esc ของ modal นี้เองด้านล่างยังสลับแท็บสมัคร/เข้าสู่ระบบต่อไปตามเดิม — คนละ listener กัน
  // ไม่ชนกัน เพราะ stopPropagation() ไม่บล็อก listener อื่นบน target เดียวกัน)
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(() => {})

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setConfirm('')
  }

  // Esc ปิด modal นี้ไม่ได้ (ต้องมีบัญชีก่อนถึงจะเข้าเกมได้ — ดูคอมเมนต์หัวไฟล์)
  // แต่ยังรับ input ไว้แทนที่จะไม่ทำอะไรเลย: สลับแท็บสมัคร/เข้าสู่ระบบแทน
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') switchMode(mode === 'register' ? 'login' : 'register')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return

    if (mode === 'register' && password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const message =
        mode === 'register' ? await onRegister(email, password) : await onLogin(email, password)

      if (!message) setLastEmail(email)

      // สำเร็จแล้ว component จะถูกถอดออกโดยหน้าแม่ จึงตั้ง busy กลับเฉพาะตอนพลาด
      if (message) {
        setError(message)
        setBusy(false)
      }
    } catch (cause) {
      // ต้องจับไว้ ไม่งั้น reject หลุดแล้ว busy จะค้าง true กล่องนี้ใช้ต่อไม่ได้เลย
      // (เช่นตอนหน้าไม่ได้อยู่บน secure context จน crypto.subtle ใช้ไม่ได้ หรือแฮช
      // ที่เก็บไว้เพี้ยนจน deriveBits โยนข้อผิดพลาด)
      reportError('AUTH_SUBMIT_FAIL', 'silent', cause)
      setError('ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง')
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <div className={styles.backdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="เข้าสู่ตำนาน"
        tabIndex={-1}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>{isRegister ? 'สมัครบัญชีใหม่' : 'เข้าสู่ระบบ'}</h2>
          <p className={styles.subtitle}>
            {isRegister ? 'สมัครแล้วรับขุนพลคนแรกฟรีทันที' : 'ยินดีต้อนรับกลับสู่ลานประลอง'}
          </p>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={styles.tab}
            onClick={() => switchMode('register')}
          >
            สมัครสมาชิก
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={styles.tab}
            onClick={() => switchMode('login')}
          >
            เข้าสู่ระบบ
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">
              อีเมล
            </label>
            <input
              ref={emailRef}
              id="auth-email"
              className={styles.input}
              type="email"
              value={email}
              autoComplete="off"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">
              รหัสผ่าน
            </label>
            <input
              id="auth-password"
              className={styles.input}
              type="password"
              value={password}
              autoComplete="off"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
            {isRegister ? (
              <span className={styles.hint}>อย่างน้อย {PASSWORD_MIN_LENGTH} ตัวอักษร</span>
            ) : null}
          </div>

          {isRegister ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-confirm">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="auth-confirm"
                className={styles.input}
                type="password"
                value={confirm}
                autoComplete="off"
                placeholder="••••••••"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? 'กำลังดำเนินการ…' : isRegister ? 'สมัครและเริ่มเล่น' : 'เข้าสู่ลานประลอง'}
          </button>

          <p className={styles.note}>
            บัญชีนี้ผูกกับอีเมลและเก็บบนเซิร์ฟเวอร์แล้ว ล็อกอินจากเครื่อง/เบราว์เซอร์ไหนก็ได้
          </p>
        </form>
      </div>
    </div>
  )
}
