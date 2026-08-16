import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NameModal } from './NameModal'

/*
  ล็อกไว้ไม่ให้บั๊ก focus-trap กลับมา

  เดิม NameModal ไม่ได้ใช้ useModalA11y เลย — กด Tab จากปุ่ม "ยืนยันชื่อ" (element
  สุดท้ายใน modal) หลุดออกไปโฟกัส element อื่นนอกกล่องที่ยัง mount อยู่ข้างหลังได้
  ทั้งที่ modal นี้ปิดไม่ได้ (ไม่มีปุ่มปิด/backdrop/Esc) จึงต้อง trap โฟกัสไว้ข้างในเสมอ
  gold-standard-baseline แก้แล้วโดยต่อเข้ากับ useModalA11y ตัวเดียวกับ modal อื่น — เทสต์นี้
  ยืนยันว่า Tab จาก element สุดท้ายวนกลับไป element แรก (input) แทนที่จะหลุดออกนอกกล่อง
*/

describe('NameModal', () => {
  test('เปิดมาโฟกัสช่องกรอกชื่อทันที', () => {
    render(<NameModal onConfirm={vi.fn()} />)
    expect(screen.getByLabelText('ชื่อตัวละคร')).toHaveFocus()
  })

  test('มี dialog role พร้อม label และปุ่มยืนยันแบบ disabled เมื่อยังไม่กรอก', () => {
    render(<NameModal onConfirm={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'โปรดใส่ชื่อตัวละคร' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยืนยันชื่อ' })).toBeDisabled()
  })

  test('Tab จากปุ่มยืนยัน (element สุดท้าย) วนกลับไปช่องกรอกชื่อ ไม่หลุดออกนอกกล่อง', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <>
        <button>ปุ่มนอก modal</button>
        <NameModal onConfirm={vi.fn()} />
      </>,
    )

    const input = screen.getByLabelText('ชื่อตัวละคร')
    const confirm = screen.getByRole('button', { name: 'ยืนยันชื่อ' })

    // ปุ่มยืนยันเป็น disabled จนกว่าชื่อจะ valid — โฟกัสได้ต้องกรอกชื่อที่ผ่านก่อน
    await user.type(input, 'วีระ')
    confirm.focus()
    expect(confirm).toHaveFocus()

    await user.tab()

    expect(input).toHaveFocus()
  })

  test('พิมพ์อักขระต้องห้าม (เช่น !@#) ถูกกรองทิ้งทันทีและมีคำเตือน', async () => {
    const user = userEvent.setup({ delay: null })
    render(<NameModal onConfirm={vi.fn()} />)

    const input = screen.getByLabelText('ชื่อตัวละคร')
    await user.type(input, 'Aa1!')

    expect(input).toHaveValue('Aa1')
    expect(screen.getByText('ใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข')).toBeInTheDocument()
  })

  test('กรอกชื่อสั้นเกินไปแล้ว blur — ปุ่มยืนยันยัง disabled และไม่เรียก onConfirm', async () => {
    const user = userEvent.setup({ delay: null })
    const onConfirm = vi.fn()
    render(<NameModal onConfirm={onConfirm} />)

    const input = screen.getByLabelText('ชื่อตัวละคร')
    await user.type(input, 'A')
    await user.tab()

    expect(screen.getByRole('button', { name: 'ยืนยันชื่อ' })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('กรอกชื่อถูกต้องแล้วกดยืนยัน — เรียก onConfirm ด้วยชื่อที่ trim แล้ว', async () => {
    const user = userEvent.setup({ delay: null })
    const onConfirm = vi.fn()
    render(<NameModal onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText('ชื่อตัวละคร'), '  วีระ  ')
    await user.click(screen.getByRole('button', { name: 'ยืนยันชื่อ' }))

    expect(onConfirm).toHaveBeenCalledWith('วีระ')
  })
})
