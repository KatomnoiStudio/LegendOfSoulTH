/**
 * ดัก error ที่เกิดนอก React render cycle — R3F useFrame,
 * async callback ที่ไม่มีใครใส่ .catch() ไว้
 *
 * React ErrorBoundary จับ error ระหว่าง render ได้เท่านั้น ตัวนี้เป็นตาข่ายสุดท้าย
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    console.error('[global] uncaught error', event.error ?? event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[global] unhandled promise rejection', event.reason)
  })
}
