import { describe, expect, test } from 'vitest'
import { createSalt, hashPassword, needsRehash, verifyPassword } from './password'

/**
 * แฮชที่เก็บไว้เป็นข้อมูลที่ผู้เล่นแก้เองได้ — ทั้ง localStorage และไฟล์ save ที่นำเข้ามา
 * เทสต์ชุดนี้จึงยิงค่าที่พังไปที่ตัวแยกจำนวนรอบโดยเฉพาะ ไม่ใช่แค่เส้นทางปกติ
 *
 * ก่อนแก้ จำนวนรอบถูกส่งเข้า WebCrypto ตรง ๆ ผลคือ NaN/0 ทำให้ deriveBits โยนข้อผิดพลาด
 * ออกมาเป็น unhandled rejection (login ค้าง ไม่ได้ผลลัพธ์ false) และตัวเลขมหาศาลทำให้
 * เบราว์เซอร์คำนวณค้างทั้งแท็บ
 */

const SALT = createSalt()

describe('verifyPassword', () => {
  test('ยอมรับรหัสที่ถูกต้อง และปฏิเสธรหัสที่ผิด', async () => {
    const hash = await hashPassword('correct-horse', SALT)
    expect(await verifyPassword('correct-horse', SALT, hash)).toBe(true)
    expect(await verifyPassword('wrong-horse', SALT, hash)).toBe(false)
  })

  test('คืน false แทนการโยนข้อผิดพลาด เมื่อจำนวนรอบในแฮชใช้ไม่ได้', async () => {
    const malformed = [
      'abc:AAAA', // ไม่ใช่ตัวเลข -> NaN
      ':AAAA', // ว่าง -> 0
      '0:AAAA', // ศูนย์ WebCrypto ไม่รับ
      '-5:AAAA', // ติดลบ
      '1.5:AAAA', // ไม่ใช่จำนวนเต็ม
      '999999999999:AAAA', // มากเกินเพดาน ถ้าปล่อยผ่านจะค้างทั้งแท็บ
    ]

    for (const hash of malformed) {
      await expect(verifyPassword('anything', SALT, hash)).resolves.toBe(false)
    }
  })

  test('แฮชรุ่นแรกที่ไม่มีจำนวนรอบนำหน้าถูกตีความว่า 120,000 รอบ ไม่ใช่ค่าที่ใช้ไม่ได้', async () => {
    /*
      รูปแบบเดิมคือไดเจสต์ล้วนไม่มี ":" ตัวแยกจึงต้องคืน 120,000 ไม่ใช่ null

      ยืนยันทางอ้อมผ่าน needsRehash: ถ้าตีความเป็นค่าที่ใช้ไม่ได้จะได้ false เหมือนแฮชพัง
      แต่ถ้าตีความเป็น 120,000 ซึ่งน้อยกว่าค่าปัจจุบันจะได้ true (สั่งรีแฮชอัปเกรด)
      ยืนยันตรง ๆ ด้วย verifyPassword ไม่ได้ เพราะ hashPassword สร้างได้แต่แฮชรอบปัจจุบัน
      ไม่มีทางสร้างไดเจสต์ 120,000 รอบจริงจากสิ่งที่โมดูลนี้ export ออกมา
    */
    const digestOnly = (await hashPassword('legacy-pass', SALT)).split(':')[1]
    expect(digestOnly).toBeTruthy()
    expect(needsRehash(digestOnly)).toBe(true)

    // และต้องไม่โยนข้อผิดพลาดออกมา แม้ไดเจสต์จะไม่ตรง (สร้างด้วยรอบปัจจุบัน ไม่ใช่ 120,000)
    await expect(verifyPassword('legacy-pass', SALT, digestOnly)).resolves.toBe(false)
  })
})

describe('needsRehash', () => {
  test('true เมื่อรอบน้อยกว่าค่าปัจจุบัน, false เมื่อเท่ากับค่าปัจจุบัน', async () => {
    expect(needsRehash('120000:AAAA')).toBe(true)
    expect(needsRehash(await hashPassword('x', SALT))).toBe(false)
  })

  test('false เมื่อแฮชใช้ไม่ได้ — จะได้ไม่วนรีแฮชบัญชีที่พังอยู่แล้ว', () => {
    expect(needsRehash('abc:AAAA')).toBe(false)
    expect(needsRehash('0:AAAA')).toBe(false)
    expect(needsRehash('999999999999:AAAA')).toBe(false)
  })
})
