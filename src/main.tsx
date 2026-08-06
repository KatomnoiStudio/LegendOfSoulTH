import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.tsx'
import { GlobalErrorBanner } from './components/GlobalErrorBanner/GlobalErrorBanner.tsx'
import { applyA11ySettings, getA11ySettings } from './lib/a11ySettings.ts'
import { installGlobalErrorHandlers } from './lib/globalErrorHandlers.ts'

installGlobalErrorHandlers()
// ใส่ค่าตั้งค่าการเข้าถึงที่เคยบันทึกไว้ลง <html> ตั้งแต่เฟรมแรก ไม่ต้องรอเปิด SettingsModal
applyA11ySettings(getA11ySettings())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/*
        อยู่นอก <App /> ตั้งใจ — มันต้องแสดง error ที่ถูกรายงานจากนอก React ได้ด้วย
        (globalErrorHandlers, useAuth ที่อยู่เหนือ ToastProvider) จึงห้ามพึ่ง context ใด ๆ
      */}
      <GlobalErrorBanner />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
