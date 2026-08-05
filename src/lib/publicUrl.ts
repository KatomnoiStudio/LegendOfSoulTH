/**
 * ต่อ path asset ใน public/ กับ Vite base URL
 *
 * `<img src="/ui/x.png">` หรือ CSS `url('/ui/x.png')` วิ่งตรงเข้า root ของโดเมนเสมอ
 * ไม่ใช่ root ของแอป — ตอน build จริงขึ้น GitHub Pages ที่ base เป็น '/GameTurnBase/'
 * (ไม่ใช่ '/') path พวกนี้เลยชี้ผิดที่ กลายเป็นรูปหาย (404) ทั้งที่ dev local ปกติดี
 * เพราะ dev server base เป็น '/' พอดี
 */
export function publicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
