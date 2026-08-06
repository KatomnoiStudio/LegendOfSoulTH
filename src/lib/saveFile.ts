/**
 * ดาวน์โหลดข้อมูลบัญชีเป็นไฟล์ .json
 *
 * แยกออกมาเพราะมีสองที่เรียก: ปุ่มสำรองข้อมูลในหน้าตั้งค่า (ผ่าน useAuth) และปุ่มกู้ข้อมูล
 * บนหน้าจอ crash ของ ErrorBoundary ซึ่งเป็น class component จึงใช้ hook ไม่ได้
 * ถ้าปล่อยให้ต่างคนต่างเขียน ชื่อไฟล์กับวิธี revoke URL จะหลุดจากกันวันหลัง
 */
export function downloadSaveJson(json: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `legend-of-soul-th-save-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}
