import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.tsx'
import { applyA11ySettings, getA11ySettings } from './lib/a11ySettings.ts'
import { installGlobalErrorHandlers } from './lib/globalErrorHandlers.ts'

installGlobalErrorHandlers()
// ใส่ค่าตั้งค่าการเข้าถึงที่เคยบันทึกไว้ลง <html> ตั้งแต่เฟรมแรก ไม่ต้องรอเปิด SettingsModal
applyA11ySettings(getA11ySettings())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
