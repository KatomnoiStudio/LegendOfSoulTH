import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * ตัวจับ exception ระดับบนสุดของ React tree
 *
 * ไม่จับ error ที่เกิดนอก React render cycle (R3F useFrame,
 * async callback) — ตัวนั้นดักด้วย window 'error'/'unhandledrejection' แยกใน main.tsx
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] uncaught render error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.screen}>
          <div className={styles.panel}>
            <h1 className={styles.title}>เกิดข้อผิดพลาด</h1>
            <p className={styles.message}>
              เกมพบปัญหาที่ไม่คาดคิด ลองโหลดหน้าใหม่อีกครั้ง
            </p>
            <button className={styles.reload} onClick={() => window.location.reload()}>
              โหลดใหม่
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
