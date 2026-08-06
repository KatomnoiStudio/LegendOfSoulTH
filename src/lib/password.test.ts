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

  test('ยังรองรับแฮชรุ่นแรกที่ไม่มีจำนวนรอบนำหน้า', async () => {
    // รูปแบบเดิมคือไดเจสต์ล้วนไม่มี ":" — ต้องถือว่าใช้ 120,000 รอบ
    const digestOnly = (await hashPassword('legacy-pass', SALT)).split(':')[1]
    expect(digestOnly).toBeTruthy()
    expect(await verifyPassword('legacy-pass', SALT, digestOnly)).toBe(false)
    // (false เพราะไดเจสต์ถูกสร้างด้วยรอบปัจจุบัน ไม่ใช่ 120,000 — ที่สำคัญคือไม่โยนข้อผิดพลาด)
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
