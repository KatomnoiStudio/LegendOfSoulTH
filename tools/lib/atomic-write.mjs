/**
 * เขียนไฟล์แบบ atomic — temp ข้าง ๆ ปลายทาง แล้ว rename ทับ
 *
 * ── ปัญหาที่ helper นี้ปิด ────────────────────────────────────────────────
 * audit 2026-08-12 §0b.3 พบ anti-pattern เดียวกันสามที่: tool เขียนทับ target ของตัวเองตรง ๆ
 * ถ้าโปรเซสตายกลาง write ไฟล์ปลายทางจะเหลือสถานะครึ่ง ๆ — ไม่ใช่ทั้งของเก่าและไม่ใช่ทั้งของใหม่
 *
 * `rename()` บน filesystem เดียวกันเป็น atomic ตามสเปก POSIX และบน Windows (`MoveFileEx` ที่
 * Node เรียกให้เมื่อปลายทางมีอยู่แล้ว) ผลคือปลายทางมีได้แค่สองสถานะ: ของเก่าครบ หรือของใหม่ครบ
 * ไม่มีช่องให้ crash ทิ้งไฟล์พังไว้
 *
 * ── ทำไม temp ต้องอยู่โฟลเดอร์เดียวกับปลายทาง ────────────────────────────
 * rename ข้าม filesystem ไม่ atomic (Node จะ fallback เป็น copy+unlink ซึ่งพังกลางทางได้)
 * temp จึงวางข้างปลายทางเสมอ ไม่ใช่ใน os.tmpdir()
 *
 * ── สิ่งที่ helper นี้ไม่ได้ทำ ───────────────────────────────────────────
 * ไม่ fsync — ป้องกัน "โปรเซสตาย" ไม่ใช่ "ไฟดับ" ระดับหลังต้องแลกกับความเร็วของ build ซึ่งไม่คุ้ม
 * สำหรับ tool ที่ output เป็นของ derive ใหม่ได้
 *
 * **ไม่รองรับการเขียนปลายทางเดียวกันพร้อมกัน** — วัดแล้วบน Windows การ rename ทับไฟล์ที่มีอยู่
 * ขณะอีกโปรเซส/handle ถืออยู่ล้มด้วย EPERM (POSIX ไม่เป็น) ทุก tool ที่ใช้ helper นี้วนเขียนแบบ
 * sequential และปลายทางไม่ซ้ำกัน ข้อจำกัดนี้จึงไม่กระทบใคร แต่บันทึกไว้เพราะคนที่เอาไปใช้ใน
 * Promise.all บนปลายทางเดียวจะเจอ และมันจะดูเหมือนบั๊กของ helper
 */
import { rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

let counter = 0

/** พาธ temp ข้างปลายทาง — ต่อ pid + counter กันชนเมื่อรันหลายโปรเซสหรือหลายไฟล์พร้อมกัน */
export function tempPathFor(dest) {
  counter += 1
  return join(dirname(dest), `.${process.pid}-${counter}.tmp`)
}

/**
 * เขียน Buffer/string ลง dest แบบ atomic
 *
 * @param {string} dest ปลายทางจริง
 * @param {Buffer|string} data
 */
export async function writeFileAtomic(dest, data) {
  const temp = tempPathFor(dest)
  try {
    await writeFile(temp, data)
    await rename(temp, dest)
  } catch (cause) {
    await unlink(temp).catch(() => {})
    throw cause
  }
}

/**
 * ให้ producer เขียนลง temp เอง แล้วค่อย rename ทับปลายทาง
 *
 * สำหรับกรณีที่ผู้เขียนไม่ได้ให้ Buffer มา แต่รับพาธไปเขียนเอง — `sharp(...).toFile(path)`
 * เป็นเคสหลักในโปรเจกต์นี้ producer จะถูกเรียกด้วยพาธ temp และผลของมันถูกส่งกลับให้ผู้เรียก
 *
 * @param {string} dest
 * @param {(tempPath: string) => Promise<T>} produce
 * @returns {Promise<T>} ค่าที่ produce คืนมา (เช่น metadata ของ sharp)
 * @template T
 */
export async function produceFileAtomic(dest, produce) {
  const temp = tempPathFor(dest)
  try {
    const result = await produce(temp)
    await rename(temp, dest)
    return result
  } catch (cause) {
    await unlink(temp).catch(() => {})
    throw cause
  }
}
