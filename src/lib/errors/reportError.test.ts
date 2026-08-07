import { afterEach, describe, expect, test, vi } from 'vitest'
import { reportError, subscribeToVisibleErrors } from './reportError'

/*
  tier 'visible' ต้องไปถึงจอจริง ไม่ใช่แค่ลง console

  ก่อน 2026-08-07 คำว่า visible เป็นคำโกหกในสัญญาของตัวเอง — สามที่ที่รายงานด้วย tier นี้
  แสดงเองไม่ได้เลย (globalErrorHandlers อยู่นอก React, useAuth อยู่เหนือ ToastProvider,
  จอ error ห้องต่อสู้ไม่แสดงรหัส) เทสต์ชุดนี้ตรึงกลไกส่งต่อไว้ไม่ให้เงียบกลับไปอีก
*/

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reportError', () => {
  test("tier 'visible' แจ้งผู้รับ", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen: string[] = []
    const off = subscribeToVisibleErrors((code) => seen.push(code))

    reportError('BOUNDARY_RENDER_CRASH', 'visible')

    expect(seen).toEqual(['BOUNDARY_RENDER_CRASH'])
    off()
  })

  test("tier 'silent' ไม่แจ้งผู้รับ — ไม่งั้นทุก error เด้งใส่หน้าผู้เล่นหมด", () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    const seen: string[] = []
    const off = subscribeToVisibleErrors((code) => seen.push(code))

    reportError('STORAGE_READ_FAIL', 'silent')

    expect(seen).toEqual([])
    off()
  })

  test('เลิกรับแล้วต้องไม่ถูกเรียกอีก', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen: string[] = []
    const off = subscribeToVisibleErrors((code) => seen.push(code))
    off()

    reportError('BOUNDARY_RENDER_CRASH', 'visible')

    expect(seen).toEqual([])
  })

  test('รหัสที่จอ crash เป็นเจ้าของ ยังต้องถูกส่งต่อ — ตัวกรองอยู่ฝั่งผู้รับ ไม่ใช่ที่นี่', () => {
    /*
      GlobalErrorBanner ข้าม BOUNDARY_RENDER_CRASH เองเพราะ ErrorBoundary แสดงรหัสนั้น
      เต็มจออยู่แล้ว การกรองต้องอยู่ที่ผู้รับ ไม่ใช่ที่ reportError — ผู้รับรายอื่นในอนาคต
      (เช่นตัวเก็บ log ลงไฟล์) ต้องยังได้รับครบทุกรหัส
    */
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen: string[] = []
    const off = subscribeToVisibleErrors((code) => seen.push(code))

    reportError('BOUNDARY_RENDER_CRASH', 'visible')

    expect(seen).toEqual(['BOUNDARY_RENDER_CRASH'])
    off()
  })

  test('ผู้รับที่พังต้องไม่ลาก reportError ล้มไปด้วย', () => {
    // reportError ถูกเรียกจากใน catch เป็นส่วนใหญ่ ถ้ามันโยนเองจะกลบต้นเหตุจริง
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const offBad = subscribeToVisibleErrors(() => {
      throw new Error('ผู้รับพัง')
    })
    const seen: string[] = []
    const offGood = subscribeToVisibleErrors((code) => seen.push(code))

    expect(() => reportError('BOUNDARY_RENDER_CRASH', 'visible')).not.toThrow()
    // และผู้รับตัวถัดไปต้องยังได้รับ ไม่ใช่ถูกตัดวงจรเพราะตัวก่อนหน้าพัง
    expect(seen).toEqual(['BOUNDARY_RENDER_CRASH'])

    offBad()
    offGood()
  })
})
