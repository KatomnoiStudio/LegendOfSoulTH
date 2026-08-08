import { describe, expect, it } from 'vitest'
import { parseCommand, resolveCommandForSender } from './commands'

describe('parseCommand', () => {
  it('ข้อความว่างไม่ถือเป็นคำสั่ง', () => {
    expect(parseCommand('')).toBeNull()
    expect(parseCommand('   ')).toBeNull()
  })

  it('ข้อความแชทธรรมดาที่ไม่ขึ้นต้นด้วย / ไม่ถือเป็นคำสั่ง (ต้องส่งเป็นแชทปกติ)', () => {
    expect(parseCommand('สวัสดีครับ')).toBeNull()
    expect(parseCommand('givecharacter pig')).toBeNull()
  })

  it('/givecharacter pig แปลงชื่อย่อเป็น id จริงได้', () => {
    expect(parseCommand('/givecharacter pig')).toEqual({
      kind: 'give-character',
      characterId: 'pig-warrior',
    })
  })

  it('รับ id เต็มและชื่อไทยได้ด้วย', () => {
    expect(parseCommand('/givecharacter pig-warrior')).toEqual({
      kind: 'give-character',
      characterId: 'pig-warrior',
    })
    expect(parseCommand('/givecharacter ตือโป๊ยก่าย')).toEqual({
      kind: 'give-character',
      characterId: 'pig-warrior',
    })
  })

  it('ชื่อคำสั่งไม่สนตัวพิมพ์เล็กใหญ่', () => {
    expect(parseCommand('/GiveCharacter pig')).toEqual({
      kind: 'give-character',
      characterId: 'pig-warrior',
    })
  })

  it('ไม่ใส่ชื่อตัวละครต้องได้ข้อความบอกวิธีใช้', () => {
    expect(parseCommand('/givecharacter')).toEqual({
      kind: 'error',
      message: expect.stringContaining('/givecharacter <ตัวละคร>'),
    })
  })

  it('ตัวละครที่ไม่มีจริงต้องไม่ถูกเดาให้', () => {
    const result = parseCommand('/givecharacter dragon')
    expect(result?.kind).toBe('error')
  })

  it('/givegold แปลงจำนวนเป็นตัวเลขได้', () => {
    expect(parseCommand('/givegold 1000')).toEqual({ kind: 'give-gold', amount: 1000 })
  })

  it('/givegold จำนวนไม่ถูกต้องต้องได้ error', () => {
    expect(parseCommand('/givegold')?.kind).toBe('error')
    expect(parseCommand('/givegold -5')?.kind).toBe('error')
    expect(parseCommand('/givegold abc')?.kind).toBe('error')
  })

  it('/giveitem แปลง item_id + จำนวนได้', () => {
    expect(parseCommand('/giveitem spirit-incense 5')).toEqual({
      kind: 'give-item',
      itemId: 'spirit-incense',
      quantity: 5,
    })
  })

  it('/giveitem ไม่ครบ arg ต้องได้ error', () => {
    expect(parseCommand('/giveitem spirit-incense')?.kind).toBe('error')
    expect(parseCommand('/giveitem')?.kind).toBe('error')
  })

  it('/block กับ /unblock รับชื่อได้', () => {
    expect(parseCommand('/block SomePlayer')).toEqual({ kind: 'block', name: 'SomePlayer' })
    expect(parseCommand('/unblock SomePlayer')).toEqual({ kind: 'unblock', name: 'SomePlayer' })
  })

  it('/block ไม่ใส่ชื่อต้องได้ error', () => {
    expect(parseCommand('/block')?.kind).toBe('error')
    expect(parseCommand('/unblock')?.kind).toBe('error')
  })

  it('/blocklist ใช้ได้', () => {
    expect(parseCommand('/blocklist')).toEqual({ kind: 'blocklist' })
  })

  it('คำสั่งที่ไม่รู้จักต้องไม่ถูกตีความเป็นคำสั่งอื่น', () => {
    const result = parseCommand('/deleteeverything')
    expect(result).toEqual({ kind: 'error', message: expect.stringContaining('ไม่รู้จักคำสั่ง') })
  })

  it('/help ใช้ได้', () => {
    expect(parseCommand('/help')).toEqual({ kind: 'help' })
  })
})

describe('resolveCommandForSender', () => {
  it('บัญชีที่ไม่ใช่ผู้ดูแลพิมพ์คำสั่งกลุ่มผู้ดูแล (/givecharacter, /givegold, /giveitem) ต้องไม่ถูกตีความเป็นคำสั่งเลย (ต้องส่งเป็นแชทปกติ)', () => {
    expect(resolveCommandForSender(false, '/givecharacter pig')).toBeNull()
    expect(resolveCommandForSender(false, '/givegold 1000')).toBeNull()
    expect(resolveCommandForSender(false, '/giveitem spirit-incense 5')).toBeNull()
  })

  it('บัญชีที่ไม่ใช่ผู้ดูแลพิมพ์คำสั่งสาธารณะ (/block, /unblock, /blocklist, /help) ยังใช้ได้ปกติ — ไม่ใช่ความลับ', () => {
    expect(resolveCommandForSender(false, '/block SomePlayer')).toEqual({
      kind: 'block',
      name: 'SomePlayer',
    })
    expect(resolveCommandForSender(false, '/unblock SomePlayer')).toEqual({
      kind: 'unblock',
      name: 'SomePlayer',
    })
    expect(resolveCommandForSender(false, '/blocklist')).toEqual({ kind: 'blocklist' })
    expect(resolveCommandForSender(false, '/help')).toEqual({ kind: 'help' })
  })

  it('บัญชีผู้ดูแลพิมพ์คำสั่งกลุ่มผู้ดูแลต้องถูกตีความเป็นคำสั่งตามปกติ', () => {
    expect(resolveCommandForSender(true, '/givecharacter pig')).toEqual({
      kind: 'give-character',
      characterId: 'pig-warrior',
    })
    expect(resolveCommandForSender(true, '/givegold 1000')).toEqual({
      kind: 'give-gold',
      amount: 1000,
    })
    expect(resolveCommandForSender(true, '/giveitem spirit-incense 5')).toEqual({
      kind: 'give-item',
      itemId: 'spirit-incense',
      quantity: 5,
    })
  })

  it('บัญชีผู้ดูแลพิมพ์ข้อความแชทธรรมดา (ไม่ขึ้นต้นด้วย /) ยังคงเป็นแชทปกติเหมือนบัญชีทั่วไป', () => {
    expect(resolveCommandForSender(true, 'สวัสดีครับ')).toBeNull()
  })
})
