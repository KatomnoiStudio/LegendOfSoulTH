import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PASSWORD_MIN_LENGTH } from '../../data/accountRepository.shared'
import { useModalA11y } from '../../hooks/useModalA11y'
import { getLastEmail, setLastEmail } from '../../lib/authUi'
import { reportError } from '../../lib/errors/reportError'
import styles from './AuthModal.module.css'

/*
  Cloudflare Turnstile — โหลดผ่าน <script> ใน index.html (ไม่ใช้ npm package ตาม convention
  ของโปรเจกต์นี้ที่เลี่ยง dependency ใหม่เมื่อ native script tag พอ) window.turnstile จึงเป็น
  global ที่ประกาศ type เองตรงนี้ เพราะไม่มี official @types
*/
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

type Mode = 'register' | 'login'

interface AuthModalProps {
  /** คืน null เมื่อสำเร็จ คืนข้อความเมื่อผิดพลาด */
  onRegister: (email: string, password: string, captchaToken?: string) => Promise<string | null>
  onLogin: (email: string, password: string, captchaToken?: string) => Promise<string | null>
  /** เข้าสู่ระบบด้วย Google — สำเร็จแล้วหน้าเปลี่ยนไปทันที ไม่กลับมา resolve ที่นี่ */
  onLoginWithGoogle: () => Promise<string | null>
  /** เข้าเล่นทันทีแบบ guest — ไม่ต้องกรอกอะไรเลย */
  onLoginAsGuest: (captchaToken?: string) => Promise<string | null>
}

/**
 * หน้าสมัคร / เข้าสู่ระบบ
 *
 * ปิดไม่ได้โดยตั้งใจ — ต้องมีบัญชีก่อนถึงจะเข้าเกมได้
 * ตัวฟอร์มไม่รู้จัก localStorage เลย คุยผ่าน callback เท่านั้น
 * เปลี่ยนหลังบ้านเป็นเซิร์ฟเวอร์จริงเมื่อไหร่ ไฟล์นี้ไม่ต้องแก้
 */
