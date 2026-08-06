import { useEffect, useState } from 'react'

/** เว้นระยะเช็คแต่ละรอบ — ไม่ถี่จนรบกวน GitHub Pages เปล่า ๆ */
const CHECK_INTERVAL_MS = 5 * 60 * 1000

/** ดึงชื่อไฟล์ entry script (มี content-hash ต่อท้ายเสมอ — เปลี่ยนทุกครั้งที่ build ใหม่) */
function extractEntryScript(html: string): string | null {
  return html.match(/<script[^>]*\ssrc="([^"]+)"/)?.[1] ?? null
}

/**
 * ตรวจว่ามี build ใหม่ถูก deploy ขึ้น GitHub Pages ระหว่างที่ผู้เล่นเปิดแท็บค้างไว้หรือยัง
 *
 * เทียบชื่อไฟล์ entry script ที่ฝังมากับหน้าปัจจุบันกับที่ fetch `index.html` สดมาดูใหม่ —
 * ชื่อไฟล์เปลี่ยนเมื่อไหร่แปลว่า build เปลี่ยนแล้วจริง (ไม่ใช่แค่ cache stale)
 * เช็คทุก 5 นาที + ทันทีที่กลับมาโฟกัสแท็บ (visibilitychange)
 *
 * ทำงานเฉพาะ production build เท่านั้น — dev server ไม่มี content-hash ให้เทียบ
 */
export function useDeployWatcher(): boolean {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) return

    const currentEntry = document
      .querySelector('script[type="module"][src*="/assets/"]')
      ?.getAttribute('src')
    if (!currentEntry) return

    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}index.html`, { cache: 'no-store' })
        if (!res.ok) return
        const latestEntry = extractEntryScript(await res.text())
        if (latestEntry && latestEntry !== currentEntry) setHasUpdate(true)
      } catch {
        // เน็ตหลุดชั่วคราว/ออฟไลน์ — เงียบไว้ รอบถัดไปเช็คใหม่เอง
      }
    }

    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return hasUpdate
}
