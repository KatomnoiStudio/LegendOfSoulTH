/**
 * รายชื่ออีเมลที่ใช้คำสั่งผู้ดูแลได้ (ช่องคำสั่งในลอบบี้ — ดู src/components/CommandConsole/)
 *
 * ⚠️ นี่ไม่ใช่ระบบความปลอดภัย — เกมนี้เป็น client-only ล้วน ไม่มีหลังบ้าน
 * ข้อมูลบัญชีทั้งหมดอยู่ใน localStorage ที่ผู้เล่นแก้เองได้ และการเช็คนี้ก็รันใน
 * เบราว์เซอร์ของผู้เล่นเอง ใครเปิด devtools เป็นก็ข้ามได้ทันที
 * มีไว้กันกดพลาด/กันคนทั่วไปเห็นช่องคำสั่งเฉย ๆ ไม่ใช่ขอบเขตความปลอดภัยจริง
 * (ข้อจำกัดนี้ถูกระบุไว้แล้วใน SECURITY.md หัวข้อ Out of Scope)
 *
 * เมื่อมี backend จริงเมื่อไหร่ การตรวจสิทธิ์ต้องย้ายไปฝั่งเซิร์ฟเวอร์ทั้งหมด
 * ห้ามเชื่อค่าที่ client ส่งมา
 */
const ADMIN_EMAILS: readonly string[] = ['kaoshock123@gmail.com']

/** เทียบแบบไม่สนตัวพิมพ์เล็กใหญ่/ช่องว่างหัวท้าย ให้ตรงกับที่ accountRepository เก็บอีเมล */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return ADMIN_EMAILS.includes(normalized)
}
