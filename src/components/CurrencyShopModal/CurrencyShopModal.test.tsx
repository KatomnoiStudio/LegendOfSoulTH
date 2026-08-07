import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CurrencyShopModal } from './CurrencyShopModal'
import { GOLD_PACKAGES, GEM_PACKAGES } from '../../data/accountRepository.shared'
import { formatNumber } from '../../lib/format'

/*
  เส้นทางเติมเงินจริง (แม้ demo ยังไม่ผูก payment gateway) — พังจุดไหนกระทบเงินผู้เล่นตรง ๆ

  ล็อกไว้ 3 อย่าง: (1) ปุ่มแพ็กเกจกดแล้วเรียก onBuy ด้วย id ที่ถูกต้องจริง ไม่ใช่ id
  แพ็กเกจข้างเคียง (2) ระหว่างรอผล ต้อง lock ปุ่มอื่นไว้กันกดซ้ำสองแพ็กเกจพร้อมกัน
  (3) onBuy คืน error ต้องโชว์ข้อความจริงและไม่ปิด modal ทิ้งเงินที่ยังไม่ได้ไปหาย
*/

const showToast = vi.fn()
vi.mock('../Toast/useToast', () => ({
  useToast: () => ({ showToast }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('CurrencyShopModal', () => {
  test('เติมทอง — แสดงหัวข้อ แพ็กเกจ และปุ่มปิดที่มี label ถูกต้อง', () => {
    render(<CurrencyShopModal currency="gold" onBuy={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'เติมทอง' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'เติมทอง' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ปิด' })).toBeInTheDocument()

    for (const pack of GOLD_PACKAGES) {
      expect(
        screen.getByText(`${formatNumber(pack.amount)} ทอง`, { exact: false }),
      ).toBeInTheDocument()
    }
  })

  test('เติมหยก — ใช้ copy/แพ็กเกจของหยก ไม่ใช่ของทอง', () => {
    render(<CurrencyShopModal currency="gem" onBuy={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'เติมหยก' })).toBeInTheDocument()
    expect(
      screen.getByText(`${formatNumber(GEM_PACKAGES[0].amount)} หยก`, { exact: false }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(`${formatNumber(GOLD_PACKAGES[0].amount)} ทอง`, { exact: false }),
    ).not.toBeInTheDocument()
  })

  test('กดปุ่ม X เรียก onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CurrencyShopModal currency="gold" onBuy={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('กดแพ็กเกจ — เรียก onBuy ด้วย id ของแพ็กเกจนั้นจริง แล้วซื้อสำเร็จปิด modal + toast', async () => {
    const user = userEvent.setup()
    const target = GOLD_PACKAGES[1]
    const onBuy = vi.fn().mockResolvedValue({ ok: true, player: {}, amount: target.amount })
    const onClose = vi.fn()

    render(<CurrencyShopModal currency="gold" onBuy={onBuy} onClose={onClose} />)

    const button = screen
      .getByText(`${formatNumber(target.amount)} ทอง`, { exact: false })
      .closest('button')!
    await user.click(button)

    await waitFor(() => expect(onBuy).toHaveBeenCalledWith(target.id))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining(formatNumber(target.amount)),
      'currency',
    )
  })

  test('ระหว่างรอผลซื้อ ปุ่มแพ็กเกจอื่นถูก disable กันกดซ้ำ', async () => {
    const user = userEvent.setup()
    const pending = deferred<{ ok: true; player: object; amount: number }>()
    const onBuy = vi.fn().mockReturnValue(pending.promise)

    render(<CurrencyShopModal currency="gold" onBuy={onBuy} onClose={vi.fn()} />)

    const firstButton = screen
      .getByText(`${formatNumber(GOLD_PACKAGES[0].amount)} ทอง`, { exact: false })
      .closest('button')!
    const secondButton = screen
      .getByText(`${formatNumber(GOLD_PACKAGES[1].amount)} ทอง`, { exact: false })
      .closest('button')!

    await user.click(firstButton)

    expect(firstButton).toBeDisabled()
    expect(secondButton).toBeDisabled()
    expect(screen.getByText('กำลังเติม...')).toBeInTheDocument()

    pending.resolve({ ok: true, player: {}, amount: GOLD_PACKAGES[0].amount })
    await waitFor(() => expect(firstButton).not.toBeDisabled())
  })

  test('onBuy คืน error — แสดง error toast จริง ไม่ปิด modal', async () => {
    const user = userEvent.setup()
    const onBuy = vi.fn().mockResolvedValue({ ok: false, error: 'ยอดเงินไม่พอ' })
    const onClose = vi.fn()

    render(<CurrencyShopModal currency="gold" onBuy={onBuy} onClose={onClose} />)

    const button = screen
      .getByText(`${formatNumber(GOLD_PACKAGES[0].amount)} ทอง`, { exact: false })
      .closest('button')!
    await user.click(button)

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('ยอดเงินไม่พอ', 'error'))
    expect(onClose).not.toHaveBeenCalled()
    expect(button).not.toBeDisabled()
  })
})
