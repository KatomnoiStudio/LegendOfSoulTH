import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from './AuthModal'

/*
  ล็อกไว้ไม่ให้บั๊ก busy-lockout กลับมา

  เดิม handleSubmit ไม่มี try/catch ครอบ — ถ้า onLogin/onRegister reject (เช่น
  WebCrypto ใช้ไม่ได้) busy จะค้างเป็น true ตลอดไป ปุ่มส่งถูก disable ค้าง ผู้เล่นติดอยู่
  ในกล่องนี้โดยไม่มีทางออก ไม่มีข้อความบอกด้วยซ้ำว่าเกิดอะไรขึ้น เทสต์นี้ยืนยันว่าไม่ว่า
  จะพังทางไหน ปุ่มก็ต้องกลับมากดได้เสมอ
*/

beforeEach(() => {
  // mode เริ่มต้นขึ้นกับอีเมลที่เคยจำไว้ (getLastEmail) — ล้างทุกครั้งกันเทสต์ก่อนหน้ากระทบกัน
  localStorage.clear()
})

describe('AuthModal', () => {
  test('onLogin reject ไม่ทำให้ปุ่มค้าง disable ถาวร', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockRejectedValue(new Error('WebCrypto ใช้ไม่ได้'))

    render(<AuthModal onRegister={vi.fn()} onLogin={onLogin} />)

    await user.click(screen.getByRole('tab', { name: 'เข้าสู่ระบบ' }))
    await user.type(screen.getByLabelText('อีเมล'), 'player@example.com')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')

    const submit = screen.getByRole('button', { name: 'เข้าสู่ลานประลอง' })
    await user.click(submit)

    await waitFor(() => expect(onLogin).toHaveBeenCalled())

    // ใจความของเทสต์: ปุ่มต้องไม่ค้าง disabled หลัง reject
    await waitFor(() => expect(submit).not.toBeDisabled())
    expect(screen.getByText('ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง')).toBeInTheDocument()
  })

  test('onLogin คืนข้อความ error (ไม่ throw) ก็แสดงข้อความนั้นตรง ๆ และปุ่มกลับมากดได้', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue('อีเมลหรือรหัสผ่านไม่ถูกต้อง')

    render(<AuthModal onRegister={vi.fn()} onLogin={onLogin} />)
    await user.click(screen.getByRole('tab', { name: 'เข้าสู่ระบบ' }))
    await user.type(screen.getByLabelText('อีเมล'), 'player@example.com')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'wrongpass')

    const submit = screen.getByRole('button', { name: 'เข้าสู่ลานประลอง' })
    await user.click(submit)

    expect(await screen.findByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeInTheDocument()
    expect(submit).not.toBeDisabled()
  })

  test('สมัครแล้วรหัสผ่านสองช่องไม่ตรงกัน ไม่เรียก onRegister เลย', async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn()

    render(<AuthModal onRegister={onRegister} onLogin={vi.fn()} />)

    await user.type(screen.getByLabelText('อีเมล'), 'player@example.com')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')
    await user.type(screen.getByLabelText('ยืนยันรหัสผ่าน'), 'password456')

    const submit = screen.getByRole('button', { name: 'สมัครและเริ่มเล่น' })
    await user.click(submit)

    expect(onRegister).not.toHaveBeenCalled()
    expect(screen.getByText('รหัสผ่านทั้งสองช่องไม่ตรงกัน')).toBeInTheDocument()
  })
})
