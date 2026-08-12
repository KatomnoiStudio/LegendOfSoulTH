import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorCodeTag } from '../ErrorCodeTag/ErrorCodeTag'
import { reportError } from '../../lib/errors/reportError'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  /** จอสำรองเมื่อ crash — ไม่ใส่ = จอเต็มจอปกติ (ใช้ที่จุดครอบทั้งแอปใน main.tsx) */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * ตัวจับ exception ระดับบนสุดของ React tree
 *
 * ไม่จับ error ที่เกิดนอก React render cycle (R3F useFrame,
 * async callback) — ตัวนั้นดักด้วย window 'error'/'unhandledrejection' แยกใน main.tsx
 *
 * ── ทำไมจอนี้ไม่มีปุ่ม "สำรองข้อมูลเป็นไฟล์" แล้ว (2026-08-10) ────────────────
 * เคยมี และมันล้มเหลว 100% ตลอดอายุการใช้งาน รอบแรกเพราะต่อไว้กับ accountRepository ตัว
 * localStorage เดิมที่ backend ปัจจุบันไม่เคยเขียน session ให้ (ตอบ "ยังไม่ได้ล็อกอิน" ทุกครั้ง)
 * พอย้ายมาต่อกับ backend จริงก็ยังล้มเหลว 100% อยู่ดี เพราะ `exportSave` ฝั่ง Supabase เป็น
 * stub ที่ hardcode คืน ok:false เสมอ ("ฟีเจอร์นี้ใช้กับบัญชี Supabase ไม่ได้")
 *
 * ปุ่มที่กดแล้วขึ้น error ทุกครั้งบนจอที่ผู้เล่นกำลังตกใจอยู่ แย่กว่าไม่มีปุ่มเลย — มันสัญญาสิ่งที่
 * ให้ไม่ได้ในจังหวะที่ผู้เล่นเชื่อมันที่สุด จอนี้จึงบอกความจริงแทน: ความคืบหน้าอยู่บนเซิร์ฟเวอร์แล้ว
 *
 * จะเอาปุ่มกลับมาได้ก็ต่อเมื่อ `accountRepository.supabase.ts` มี export จริง (ไม่ใช่ stub) —
 * ไฟล์นั้นเป็นของ persistence lane จนกว่าจะถึงตอนนั้น ปุ่มยัง HOLD ไว้
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('BOUNDARY_RENDER_CRASH', 'visible', error, { componentStack: info.componentStack })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className={styles.screen}>
          <div className={styles.panel}>
            <h1 className={styles.title}>เกิดข้อผิดพลาด</h1>
            <p className={styles.message}>
              เกมพบปัญหาที่ไม่คาดคิด ความคืบหน้าของคุณถูกบันทึกไว้บนเซิร์ฟเวอร์แล้ว
              ไม่ได้อยู่แค่ในเบราว์เซอร์นี้ กดโหลดใหม่เพื่อเล่นต่อได้เลย หากพังซ้ำทุกครั้ง
              ให้แจ้งปัญหาพร้อมรหัสด้านล่าง
            </p>
            <ErrorCodeTag code="BOUNDARY_RENDER_CRASH" />
            <div className={styles.actions}>
              <button className={styles.reload} onClick={() => window.location.reload()}>
                โหลดใหม่
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * fallback ระดับฉาก — ให้ boundary ที่ครอบ LobbyScene/BattleScene ใช้ผ่าน prop `fallback`
 * ต่างจากจอ crash เต็มแอป (ปุ่มโหลดใหม่ทั้งหน้า) ตรงที่พาผู้เล่นถอยกลับในแอปแทน
 */
export function SceneCrashFallback({
  message,
  onBack,
  backLabel,
}: {
  message: string
  onBack: () => void
  backLabel: string
}) {
  return (
    <div className={styles.sceneScreen}>
      <div className={styles.panel}>
        <h2 className={styles.title}>เกิดข้อผิดพลาด</h2>
        <p className={styles.message}>{message}</p>
        <ErrorCodeTag code="BOUNDARY_RENDER_CRASH" />
        <div className={styles.actions}>
          <button className={styles.reload} onClick={onBack}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
