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
  .then(async ({ default: App }) => {
    /*
      ชั้นกันพลาดของ cache อีเมล/guest — เดิมเป็น side effect ที่ module scope ของ
      accountRepository.supabase.ts จึงทำงานทันทีที่ "ใครก็ตาม" import ไฟล์นั้น (รวมถึงเทสต์)
      และยกเลิกไม่ได้ ย้ายมาเรียกที่นี่จุดเดียว — อยู่ใน .then() โดยตั้งใจ เพื่อให้ error
      (เช่น env ของ Supabase หาย) กลายเป็น promise reject ที่ .catch ด้านล่างจับได้
      เหมือนกรณีโหลด App ไม่สำเร็จ ไม่ใช่สคริปต์พังเงียบ ๆ ก่อน React ขึ้นจอ
    */
    const { initAuthCache } = await import('./data/accountRepository.supabase.ts')
    initAuthCache()

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
    /*
      tier 'visible' บนเส้นทางนี้ไม่มีผู้รับ — GlobalErrorBanner ไม่เคยถูก mount (React บูตไม่ผ่าน
      ถึงได้มาอยู่ตรงนี้) และบรรทัดถัดไปเขียนทับ #root ทั้งก้อนอยู่แล้ว จอนี้จึงเป็นสิ่งเดียวที่
      ผู้เล่นได้เห็นจริง ๆ

      มันบอกให้ "แจ้งผู้ดูแลระบบ" โดยไม่ให้อะไรไปแจ้งเลยสักอย่าง — ใส่รหัสลงไปในตัวอักษรที่ก๊อป
      ได้ ตัว error ดิบไม่ใส่ (อยู่ใน console ผ่าน reportError แล้ว และ DOM ของหน้าที่พังไม่ใช่
      ที่สำหรับข้อความภายใน)
    */
    rootElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:sans-serif;text-align:center;color:#eee;background:#1a1a2e;">
        <div>
          <h1 style="font-size:1.25rem;margin-bottom:8px;">โหลดเกมไม่สำเร็จ</h1>
          <p style="opacity:0.8;">กรุณาลองรีเฟรชหน้านี้อีกครั้ง หากยังไม่หายให้แจ้งผู้ดูแลระบบ</p>
          <p style="opacity:0.55;margin-top:12px;font-size:0.8rem;user-select:all;">APP_BOOTSTRAP_FAIL</p>
        </div>
      </div>
    `
  })
