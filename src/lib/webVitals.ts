/**
 * Local-only Core Web Vitals (LCP/INP/CLS) → console.debug ตอน dev
 *
 * ไม่ส่งไปไหนเลย โปรเจกต์นี้ตัดสินใจแล้วว่าไม่เอา external telemetry
 * (ดู .agents/rules/ecc/web/observability.md) — นี่แค่ให้ dev เห็นเลขบนเครื่องตัวเอง
 *
 * import('web-vitals') เป็น dynamic + gate ด้วย import.meta.env.DEV เพื่อให้ vite
 * tree-shake ทิ้งทั้งก้อนตอน build production — ไม่มีต้นทุนใน bundle จริง
 */
export function installWebVitalsLogger(): void {
  if (!import.meta.env.DEV) return
  import('web-vitals').then(({ onLCP, onINP, onCLS }) => {
    onLCP((metric) => console.debug('[web-vitals] LCP', metric.value, metric))
    onINP((metric) => console.debug('[web-vitals] INP', metric.value, metric))
    onCLS((metric) => console.debug('[web-vitals] CLS', metric.value, metric))
    return undefined
  })
}
