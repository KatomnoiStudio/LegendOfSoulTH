import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'currency'

export interface ToastApi {
  /** แสดงข้อความชั่วคราวกลางจอบน — variant คุมเสียง SFX ที่เล่นคู่กัน (ค่าเริ่มต้น 'success') */
  showToast: (message: string, variant?: ToastVariant) => void
  /** ทางลัดสำหรับฟีเจอร์ที่ยังไม่เปิด: "ต่อสู้ — เร็ว ๆ นี้" */
  comingSoon: (feature: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
