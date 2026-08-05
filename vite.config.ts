import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // ฉาก 3D (three.js) ถูกแยกเป็น chunk แยกและโหลดแบบ lazy อยู่แล้ว
    // จึงยกเพดานเตือนขึ้นเพื่อไม่ให้ warning รบกวนทุกครั้งที่ build
    chunkSizeWarningLimit: 1000,
  },
})
