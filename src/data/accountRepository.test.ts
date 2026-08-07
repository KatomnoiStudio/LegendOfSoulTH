import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getSessionPlayer, importSave, login, register, savePlayer } from './accountRepository'

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

/*
  ผู้เล่นเปิดเกมพร้อมกันสองแท็บได้ (localStorage ใช้ร่วมกันทั้งเบราว์เซอร์) — saveDb ต้องปฏิเสธ
  การเขียนทับถ้าอีกแท็บเขียนแซงไปแล้วตั้งแต่ตอนแท็บนี้ loadDb ไม่งั้นข้อมูลของแท็บที่เขียน
  ก่อนหายไปเงียบ ๆ โดยไม่มีอะไรบอก (resilience-canary, 2026-08-07)
*/
describe('saveDb — เขียนชนกันข้ามแท็บต้องไม่ทับข้อมูลกันเงียบ ๆ', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('แท็บ A ถือสำเนาเก่าไว้ระหว่างแท็บ B เขียนแซง — แท็บ A save ไม่ผ่าน ข้อมูลแท็บ B ไม่ถูกทับ', async () => {
    const registered = await register('race@b.co', 'passw0rd!')
    expect(registered.ok).toBe(true)
    if (!registered.ok) return

    // แท็บ A "ถือ" สำเนาฐานข้อมูล ณ ตอนสมัครเสร็จไว้ในมือ (rev ก่อนแท็บ B เขียน)
    const staleRaw = localStorage.getItem('los:db:v1')
    expect(staleRaw).not.toBeNull()

    // แท็บ B เขียนสำเร็จไปแล้วจริง ๆ ก่อนแท็บ A — rev ขยับขึ้นในสตอเรจจริง
    const tabB = await savePlayer({ ...registered.player, name: 'จากแท็บ B' })
    expect(tabB).toBe(true)

    // แท็บ A save ด้วยสำเนาที่ค้างอยู่ในมือ — เลียนแบบ race จริงด้วยการทำให้ getItem
    // ครั้งแรก (loadDb ภายใน savePlayer ของแท็บ A) เห็นสำเนาเก่าที่ยึดไว้ตอนต้น ส่วน getItem
    // ครั้งถัดไป (การเช็ค rev ปัจจุบันข้างใน saveDb) อ่านค่าจริงบน localStorage ตามปกติ
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => staleRaw)
    const tabA = await savePlayer({ ...registered.player, name: 'จากแท็บ A' })
    spy.mockRestore()

    expect(tabA).toBe(false)
    expect((await getSessionPlayer())?.name).toBe('จากแท็บ B')
  })
})

/*
  เดิม session ไม่มีวันหมดอายุเลย — เขียนแค่ uid/email ไม่มี timestamp ผู้เล่นที่ล็อกอินครั้ง
  เดียวจะเข้าเกมได้ตลอดไปไม่มีเงื่อนไข ต่อให้ปิดแท็บทิ้งไว้เป็นปี (รายงานจาก HetCreep 2026-08-07)
*/
describe('session — หมดอายุแบบ sliding window ไม่ใช่ค้าง login ตลอดไป', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('ไม่แตะเลย 31 วัน — session หมดอายุ ต้องล็อกอินใหม่', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-01-01T00:00:00.000Z')
    vi.setSystemTime(now)

    const registered = await register('sleepy@b.co', 'passw0rd!')
    expect(registered.ok).toBe(true)
    expect(await getSessionPlayer()).not.toBeNull()

    vi.setSystemTime(new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000))
    expect(await getSessionPlayer()).toBeNull()
  })

  test('เล่นต่อเนื่องทุกไม่กี่วัน — session ต่ออายุ (sliding) ไม่หลุดแม้รวมเกิน 30 วัน', async () => {
    vi.useFakeTimers()
    const start = new Date('2026-01-01T00:00:00.000Z')
    vi.setSystemTime(start)

    const registered = await register('active@b.co', 'passw0rd!')
    expect(registered.ok).toBe(true)

    // เข้าเกมทุก 10 วัน รวม 6 รอบ (60 วัน) — ถ้าเป็นวันหมดอายุตายตัวจะหลุดตั้งแต่รอบที่ 4
    for (let i = 1; i <= 6; i++) {
      vi.setSystemTime(new Date(start.getTime() + i * 10 * 24 * 60 * 60 * 1000))
      expect(await getSessionPlayer()).not.toBeNull()
    }
  })

  test('session รูปแบบเก่าที่ไม่มี expiresAt เลย ถือว่าหมดอายุทันที ไม่ใช่ค้าง login ไม่จำกัดเวลา', async () => {
    const registered = await register('legacy@b.co', 'passw0rd!')
    expect(registered.ok).toBe(true)

    // จำลอง session ที่เขียนไว้ก่อนมีฟีเจอร์นี้ (ไม่มี expiresAt)
    const raw = localStorage.getItem('los:session:v1')
    expect(raw).not.toBeNull()
    const legacy = { ...JSON.parse(raw as string) }
    delete legacy.expiresAt
    localStorage.setItem('los:session:v1', JSON.stringify(legacy))

    expect(await getSessionPlayer()).toBeNull()
  })
})
