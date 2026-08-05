import { createContext } from 'react'

export interface ToastApi {
  /** แสดงข้อความชั่วคราวกลางจอบน */
  showToast: (message: string) => void
  /** ทางลัดสำหรับฟีเจอร์ที่ยังไม่เปิด: "ต่อสู้ — เร็ว ๆ นี้" */
  comingSoon: (feature: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
