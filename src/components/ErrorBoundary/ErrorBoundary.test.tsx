import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

/*
  จอ crash ต้องแสดงรหัสจริง และปุ่มสำรองข้อมูลต้องทำงานจริง

  เกมนี้เก็บทุกอย่างไว้ใน localStorage โดยไม่มี backend ให้กู้คืน ถ้าปุ่มสำรองข้อมูลพัง
  แล้วไม่มีใครรู้ ผู้เล่นที่เจอ crash วนซ้ำจะไม่มีทางกู้ตัวละครกลับมาเลยนอกจากล้างข้อมูลทิ้ง
*/

vi.mock('../../data/accountRepository', () => ({
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
    const { exportSave } = await import('../../data/accountRepository')
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
    const { exportSave } = await import('../../data/accountRepository')
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

  test('exportSave โยน error เอง — ไม่ทำให้ปุ่มพังหรือหน้าขาว', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    const { exportSave } = await import('../../data/accountRepository')
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
})
