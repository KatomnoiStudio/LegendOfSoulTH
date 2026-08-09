import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.tsx'
import { GlobalErrorBanner } from './components/GlobalErrorBanner/GlobalErrorBanner.tsx'
import { reportError } from './lib/errors/reportError.ts'
import { applyA11ySettings, getA11ySettings } from './lib/a11ySettings.ts'
import { installGlobalErrorHandlers } from './lib/globalErrorHandlers.ts'
import { installWebVitalsLogger } from './lib/webVitals.ts'

installGlobalErrorHandlers()
installWebVitalsLogger()
// ใส่ค่าตั้งค่าการเข้าถึงที่เคยบันทึกไว้ลง <html> ตั้งแต่เฟรมแรก ไม่ต้องรอเปิด SettingsModal
applyA11ySettings(getA11ySettings())

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

/*
  import('./App.tsx') แบบ dynamic ตั้งใจ ไม่ใช่ static import เดิม

  สายการ import ของ App ลึกลงไปถึง useAuth -> accountRepository.supabase -> supabaseClient
  ซึ่ง throw ทันทีตอน evaluate module ถ้าไม่มี VITE_SUPABASE_URL/ANON_KEY (ดู supabaseClient.ts)
  ถ้ายังเป็น static import เดิม การ throw นั้นจะพังทั้งไฟล์นี้ตั้งแต่ก่อนบรรทัด createRoot
  ได้รันด้วยซ้ำ — ErrorBoundary ด้านล่างจับไม่ได้เพราะ React ยังไม่ทันขึ้นจอเลย เคยเกิดจริง
  ตอน deploy ลืมตั้ง env secret ทั้งเว็บขึ้นจอขาวเปล่าไม่มีข้อความอะไรให้ผู้เล่นเห็น

  dynamic import() ต่างจาก static ตรงที่ error ระหว่าง evaluate module (รวมถึง dependency
  ของมัน) กลายเป็น promise reject แทนที่จะพังสคริปต์ตรง ๆ — จับได้ด้วย .catch() ปกติ
*/
import('./App.tsx')
  .then(({ default: App }) => {
    root.render(
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
    return undefined
  })
  .catch((err: unknown) => {
    reportError('APP_BOOTSTRAP_FAIL', 'visible', err)
    rootElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:sans-serif;text-align:center;color:#eee;background:#1a1a2e;">
        <div>
          <h1 style="font-size:1.25rem;margin-bottom:8px;">โหลดเกมไม่สำเร็จ</h1>
          <p style="opacity:0.8;">กรุณาลองรีเฟรชหน้านี้อีกครั้ง หากยังไม่หายให้แจ้งผู้ดูแลระบบ</p>
        </div>
      </div>
    `
  })
