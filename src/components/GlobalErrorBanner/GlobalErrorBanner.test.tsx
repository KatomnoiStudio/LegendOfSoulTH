import { describe, expect, test, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GlobalErrorBanner } from './GlobalErrorBanner'
import { reportError } from '../../lib/errors/reportError'

/*
  ที่มา: reportError.test.ts เทสต์กลไกส่งต่อแล้ว (subscribe/notify) แต่ยังไม่มีเทสต์ที่ยืนยัน
  ว่า "ใช้จริงในหน้าเว็บแล้วเห็นบนจอ" — component นี้คือจุดที่ตัดสินว่าผู้เล่นเห็นอะไรจริง ๆ
  เทสต์ก่อนหน้ายืนยันด้วยการเปิดเบราว์เซอร์เองแล้ว (ดู commit) นี่คือเวอร์ชันที่รันซ้ำได้ใน CI
*/

describe('GlobalErrorBanner', () => {
  test('reportError tier visible ทำให้แถบขึ้นพร้อมรหัสที่คัดลอกได้', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<GlobalErrorBanner />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    act(() => {
      reportError('GLOBAL_REJECTION', 'visible')
    })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('GLOBAL_REJECTION')).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  test("tier 'silent' ไม่ทำให้แถบขึ้น", () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    render(<GlobalErrorBanner />)

    act(() => {
      reportError('STORAGE_READ_FAIL', 'silent')
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  test('BOUNDARY_RENDER_CRASH ไม่ขึ้นแถบซ้ำ — ErrorBoundary แสดงเต็มจอเองแล้ว', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<GlobalErrorBanner />)

    act(() => {
      reportError('BOUNDARY_RENDER_CRASH', 'visible')
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  /*
    ตัวรับเคยรับแค่ (code) ทั้งที่ตัวส่งต่อส่ง (code, error) มาตลอด

    สาเหตุจริงทั้งก้อนจึงถูกทิ้งเงียบ ๆ ที่ชั้นสุดท้ายก่อนถึงตาผู้เล่น ทั้งที่เดินทางมาถึงแล้ว
    — code/details/hint ของ Supabase คือสิ่งที่แยก "RLS ปฏิเสธ" ออกจาก "เน็ตหลุด"
  */
  test('แสดงสาเหตุจาก error ที่แนบมาด้วย ไม่ใช่ทิ้งไปเหลือแต่รหัส', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<GlobalErrorBanner />)

    act(() => {
      reportError('PLAYER_SAVE_FAIL', 'visible', {
        message: 'permission denied for table profiles',
        code: '42501',
      })
    })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/42501 — permission denied for table profiles/)).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  test('กดปิดแล้วแถบหาย', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<GlobalErrorBanner />)

    act(() => {
      reportError('GLOBAL_UNCAUGHT', 'visible')
    })
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ปิดข้อความแจ้งเตือน' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
