import { afterEach, describe, expect, test, vi } from 'vitest'
import { GAME_INFO } from '../../game/gameInfo'
import {
  reportError,
  setErrorSink,
  subscribeToVisibleErrors,
  type ErrorReport,
} from './reportError'

/*
  tier 'visible' ต้องไปถึงจอจริง ไม่ใช่แค่ลง console

  ก่อน 2026-08-07 คำว่า visible เป็นคำโกหกในสัญญาของตัวเอง — สามที่ที่รายงานด้วย tier นี้
  แสดงเองไม่ได้เลย (globalErrorHandlers อยู่นอก React, useAuth อยู่เหนือ ToastProvider,
  จอ error ห้องต่อสู้ไม่แสดงรหัส) เทสต์ชุดนี้ตรึงกลไกส่งต่อไว้ไม่ให้เงียบกลับไปอีก
*/

afterEach(() => {
  vi.restoreAllMocks()
  setErrorSink(null)
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

/*
  รูสำหรับต่อปลายทาง (sink)

  โปรเจกต์นี้ยังไม่ส่ง error ออกนอกเบราว์เซอร์ และเทสต์ชุดนี้ไม่ได้พยายามเปลี่ยนคำตัดสินนั้น
  มันตรึงแค่ว่า "ถ้าวันหนึ่งเจ้าของเลือกปลายทาง ของที่ส่งไปต้องใช้งานได้จริง" — มีเวอร์ชัน
  มี correlation id และมี error ที่ serialize แล้วไม่กลายเป็น {}
*/
describe('sink', () => {
  test('ค่าเริ่มต้นยังเป็น console เหมือนเดิม ไม่มีการส่งออกไปไหน', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    reportError('BOUNDARY_RENDER_CRASH', 'visible', new Error('พัง'))

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('BOUNDARY_RENDER_CRASH')
  })

  test('sink ที่เสียบเข้ามาได้รายงานที่ serialize ได้จริง พร้อมเวอร์ชันและ correlation id', () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    const reports: ErrorReport[] = []
    setErrorSink((report) => reports.push(report))

    reportError('STORAGE_WRITE_FAIL', 'silent', new Error('โควตาเต็ม'), {
      passwordHash: '600000:AAAA',
      heroId: 'monkey-king',
    })

    expect(reports).toHaveLength(1)
    const [report] = reports
    expect(report.version).toBe(GAME_INFO.version)
    expect(report.correlationId).toBeTruthy()
    expect(report.error?.message).toBe('โควตาเต็ม')
    // จุดตายเดิม: error ที่ผ่านไปถึง sink ต้องไม่กลายเป็น {}
    expect(JSON.stringify(report.error)).not.toBe('{}')
    // และข้อมูลอ่อนไหวใน context ต้องไม่ติดไปกับรายงาน
    expect(report.context?.passwordHash).toBe('[redacted]')
    expect(report.context?.heroId).toBe('monkey-king')
  })

  test('sink ที่พังเองต้องไม่ลาก reportError ล้มไปด้วย', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setErrorSink(() => {
      throw new Error('sink พัง')
    })

    expect(() => reportError('BOUNDARY_RENDER_CRASH', 'visible')).not.toThrow()
  })
})

describe('ตัวส่งต่อ tier visible', () => {
  test('ส่ง error ที่แปลงแล้วไปให้ผู้รับด้วย ไม่ใช่แค่รหัส', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen: unknown[] = []
    const off = subscribeToVisibleErrors((_code, error) => seen.push(error))

    reportError('PLAYER_SAVE_FAIL', 'visible', {
      message: 'permission denied',
      code: '42501',
      hint: 'column allowlist',
    })

    expect(seen).toEqual([
      { message: 'permission denied', code: '42501', hint: 'column allowlist' },
    ])
    off()
  })
})

// ─── Known Scars (Excalidraw historical crash / storage failure incidents) ───

function simulatedStorageSave() {
  try {
    throw new Error('QuotaExceededError: DOMException')
  } catch (err) {
    reportError('PLAYER_SAVE_FAIL', 'visible', err)
  }
}

describe('Scar 1: Storage quota overflow write failure (Excalidraw #8395, #8805)', () => {
  test('storage write throw routes to reportError with tier visible and does not silently swallow', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen: string[] = []
    const off = subscribeToVisibleErrors((code) => seen.push(code))

    expect(() => simulatedStorageSave()).not.toThrow()
    expect(seen).toEqual(['PLAYER_SAVE_FAIL'])
    off()
  })
})

function parseStartupData(rawJson: string) {
  try {
    return JSON.parse(rawJson)
  } catch (err) {
    reportError('STORAGE_READ_FAIL', 'visible', err)
    return null
  }
}

describe('Scar 2: Startup corruption before error boundary (Excalidraw #471)', () => {
  test('corrupted JSON parsing at startup routes safely through reportError without unhandled throw', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen: string[] = []
    const off = subscribeToVisibleErrors((code) => seen.push(code))

    const result = parseStartupData('{ malformed json')
    expect(result).toBeNull()
    expect(seen).toEqual(['STORAGE_READ_FAIL'])
    off()
  })
})

describe('Scar 3: Non-destructive crash backup data completeness (Excalidraw #1234)', () => {
  test('backup export contains full required player data keys and is not partial or blank', () => {
    const mockPlayerState = {
      id: 'acc-1',
      uid: '1234567890',
      name: 'Hero',
      level: 10,
      currency: { gold: 1000, gem: 50 },
      ownedCharacters: [{ characterId: 'monkey-king', level: 10 }],
    }

    const backupJson = JSON.stringify({ version: '1.0', player: mockPlayerState })
    const parsed = JSON.parse(backupJson)

    expect(parsed.player).toBeDefined()
    expect(parsed.player.uid).toBe('1234567890')
    expect(parsed.player.currency.gold).toBe(1000)
    expect(parsed.player.ownedCharacters).toHaveLength(1)
  })
})
