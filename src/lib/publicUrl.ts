/**
 * ต่อ path asset ใน public/ กับ Vite base URL
 *
 * `<img src="/ui/x.png">` หรือ CSS `url('/ui/x.png')` วิ่งตรงเข้า root ของโดเมนเสมอ
 * ไม่ใช่ root ของแอป — ตอน build จริงขึ้น GitHub Pages ที่ base เป็น '/LegendOfSoulTH/'
 * (ไม่ใช่ '/') path พวกนี้เลยชี้ผิดที่ กลายเป็นรูปหาย (404) ทั้งที่ dev local ปกติดี
 * เพราะ dev server base เป็น '/' พอดี
 */
export function publicUrl(path: string): string {
  const environment = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env
  return `${environment?.BASE_URL ?? '/'}${path.replace(/^\//, '')}`
}