export function AuthModal({
  onRegister,
  onLogin,
  onLoginWithGoogle,
  onLoginAsGuest,
}: AuthModalProps) {
  const [lastEmail] = useState(() => getLastEmail())
  // เคยล็อกอินเครื่องนี้มาก่อน (มีอีเมลจำไว้) → เปิดแท็บเข้าสู่ระบบให้เลย ไม่ต้องเดา
  const [mode, setMode] = useState<Mode>(() => (lastEmail ? 'login' : 'register'))
  const [email, setEmail] = useState(() => lastEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined)
  const emailRef = useRef<HTMLInputElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetId = useRef<string | null>(null)
  // focus trap เท่านั้น — ปิดด้วย Esc/backdrop-click ไม่ได้โดยตั้งใจ (ดูคอมเมนต์หัวไฟล์)
  // จึงส่ง onClose เป็น no-op: Tab ยังคงวนอยู่ในกล่องนี้ แต่ Esc/backdrop ไม่ทำอะไร
  // (Esc ของ modal นี้เองด้านล่างยังสลับแท็บสมัคร/เข้าสู่ระบบต่อไปตามเดิม — คนละ listener กัน
  // ไม่ชนกัน เพราะ stopPropagation() ไม่บล็อก listener อื่นบน target เดียวกัน)
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(() => {})

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // ไม่มี VITE_TURNSTILE_SITE_KEY (เช่น local dev clone ใหม่ที่ยังไม่ตั้ง .env.local) — ข้าม
  // widget ไปเงียบ ๆ: captchaToken เป็น undefined ตลอด ถ้า Supabase project เปิด CAPTCHA บังคับ
  // ไว้จริงค่อยพังตอน submit ด้วยข้อความ error ปกติ ไม่ throw ตอน mount
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | undefined

    const render = () => {
      const turnstile = window.turnstile
      if (!turnstile || !turnstileRef.current) return false
      try {
        // render() throw ได้ถ้า container ยังมี widget เก่าค้างอยู่ (เช่น React StrictMode
        // dev เรียก effect mount/cleanup/mount ซ้อนกันเร็วมาก) — จับไว้กันหลุดขึ้นไปพัง render
        turnstileWidgetId.current = turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            if (!cancelled) setCaptchaToken(token)
          },
          'expired-callback': () => {
            if (!cancelled) setCaptchaToken(undefined)
          },
          'error-callback': () => {
            if (!cancelled) setCaptchaToken(undefined)
          },
        })
      } catch (cause) {
        reportError('AUTH_SUBMIT_FAIL', 'silent', cause)
      }
      return true
    }

    // script โหลดด้วย async defer — อาจยังไม่พร้อมตอน modal นี้ mount จึง poll สั้น ๆ
    if (!render()) {
      pollId = setInterval(() => {
        if (render() && pollId) clearInterval(pollId)
      }, 100)
    }

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      if (turnstileWidgetId.current) window.turnstile?.remove(turnstileWidgetId.current)
    }
  }, [])

  // token ใช้ได้ครั้งเดียว — รีเซ็ต widget ให้ออกใบใหม่หลังทุกครั้งที่ยิง submit (ไม่ว่าจะสำเร็จหรือพลาด)
  const resetCaptcha = () => {
    setCaptchaToken(undefined)
    if (turnstileWidgetId.current) window.turnstile?.reset(turnstileWidgetId.current)
  }

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
        mode === 'register'
          ? await onRegister(email, password, captchaToken)
          : await onLogin(email, password, captchaToken)

      resetCaptcha()
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
      resetCaptcha()
      setBusy(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      // สำเร็จแล้วหน้าเปลี่ยนไปทันที (redirect ออกจากแอป) — ไม่ต้อง setBusy(false) ในเคสนั้น
      const message = await onLoginWithGoogle()
      if (message) {
        setError(message)
        setBusy(false)
      }
    } catch (cause) {
      // ต้องจับไว้เหมือน handleSubmit — ไม่งั้น reject หลุดแล้วปุ่มค้าง disabled ถาวร
      reportError('AUTH_OAUTH_FAIL', 'silent', cause)
      setError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง')
      setBusy(false)
    }
  }

  const handleGuestLogin = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const message = await onLoginAsGuest(captchaToken)
      resetCaptcha()
      if (message) {
        setError(message)
        setBusy(false)
      }
      // สำเร็จแล้ว component ถูกถอดออกโดยหน้าแม่เหมือน handleSubmit — ไม่ต้อง setBusy(false)
    } catch (cause) {
      // ต้องจับไว้เหมือน handleGoogleLogin — ไม่งั้น reject หลุดแล้วปุ่มค้าง disabled ถาวร
      reportError('AUTH_SUBMIT_FAIL', 'silent', cause)
      setError('เข้าเล่นแบบ guest ไม่สำเร็จ ลองใหม่อีกครั้ง')
      resetCaptcha()
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

        <div className={styles.oauth}>
          <button
            type="button"
            className={styles.googleButton}
            onClick={() => void handleGoogleLogin()}
            disabled={busy}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
              />
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <div className={styles.divider}>
            <span>หรือ</span>
          </div>
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

          {TURNSTILE_SITE_KEY ? <div ref={turnstileRef} className={styles.turnstile} /> : null}

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

          <button
            type="button"
            className={styles.guestLink}
            onClick={() => void handleGuestLogin()}
            disabled={busy}
          >
            เล่นทันทีแบบไม่สมัคร
          </button>
          <p className={styles.note}>
            เล่นแบบ guest จะกลับเข้าบัญชีเดิมไม่ได้ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง —
            อัพเกรดเป็นบัญชีจริงได้ทีหลังในเมนูตั้งค่า ข้อมูลไม่หาย
          </p>
        </form>
      </div>
    </div>
  )
}
