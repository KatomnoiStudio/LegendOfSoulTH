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

  it('คำสั่งที่ไม่รู้จักต้องไม่ถูกตีความเป็นคำสั่งอื่น', () => {
    const result = parseCommand('/deleteeverything')
    expect(result).toEqual({ kind: 'error', message: expect.stringContaining('ไม่รู้จักคำสั่ง') })
  })

  it('/help ใช้ได้', () => {
    expect(parseCommand('/help')).toEqual({ kind: 'help' })
  })
})

describe('resolveCommandForSender', () => {
  it('บัญชีที่ไม่ใช่ผู้ดูแลพิมพ์ /givecharacter ต้องไม่ถูกตีความเป็นคำสั่งเลย (ต้องส่งเป็นแชทปกติ)', () => {
    expect(resolveCommandForSender(false, '/givecharacter pig')).toBeNull()
    expect(resolveCommandForSender(false, '/help')).toBeNull()
    expect(resolveCommandForSender(false, '/deleteeverything')).toBeNull()
  })

  it('บัญชีผู้ดูแลพิมพ์ /givecharacter ต้องถูกตีความเป็นคำสั่งตามปกติ', () => {
    expect(resolveCommandForSender(true, '/givecharacter pig')).toEqual({
      kind: 'give-character',
      characterId: 'pig-warrior',
    })
  })

  it('บัญชีผู้ดูแลพิมพ์ข้อความแชทธรรมดา (ไม่ขึ้นต้นด้วย /) ยังคงเป็นแชทปกติเหมือนบัญชีทั่วไป', () => {
    expect(resolveCommandForSender(true, 'สวัสดีครับ')).toBeNull()
  })
})
