import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorCodeTag } from '../ErrorCodeTag/ErrorCodeTag'
import { reportError } from '../../lib/errors/reportError'
import { downloadSaveJson } from '../../lib/saveFile'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  /** จอสำรองเมื่อ crash — ไม่ใส่ = จอเต็มจอปกติ (ใช้ที่จุดครอบทั้งแอปใน main.tsx) */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  /** ผลของการกดปุ่มสำรองข้อมูล — null คือยังไม่ได้กด */
  backupMessage: string | null
}

/**
 * ตัวจับ exception ระดับบนสุดของ React tree
 *
 * ไม่จับ error ที่เกิดนอก React render cycle (R3F useFrame,
 * async callback) — ตัวนั้นดักด้วย window 'error'/'unhandledrejection' แยกใน main.tsx
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, backupMessage: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, backupMessage: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('BOUNDARY_RENDER_CRASH', 'visible', error, { componentStack: info.componentStack })
  }

  /*
    ให้ผู้เล่นรู้สถานะข้อมูลของตัวเองก่อนโหลดหน้าใหม่

    ── แก้คำอธิบายเดิม 2026-08-10 ────────────────────────────────────────────
    ตรงนี้เคยเขียนว่า "เกมนี้เก็บทุกอย่างไว้ใน localStorage ไม่มี backend ให้กู้คืน" ซึ่งเลิกจริง
    ตั้งแต่ย้ายมา Supabase — ความคืบหน้าอยู่บนเซิร์ฟเวอร์แล้ว และข้อความเก่านั่นเองคือเหตุผล
    ที่ปุ่มนี้ถูกต่อไว้กับ accountRepository ตัว localStorage เดิม ซึ่ง readActiveSession()
    ของมันอ่านคีย์ที่ backend ปัจจุบันไม่เคยเขียน ผลคือปุ่มตอบ "ยังไม่ได้ล็อกอิน" ทุกครั้ง
    100% บนจอเดียวที่บอกผู้เล่นให้รีบเซฟข้อมูล

    ตอนนี้เรียก backend จริงตัวเดียวกับที่ useAuth ใช้ ผู้เล่นจึงได้คำตอบที่เป็นความจริง
    (ข้อมูลอยู่บนเซิร์ฟเวอร์แล้ว ไม่ต้องกู้อะไรจากเครื่องนี้) แทนคำตอบที่ผิดเสมอ

    เรียก repository ตรง ๆ ไม่ผ่าน useAuth เพราะ class component ใช้ hook ไม่ได้
    และ ณ จุดนี้ tree ข้างในพังไปแล้ว จะพึ่ง context อะไรก็ไม่ได้อยู่ดี

    ── ต้องเป็น dynamic import เท่านั้น ห้ามเปลี่ยนเป็น static ──────────────────
    สาย import ของ accountRepository.supabase ลึกลงไปถึง supabaseClient ซึ่ง throw ตั้งแต่
    ตอน evaluate module ถ้าไม่มี VITE_SUPABASE_URL/ANON_KEY ไฟล์นี้ถูก import แบบ static
    จาก main.tsx ก่อน createRoot ด้วยเหตุผลว่ามันคือตาข่ายรับ crash — static import ตรงนี้
    จึงย้ายการ throw นั้นมาไว้ก่อนที่ React จะขึ้นจอ แล้วได้จอขาวเปล่าแบบเดียวกับที่ main.tsx
    เขียนคอมเมนต์ยาวไว้ว่าเคยเกิดจริงตอน deploy ลืมตั้ง env secret
    ตัว boundary ต้องไม่พึ่ง backend จนกว่าผู้เล่นจะกดปุ่มนี้จริง ๆ
  */
  handleBackup = async () => {
    try {
      const { exportSave } = await import('../../data/accountRepository.supabase')
      const result = await exportSave()
      if (!result.ok) {
        /*
          กิ่ง ok:false เคยไม่รายงานอะไรเลย มีแต่ catch ที่รายงาน — ปุ่มที่ "ล้มเหลวอย่างสุภาพ"
          ทุกครั้งจึงเงียบสนิทในฝั่ง log ซึ่งเป็นเหตุผลตรง ๆ ที่บั๊กนี้อยู่ได้นานโดยไม่มีใครเห็น
        */
        reportError('SAVE_EXPORT_FAIL', 'silent', result.error)
        this.setState({ backupMessage: result.error })
        return
      }
      downloadSaveJson(result.json)
      this.setState({ backupMessage: 'ดาวน์โหลดไฟล์สำรองแล้ว' })
    } catch (error) {
      reportError('SAVE_EXPORT_FAIL', 'silent', error)
      this.setState({ backupMessage: 'สำรองข้อมูลไม่สำเร็จ' })
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className={styles.screen}>
          <div className={styles.panel}>
            <h1 className={styles.title}>เกิดข้อผิดพลาด</h1>
            <p className={styles.message}>
              เกมพบปัญหาที่ไม่คาดคิด ลองโหลดหน้าใหม่อีกครั้ง ความคืบหน้าของคุณถูกเก็บไว้
              บนเซิร์ฟเวอร์ ไม่ได้อยู่แค่ในเบราว์เซอร์นี้ หากพังซ้ำทุกครั้ง
              ให้แจ้งปัญหาพร้อมรหัสด้านล่าง
            </p>
            <ErrorCodeTag code="BOUNDARY_RENDER_CRASH" />
            <div className={styles.actions}>
              <button className={styles.reload} onClick={() => window.location.reload()}>
                โหลดใหม่
              </button>
              <button className={styles.backup} onClick={() => void this.handleBackup()}>
                สำรองข้อมูลเป็นไฟล์
              </button>
            </div>
            {this.state.backupMessage ? (
              <p className={styles.backupMessage} role="status">
                {this.state.backupMessage}
              </p>
            ) : null}
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
