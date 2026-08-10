import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary, SceneCrashFallback } from './ErrorBoundary'

/*
  จอ crash ต้องแสดงรหัสจริง และต้องไม่สัญญาสิ่งที่ให้ไม่ได้

  เดิมจอนี้มีปุ่ม "สำรองข้อมูลเป็นไฟล์" ที่ล้มเหลว 100% มาตลอด — รอบแรกเพราะต่อกับ
  accountRepository ตัว localStorage ที่ backend ปัจจุบันไม่เคยเขียน session ให้ รอบสองเพราะ
  `exportSave` ฝั่ง Supabase เป็น stub ที่คืน ok:false เสมอ เทสต์ชุดเดิมมองไม่เห็นทั้งสองรอบ
  เพราะมัน `vi.mock` ทั้งโมดูลแล้วตรึงผลลัพธ์ ok:true ที่โมดูลจริงสร้างไม่ได้เลย

  บทเรียนที่ตรึงไว้ตรงนี้: อย่า mock ผลลัพธ์ที่ของจริงทำไม่ได้ — เทสต์แบบนั้นยืนยันแค่ความเชื่อ
  ของคนเขียนเทสต์ ไม่ได้ยืนยันพฤติกรรมของระบบ
*/


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

  /*
    ห้ามมีปุ่มสำรองข้อมูลบนจอนี้ จนกว่า exportSave ฝั่ง Supabase จะทำงานได้จริง

    ไม่ใช่การตรึงเรื่องหน้าตา — ตราบใดที่ `accountRepository.supabase.ts` ยัง hardcode ok:false
    ปุ่มนี้กดแล้วขึ้น error ทุกครั้ง เทสต์นี้ทำให้การเอาปุ่มกลับมาโดยไม่แก้ stub ก่อน เป็นสีแดง
    แทนที่จะเงียบ ๆ ผ่านไปเป็นรอบที่สาม
  */
  test('ไม่มีปุ่มสำรองข้อมูล — exportSave ฝั่งเซิร์ฟเวอร์ยังเป็น stub ที่ล้มเหลวเสมอ', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.queryByRole('button', { name: /สำรองข้อมูล/ })).not.toBeInTheDocument()
    // ปุ่มที่ใช้ได้จริงต้องยังอยู่ ไม่ใช่ลบจนไม่เหลือทางออกให้ผู้เล่น
    expect(screen.getByRole('button', { name: 'โหลดใหม่' })).toBeInTheDocument()
  })

  test('จอ crash ต้องไม่บอกว่าข้อมูลอยู่แค่ในเบราว์เซอร์ — ย้ายมา Supabase แล้ว', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/บันทึกไว้บนเซิร์ฟเวอร์แล้ว/)).toBeInTheDocument()
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
