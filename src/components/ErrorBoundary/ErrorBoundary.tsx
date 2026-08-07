import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorCodeTag } from '../ErrorCodeTag/ErrorCodeTag'
import { exportSave } from '../../data/accountRepository'
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
    ให้ผู้เล่นเซฟข้อมูลออกมาก่อนโหลดหน้าใหม่

    เกมนี้เก็บทุกอย่างไว้ใน localStorage ของเบราว์เซอร์ ไม่มี backend ให้กู้คืน ถ้าหน้าจอ
    พังแล้วมีแต่ปุ่ม "โหลดใหม่" ผู้เล่นที่เจอปัญหาเรื้อรัง (เช่นข้อมูลในเครื่องเสียจนพังซ้ำทุกครั้ง)
    เหลือทางเดียวคือล้างข้อมูลทิ้งทั้งหมด ปุ่มนี้ทำให้เก็บไฟล์ไว้ก่อนได้ แล้วค่อยนำเข้ากลับทีหลัง

    เรียก accountRepository ตรง ๆ ไม่ผ่าน useAuth เพราะ class component ใช้ hook ไม่ได้
    และ ณ จุดนี้ tree ข้างในพังไปแล้ว จะพึ่ง context อะไรก็ไม่ได้อยู่ดี
  */
  handleBackup = async () => {
    try {
      const result = await exportSave()
      if (!result.ok) {
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
              เกมพบปัญหาที่ไม่คาดคิด ลองโหลดหน้าใหม่อีกครั้ง หากพังซ้ำทุกครั้ง
              ให้กดสำรองข้อมูลเก็บไฟล์ไว้ก่อน แล้วแจ้งปัญหาพร้อมรหัสด้านล่าง
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
