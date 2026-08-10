import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary, SceneCrashFallback } from './ErrorBoundary'

/*
  จอ crash ต้องแสดงรหัสจริง และปุ่มสำรองข้อมูลต้องคุยกับ backend ที่ใช้งานจริง

  ปุ่มนี้เคยผูกกับ accountRepository ตัว localStorage เดิมซึ่ง readActiveSession() อ่านคีย์ที่
  backend Supabase ไม่เคยเขียน ผลคือมันตอบ "ยังไม่ได้ล็อกอิน" ทุกครั้ง 100% บนจอเดียวที่บอก
  ผู้เล่นให้รีบเซฟข้อมูล — เทสต์ชุดนี้ตรึงไว้ว่ามันต้องเรียก backend จริง ไม่ใช่ตัวที่ dormant
*/

vi.mock('../../data/accountRepository.supabase', () => ({
  exportSave: vi.fn(),
}))
vi.mock('../../lib/saveFile', () => ({
  downloadSaveJson: vi.fn(),
}))

function Bomb(): never {
  throw new Error('boom')
}

// React ยัง log error ของ componentDidCatch ลง console.error ปกติแม้ ErrorBoundary จะจับได้แล้ว
// ปิดเสียงไว้ไม่ให้ผลเทสต์ที่ผ่านจริงดูเหมือนพังในหน้าจอ CI
afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  test('จับ crash แล้วแสดงรหัสข้อผิดพลาดให้เห็น', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument()
    expect(screen.getByText(/BOUNDARY_RENDER_CRASH/)).toBeInTheDocument()
  })

  test('กดสำรองข้อมูลสำเร็จ — ดาวน์โหลดไฟล์และแจ้งผล', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { exportSave } = await import('../../data/accountRepository.supabase')
    const { downloadSaveJson } = await import('../../lib/saveFile')
    vi.mocked(exportSave).mockResolvedValue({ ok: true, json: '{"account":{}}' })

    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    await user.click(screen.getByRole('button', { name: 'สำรองข้อมูลเป็นไฟล์' }))

    await waitFor(() => expect(downloadSaveJson).toHaveBeenCalledWith('{"account":{}}'))
    expect(await screen.findByText('ดาวน์โหลดไฟล์สำรองแล้ว')).toBeInTheDocument()
  })

  test('กดสำรองข้อมูลตอนไม่มี session — แจ้งเหตุผลจริง ไม่ใช่ข้อความมั่ว', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    const { exportSave } = await import('../../data/accountRepository.supabase')
    vi.mocked(exportSave).mockResolvedValue({ ok: false, error: 'ยังไม่ได้ล็อกอิน' })

    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    await user.click(screen.getByRole('button', { name: 'สำรองข้อมูลเป็นไฟล์' }))

    expect(await screen.findByText('ยังไม่ได้ล็อกอิน')).toBeInTheDocument()
  })

  /*
    กิ่ง ok:false ต้องรายงาน ไม่ใช่แค่แสดงข้อความ

    ตอนที่ปุ่มนี้ล้มเหลว 100% มันล้มเหลว "อย่างสุภาพ" — คืน ok:false ทุกครั้งโดยไม่มีบรรทัด log
    สักบรรทัด เทสต์นี้ตรึงเส้นทางรายงานไว้ ไม่ให้ความล้มเหลวแบบเงียบกลับมาอีก
  */
  test('กิ่ง ok:false ต้องเดินผ่าน reportError ด้วย ไม่ใช่แค่ขึ้นข้อความบนจอ', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const { exportSave } = await import('../../data/accountRepository.supabase')
    vi.mocked(exportSave).mockResolvedValue({ ok: false, error: 'สำรองไม่ได้' })

    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    await user.click(screen.getByRole('button', { name: 'สำรองข้อมูลเป็นไฟล์' }))

    await waitFor(() =>
      expect(
        debugSpy.mock.calls.some(([label]) => String(label).includes('SAVE_EXPORT_FAIL')),
      ).toBe(true),
    )
  })

  test('จอ crash ต้องไม่บอกว่าข้อมูลอยู่แค่ในเบราว์เซอร์ — ย้ายมา Supabase แล้ว', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/เก็บไว้\s*บนเซิร์ฟเวอร์/)).toBeInTheDocument()
  })

  test('exportSave โยน error เอง — ไม่ทำให้ปุ่มพังหรือหน้าขาว', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    const { exportSave } = await import('../../data/accountRepository.supabase')
    vi.mocked(exportSave).mockRejectedValue(new Error('localStorage พัง'))

    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    await user.click(screen.getByRole('button', { name: 'สำรองข้อมูลเป็นไฟล์' }))

    expect(await screen.findByText('สำรองข้อมูลไม่สำเร็จ')).toBeInTheDocument()
  })

  test('ไม่มี error — เรนเดอร์ children ตามปกติ', () => {
    render(
      <ErrorBoundary>
        <p>เนื้อหาปกติ</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('เนื้อหาปกติ')).toBeInTheDocument()
  })

  test('boundary ระดับฉาก crash แล้ว — เปลือกแอปรอบข้าง (nav) ไม่ถูกถอดไปด้วย', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onBack = vi.fn()
    const user = userEvent.setup()

    render(
      <>
        <nav>เมนูหลัก</nav>
        <ErrorBoundary
          fallback={<SceneCrashFallback message="ฉากพัง" onBack={onBack} backLabel="กลับล็อบบี้" />}
        >
          <Bomb />
        </ErrorBoundary>
      </>,
    )

    expect(screen.getByText('เมนูหลัก')).toBeInTheDocument()
    expect(screen.getByText('ฉากพัง')).toBeInTheDocument()
    // fallback ของฉาก ไม่ใช่จอเต็มแอป — ปุ่มโหลดใหม่ทั้งหน้าต้องไม่ปรากฏ
    expect(screen.queryByText('โหลดใหม่')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'กลับล็อบบี้' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
