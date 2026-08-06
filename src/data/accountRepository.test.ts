import { beforeEach, describe, expect, test } from 'vitest'
import { getSessionPlayer, importSave, login, register } from './accountRepository'

/*
  ไฟล์ save ที่นำเข้ามาคือข้อมูลจากภายนอกที่ผู้เล่นแก้เองได้ทั้งก้อน

  ก่อนแก้ ตัวตรวจดูแค่ฟิลด์ของบัญชี (exportVersion/uid/email/passwordHash) ไม่ได้ดู player
  ลำดับใน importSave คือเขียนบัญชีลง localStorage แล้วตั้ง session ให้เรียบร้อยก่อน
  จากนั้นค่อยอ่าน player ซึ่งจะโยนข้อผิดพลาดถ้าไม่มี ผลคือไฟล์ที่ไม่มี player ทำให้เกม
  เปิดไม่ได้ถาวร เพราะทุกครั้งที่โหลดหน้า getSessionPlayer จะเจอข้อผิดพลาดเดิมซ้ำ
  ทางออกเดียวคือให้ผู้เล่นล้าง localStorage เอง
*/

function saveFile(account: unknown): string {
  return JSON.stringify({ exportVersion: 1, exportedAt: new Date().toISOString(), account })
}

const VALID_PLAYER = {
  name: 'ผู้ทดสอบ',
  level: 1,
  currency: { gold: 0, gem: 0 },
}

describe('importSave', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('ปฏิเสธไฟล์ที่ไม่มี player แทนที่จะเขียนลงที่เก็บข้อมูลก่อนแล้วค่อยพัง', async () => {
    const result = await importSave(
      saveFile({ uid: '1234567890', email: 'a@b.co', passwordHash: '600000:AAAA' }),
    )

    expect(result.ok).toBe(false)
    // สำคัญกว่าค่า ok: ต้องไม่มีอะไรถูกเขียนทิ้งไว้เลย ไม่งั้นโหลดหน้าใหม่ก็ยังพังอยู่
    expect(localStorage.length).toBe(0)
    expect(await getSessionPlayer()).toBeNull()
  })

  test('ปฏิเสธไฟล์ที่ player มีอยู่แต่ไม่มีชื่อ', async () => {
    const result = await importSave(
      saveFile({
        uid: '1234567890',
        email: 'a@b.co',
        passwordHash: '600000:AAAA',
        player: { level: 1 },
      }),
    )

    expect(result.ok).toBe(false)
    expect(localStorage.length).toBe(0)
  })

  test('ยอมรับไฟล์ที่ครบถ้วน แล้วเข้าสู่ระบบให้ทันที', async () => {
    const result = await importSave(
      saveFile({
        uid: '1234567890',
        email: 'a@b.co',
        passwordHash: '600000:AAAA',
        player: VALID_PLAYER,
      }),
    )

    expect(result.ok).toBe(true)
    expect((await getSessionPlayer())?.name).toBe('ผู้ทดสอบ')
  })
})

/*
  loadDb เคยคืนค่าคงที่ตัวเดียวร่วมกันแทนที่จะเป็นอ็อบเจ็กต์ใหม่ ผู้เรียกทุกรายแก้ผลลัพธ์
  ตรง ๆ บัญชีจากการสมัครที่บันทึกไม่สำเร็จจึงค้างอยู่ในตัวคงที่นั้น แล้ว login ครั้งถัดไป
  ในแท็บเดิมผ่านได้ทั้งที่ไม่มีอะไรถูกบันทึกจริง
*/
describe('accounts — สถานะไม่รั่วข้ามการอ่านฐานข้อมูลแต่ละครั้ง', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('บัญชีที่สมัครในรอบก่อนไม่ค้างมาให้รอบใหม่เห็น หลังล้างที่เก็บข้อมูล', async () => {
    const registered = await register('ghost@b.co', 'passw0rd!')
    expect(registered.ok).toBe(true)

    localStorage.clear()

    const relogin = await login('ghost@b.co', 'passw0rd!')
    expect(relogin.ok).toBe(false)
  })
})
