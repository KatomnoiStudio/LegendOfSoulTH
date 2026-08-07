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

  /*
    ต้องต่อ anchor เข้าเอกสารก่อนกด และห้าม revoke ทันที

    เบราว์เซอร์บางตัวไม่ยิง click ให้ element ที่ยังไม่อยู่ในเอกสาร และการ revoke URL
    ในบรรทัดถัดจาก click() ก็แข่งกับตัวดาวน์โหลดที่ยังอ่าน blob ไม่เสร็จ ผลคือได้ไฟล์เปล่า
    หรือไม่ได้ไฟล์เลย โดยไม่มี error ให้เห็น

    เดิมโค้ดนี้ต่อ anchor ไม่ครบและ revoke ทันที ตอนที่มีที่เรียกเดียว (ปุ่มสำรองในหน้าตั้งค่า)
    ความเสี่ยงยังจำกัด แต่ตอนนี้มันเป็นทางกู้ข้อมูลบนหน้าจอ crash ด้วย ซึ่งเป็นทางสุดท้าย
    ก่อนผู้เล่นจะล้างข้อมูลทิ้ง — ตรงนั้นพลาดแล้วไม่มีรอบสอง
  */
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  // ปล่อยให้ตัวดาวน์โหลดอ่าน blob ให้จบก่อนค่อยคืนหน่วยความจำ
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
