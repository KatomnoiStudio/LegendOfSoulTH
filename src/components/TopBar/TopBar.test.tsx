import type { ComponentProps } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from './TopBar'
import { ToastProvider } from '../Toast/ToastProvider'
import { EMPTY_PROGRESS, type Player } from '../../types/player'

/*
  TopBar เป็น chrome ที่ mount ค้างตลอดเวลาที่อยู่ในล็อบบี้ และเป็นทางเข้าเดียวของ
  CurrencyShopModal (เติมทอง/หยกด้วยเงินจริง) — ถ้าปุ่มเติมเงินหาไม่เจอด้วย role/label
  หรือ modal เปิดไม่ขึ้นจริง ผู้เล่นเติมเงินไม่ได้เลยโดยไม่มีใครรู้จนกว่าจะมีคนโวยจริง
*/

const player: Player = {
  id: 'p1',
  uid: '1234567890',
  name: 'นักรบซาซัง',
  title: 'ผู้พิทักษ์',
  level: 12,
  exp: 300,
  expToNext: 1000,
  currency: { gold: 4200, gem: 15 },
  ownedCharacters: [],
  inventory: [],
  friends: [],
  teamSlots: [null, null, null, null],
  frameId: 'default',
  progress: EMPTY_PROGRESS,
}

// CurrencyShopModal เรียก useToast() ตอน render เสมอ (แม้ยังไม่กดซื้อ) — ต้องมี ToastProvider ครอบ
function renderTopBar(props?: Partial<ComponentProps<typeof TopBar>>) {
  const onOpenProfile = vi.fn()
  const onTopUpGold = vi.fn().mockResolvedValue({ ok: true, player, amount: 1000 })
  const onTopUpGems = vi.fn().mockResolvedValue({ ok: true, player, amount: 60 })

  render(
    <ToastProvider>
      <TopBar
        player={player}
        onOpenProfile={onOpenProfile}
        onTopUpGold={onTopUpGold}
        onTopUpGems={onTopUpGems}
        {...props}
      />
    </ToastProvider>,
  )

  return { onOpenProfile, onTopUpGold, onTopUpGems }
}

describe('TopBar', () => {
  test('เรนเดอร์ข้อมูลผู้เล่นจริง — ชื่อ เลเวล เงิน exp', () => {
    renderTopBar()

    expect(screen.getByText('นักรบซาซัง')).toBeInTheDocument()
    expect(screen.getByText('Lv.12')).toBeInTheDocument()
    expect(screen.getByText('4,200')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('300 / 1,000')).toBeInTheDocument()
  })

  test('องค์ประกอบสำคัญ reachable ผ่าน role/label ที่ถูกต้อง', () => {
    renderTopBar()

    expect(screen.getByRole('button', { name: 'เปิดโปรไฟล์ของ นักรบซาซัง' })).toBeInTheDocument()

    const exp = screen.getByRole('progressbar', { name: 'ค่าประสบการณ์' })
    expect(exp).toHaveAttribute('aria-valuemin', '0')
    expect(exp).toHaveAttribute('aria-valuemax', '1000')
    expect(exp).toHaveAttribute('aria-valuenow', '300')

    expect(screen.getByRole('button', { name: 'เติมทอง' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เติมหยก' })).toBeInTheDocument()
  })

  test('กดโปรไฟล์ — เรียก onOpenProfile', async () => {
    const user = userEvent.setup()
    const { onOpenProfile } = renderTopBar()

    await user.click(screen.getByRole('button', { name: 'เปิดโปรไฟล์ของ นักรบซาซัง' }))

    expect(onOpenProfile).toHaveBeenCalledTimes(1)
  })

  test('กดเติมทอง เปิด shop modal → ซื้อสำเร็จ → เรียก onTopUpGold แล้ว modal ปิดเอง', async () => {
    const user = userEvent.setup()
    const { onTopUpGold, onTopUpGems } = renderTopBar()

    await user.click(screen.getByRole('button', { name: 'เติมทอง' }))

    const dialog = screen.getByRole('dialog', { name: 'เติมทอง' })
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByText('฿30'))

    await waitFor(() => expect(onTopUpGold).toHaveBeenCalledWith('gold-small'))
    // เติมทอง ต้องไม่แตะ onTopUpGems เลย
    expect(onTopUpGems).not.toHaveBeenCalled()

    // ซื้อสำเร็จ (ok: true) → CurrencyShopModal ปิดตัวเองผ่าน onClose
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'เติมทอง' })).not.toBeInTheDocument(),
    )
  })
})
