/**
 * ค่าจดจำอีเมลล่าสุดที่กรอกตอนล็อกอิน — ความสะดวก UI ล้วน ๆ ไม่ใช่ข้อมูลบัญชี/สถานะผู้เล่น
 * จึงไม่ผ่าน storage.ts/useAuth.ts (ทั้งสองไฟล์นั้นคุมเฉพาะ player state ที่ต้องคงเส้นคงวา)
 */
const LAST_EMAIL_KEY = 'los:last-email'

export function getLastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch (error) {
    console.error('[authUi] อ่าน last-email ไม่ได้', error)
    return ''
  }
}

export function setLastEmail(email: string): void {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase())
  } catch (error) {
    // private browsing / storage blocked — ไม่ critical แต่ log ไว้เผื่อสืบทีหลัง
    console.error('[authUi] บันทึก last-email ไม่ได้', error)
  }
}
