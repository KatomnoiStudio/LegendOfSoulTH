import { describe, expect, test } from 'vitest'
import { describeNormalizedError, normalizeError, scrubContext } from './normalizeError'

/*
  ตัวแปลง error ต้องไม่ทำให้ error หายระหว่างทาง

  จุดตายของกลไกรายงานคือ `JSON.stringify(new Error('x')) === '{}'` — ตราบใดที่ปลายทางไม่ใช่
  console เท่านั้น error ทุกใบจะกลายเป็น object เปล่าโดยไม่มีใครสังเกต เทสต์ชุดนี้ตรึงไว้ว่า
  ฟิลด์ที่จำเป็นต่อการวินิจฉัยถูกอ่านออกมาจริง และข้อมูลอ่อนไหวไม่ติดไปด้วย
*/

describe('normalizeError', () => {
  test('Error ธรรมดาต้องไม่กลายเป็น {} ตอน serialize', () => {
    const normalized = normalizeError(new Error('พัง'))

    expect(JSON.stringify(normalized)).not.toBe('{}')
    expect(normalized?.name).toBe('Error')
    expect(normalized?.message).toBe('พัง')
    expect(normalized?.stack).toBeTruthy()
  })

  test('อ่าน code/details/hint ของ PostgrestError — ส่วนที่บอกสาเหตุจริง', () => {
    const normalized = normalizeError({
      message: 'permission denied for table profiles',
      code: '42501',
      details: 'RLS policy rejected the write',
      hint: 'check the column allowlist',
    })

    expect(normalized?.code).toBe('42501')
    expect(normalized?.details).toBe('RLS policy rejected the write')
    expect(normalized?.hint).toBe('check the column allowlist')
  })

  test('เดินตาม Error.cause ต่อเป็นชั้น ๆ', () => {
    const normalized = normalizeError(new Error('ชั้นนอก', { cause: new Error('ต้นเหตุจริง') }))

    expect(normalized?.cause?.message).toBe('ต้นเหตุจริง')
  })

  test('cause ที่วนกลับมาหาตัวเองต้องไม่ทำให้ค้าง', () => {
    const error = new Error('วน') as Error & { cause?: unknown }
    error.cause = error

    expect(() => normalizeError(error)).not.toThrow()
  })

  test('ค่าที่ไม่ใช่ Error ก็ต้องเก็บได้ ไม่ใช่หายไปเฉย ๆ', () => {
    expect(normalizeError('พังเป็นสตริง')?.value).toBe('พังเป็นสตริง')
    expect(normalizeError({ reason: 'ไม่มีฟิลด์มาตรฐานเลย' })?.value).toContain('reason')
    expect(normalizeError(undefined)).toBeNull()
  })

  test('อีเมลที่ปนมาในข้อความถูกล้างออก', () => {
    const normalized = normalizeError(new Error('login failed for player@example.com'))

    expect(normalized?.message).not.toContain('player@example.com')
    expect(normalized?.message).toContain('[redacted]')
  })
})

describe('scrubContext', () => {
  test('คีย์อ่อนไหวถูกแทนที่ ไม่ใช่ถูกตัดทิ้ง — ยังรู้ว่ามีฟิลด์นั้นอยู่', () => {
    const scrubbed = scrubContext({
      heroId: 'monkey-king',
      passwordHash: '600000:AAAA',
      accessToken: 'eyJhbGciOi',
      nested: { email: 'a@b.co', level: 5 },
    })

    expect(scrubbed.heroId).toBe('monkey-king')
    expect(scrubbed.passwordHash).toBe('[redacted]')
    expect(scrubbed.accessToken).toBe('[redacted]')
    expect(scrubbed.nested).toEqual({ email: '[redacted]', level: 5 })
  })

  test('โครงสร้างที่อ้างวนกลับมาต้องไม่ทำให้ค้าง', () => {
    const cyclic: Record<string, unknown> = { name: 'วน' }
    cyclic.self = cyclic

    expect(() => scrubContext(cyclic)).not.toThrow()
  })
})

describe('describeNormalizedError', () => {
  test('รวม code กับ message เป็นบรรทัดเดียวให้ผู้เล่นก๊อปต่อ', () => {
    expect(
      describeNormalizedError(normalizeError({ code: '42501', message: 'permission denied' })),
    ).toBe('42501 — permission denied')
  })

  test('ไม่มี error ก็ไม่มีบรรทัด — ไม่ใช่บรรทัดว่างเปล่า', () => {
    expect(describeNormalizedError(null)).toBeNull()
  })

  test('ข้อความยาวถูกตัด ไม่ให้แถบดันจนบังหน้าจอ', () => {
    const long = describeNormalizedError(normalizeError(new Error('ก'.repeat(400))))

    expect(long?.length).toBeLessThanOrEqual(164)
    expect(long?.endsWith('...')).toBe(true)
  })
})
