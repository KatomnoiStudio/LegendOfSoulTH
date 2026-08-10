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

  test('เวอร์ชันแพ็กเกจใน stack ไม่ถูกเข้าใจผิดว่าเป็นอีเมล', () => {
    // `react@19.1.0` ใน stack frame ตอน dev ไม่ใช่อีเมล — ถ้าโดนล้างไปด้วย stack จะอ่านไม่ออก
    const normalized = normalizeError(new Error('failed at node_modules/react@19.1.0/index.js'))

    expect(normalized?.message).toContain('react@19.1.0')
  })

  /*
    ตัวแปลง error ต้องโยนเองไม่ได้ ไม่ว่าจะป้อนอะไรเข้ามา

    `source[key]` ไม่ใช่การอ่านเฉย ๆ — มันเรียก getter ได้ และ getter โยนได้ (revoked Proxy,
    Window/Location ข้าม origin, object ที่ตั้งใจให้พัง) globalErrorHandlers ป้อนค่าที่ควบคุม
    ไม่ได้เลยเข้ามาตรง ๆ (`event.error ?? event.message`, `event.reason`) ถ้าตรงนี้โยน ตาข่าย
    รับ error ชั้นสุดท้ายจะกลายเป็นตัว error เอง: รายงานหาย ตัวส่งต่อ visible ไม่ทำงาน แถบไม่ขึ้น
    เทสต์สามตัวนี้ทั้งหมด FAIL ถ้าถอด guard ใน readProperty ออก
  */
  describe('ค่าที่อ่านแล้วโยน', () => {
    test('getter ของ message ที่โยน ต้องไม่ทำให้ normalizeError โยนตาม', () => {
      const hostile = {
        get message(): string {
          throw new Error('getter พัง')
        },
      }

      expect(() => normalizeError(hostile)).not.toThrow()
      // และต้องยังคืนอะไรสักอย่างออกมา ไม่ใช่กลืนจนไม่เหลือรายงาน
      expect(normalizeError(hostile)).not.toBeNull()
    })

    test('getter ของ cause ที่โยน ต้องไม่ทำให้ normalizeError โยนตาม', () => {
      const hostile = {
        name: 'HostileError',
        get cause(): unknown {
          throw new Error('getter พัง')
        },
      }

      expect(() => normalizeError(hostile)).not.toThrow()
      // ฟิลด์ที่อ่านได้ต้องยังรอด ไม่ใช่เสียทั้งก้อนเพราะคีย์เดียวที่พัง
      expect(normalizeError(hostile)?.name).toBe('HostileError')
    })

    test('ฟิลด์ดี ๆ ต้องรอดแม้ฟิลด์ข้าง ๆ จะโยน', () => {
      const partly = {
        message: 'อ่านได้',
        get stack(): string {
          throw new Error('getter พัง')
        },
      }

      const normalized = normalizeError(partly)
      expect(normalized?.message).toBe('อ่านได้')
      expect(normalized?.stack).toBeUndefined()
    })
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

  test('getter ที่โยนใน context ต้องไม่ทำให้การล้างพัง', () => {
    // context มาจากผู้เรียก และ Object.entries เรียก getter ของทุกคีย์ — คีย์เดียวที่โยน
    // เคยทำให้ reportError ทั้งใบพัง ทั้งที่คีย์อื่นอ่านได้ปกติ
    const partly = {
      heroId: 'monkey-king',
      get broken(): string {
        throw new Error('getter พัง')
      },
    }

    expect(() => scrubContext(partly)).not.toThrow()
    expect(scrubContext(partly).heroId).toBe('monkey-king')
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
