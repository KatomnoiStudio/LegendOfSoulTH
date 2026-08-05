import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // '/LegendOfSoulTH/' ใช้เฉพาะตอน build จริงสำหรับ GitHub Pages เท่านั้น
  // ถ้าใช้ตอน dev ด้วย ทุก asset ที่ path ตรง ๆ ใน public/ (ไอคอน, ภาพตัวละคร, .glb)
  // จะ 404 หมด เพราะ dev server จะย้ายไปเสิร์ฟใต้ /LegendOfSoulTH/ แทนที่จะเป็น /
  base: command === 'build' ? '/LegendOfSoulTH/' : '/',
  plugins: [react()],
  build: {
    // ฉาก 3D (three.js) ถูกแยกเป็น chunk แยกและโหลดแบบ lazy อยู่แล้ว
    // จึงยกเพดานเตือนขึ้นเพื่อไม่ให้ warning รบกวนทุกครั้งที่ build
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
  },
}))
