import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * base ของ GitHub Pages คือ "/<ชื่อ repo>/" เสมอ — จึงต้องอ่านชื่อ repo ที่ deploy จริง
 * ไม่ใช่เขียนตายตัว
 *
 * ของเดิมเขียน '/LegendOfSoulTH/' ไว้ตรง ๆ ซึ่งถูกเฉพาะกับ repo ต้นทาง พอ fork ไปชื่ออื่น
 * (เช่น `nustanakritwithai/GameTurnBase` → เสิร์ฟที่ `/GameTurnBase/`) asset ทุกตัวจะยิงไป
 * `/LegendOfSoulTH/assets/...` แล้ว 404 ทั้งหมด ผลคือ **หน้าขาวสนิท** ไม่มี error ให้เห็น
 * เพราะ `<div id="root">` ว่างเปล่าโดยที่ HTML เองตอบ 200 ปกติ
 *
 * `GITHUB_REPOSITORY` เป็น "owner/repo" ที่ GitHub Actions ใส่ให้ทุก workflow อยู่แล้ว
 * จึงได้ base ที่ถูกทั้ง repo ต้นทาง fork ปัจจุบัน และ fork ใด ๆ ในอนาคต โดยไม่ต้องแก้ไฟล์นี้อีก
 *
 * `BASE_PATH` เปิดช่องให้เขียนทับด้วยมือสำหรับ deploy target อื่น (custom domain ที่เสิร์ฟจาก
 * root ให้ตั้งเป็น '/')
 *
 * ค่าสำรอง '/LegendOfSoulTH/' ใช้เมื่อ build นอก CI ที่ไม่มีตัวแปรพวกนี้ — คงพฤติกรรมเดิมไว้
 * ไม่ให้ `npm run build` บนเครื่องของใครเปลี่ยนผลลัพธ์ไปจากที่เคยเป็น
 */
export function resolveBasePath(
  env: { GITHUB_REPOSITORY?: string; BASE_PATH?: string } = process.env,
): string {
  if (env.BASE_PATH) return env.BASE_PATH
  const repoName = env.GITHUB_REPOSITORY?.split('/')[1]
  return repoName ? `/${repoName}/` : '/LegendOfSoulTH/'
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // base ใช้เฉพาะตอน build จริงสำหรับ GitHub Pages เท่านั้น
  // ถ้าใช้ตอน dev ด้วย ทุก asset ที่ path ตรง ๆ ใน public/ (ไอคอน, ภาพตัวละคร, .glb)
  // จะ 404 หมด เพราะ dev server จะย้ายไปเสิร์ฟใต้ subpath แทนที่จะเป็น /
  base: command === 'build' ? resolveBasePath() : '/',
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
