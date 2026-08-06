import { reportError } from './errors/reportError'

/**
 * ดัก error ที่เกิดนอก React render cycle — R3F useFrame,
 * async callback ที่ไม่มีใครใส่ .catch() ไว้
 *
 * React ErrorBoundary จับ error ระหว่าง render ได้เท่านั้น ตัวนี้เป็นตาข่ายสุดท้าย
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    reportError('GLOBAL_UNCAUGHT', 'visible', event.error ?? event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportError('GLOBAL_REJECTION', 'visible', event.reason)
  })
}
