import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from './SettingsModal'
import { DEFAULT_AUDIO_SETTINGS } from '../../lib/audio/AudioEngine'
import { ToastProvider } from '../Toast/ToastProvider'

/*
  ปุ่มปิดต้องเรียก onClose จริง แท็บต้องสลับหน้าได้ครบ และปุ่มลด/เพิ่มเสียงต้อง
  clamp+unmute ให้ถูกต้อง (setChannel มี logic เฉพาะตัวที่พังง่ายเวลาแก้โดยไม่ได้ตั้งใจ)
*/

function renderModal(overrides: Partial<Parameters<typeof SettingsModal>[0]> = {}) {
  const props = {
    audio: DEFAULT_AUDIO_SETTINGS,
    onAudioChange: vi.fn(),
    performanceOverride: 'auto' as const,
    onPerformanceOverrideChange: vi.fn(),
    onLogout: vi.fn().mockResolvedValue(undefined),
    onRedeemCoupon: vi.fn(),
    ownedCharacterCount: 3,
    onClose: vi.fn(),
    onExportSave: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
  render(
    <ToastProvider>
      <SettingsModal {...props} />
    </ToastProvider>,
  )
  return props
}

describe('SettingsModal', () => {
  test('เรนเดอร์ได้ปกติ เปิดที่แท็บข้อมูลเกม พร้อมแท็บครบทุกหมวด', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'ตั้งค่า' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'ข้อมูลเกม' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /เสียง/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /กราฟิก/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /การเข้าถึง/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /คูปอง/ })).toBeInTheDocument()
    expect(screen.getByText('3 ตัว')).toBeInTheDocument()
  })

  test('กดปุ่มปิด (aria-label="ปิด") เรียก onClose', async () => {
    const user = userEvent.setup()
    const props = renderModal()

    await user.click(screen.getByRole('button', { name: 'ปิด' }))

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  test('สลับไปแท็บเสียง แล้วกดเพิ่มเสียงช่อง master — ค่าที่ส่งออกบวกด้วย VOLUME_STEP', async () => {
    const user = userEvent.setup()
    const props = renderModal()

    await user.click(screen.getByRole('tab', { name: /เสียง/ }))
    expect(screen.getByRole('tabpanel', { name: 'ตั้งค่าเสียง' })).toBeInTheDocument()

    const masterRow = screen.getByRole('progressbar', { name: 'เสียงหลัก' })
    expect(masterRow).toHaveAttribute('aria-valuenow', String(DEFAULT_AUDIO_SETTINGS.master))

    const increaseButtons = screen.getAllByRole('button', { name: 'เพิ่มเสียง' })
    await user.click(increaseButtons[0])

    expect(props.onAudioChange).toHaveBeenCalledWith({
      ...DEFAULT_AUDIO_SETTINGS,
      master: DEFAULT_AUDIO_SETTINGS.master + 2,
      muted: false,
    })
  })

  test('ปิดเสียงอยู่แล้วกดเพิ่มเสียง — ต้อง unmute ด้วย (ไม่ใช่แค่เพิ่มค่า)', async () => {
    const user = userEvent.setup()
    const props = renderModal({ audio: { ...DEFAULT_AUDIO_SETTINGS, muted: true } })

    await user.click(screen.getByRole('tab', { name: /เสียง/ }))
    const increaseButtons = screen.getAllByRole('button', { name: 'เพิ่มเสียง' })
    await user.click(increaseButtons[0])

    expect(props.onAudioChange).toHaveBeenCalledWith(
      expect.objectContaining({ master: DEFAULT_AUDIO_SETTINGS.master + 2, muted: false }),
    )
  })

  test('สลับแท็บกราฟิกแล้วเลือกระดับ "สูง" — เรียก onPerformanceOverrideChange ด้วยค่านั้น', async () => {
    const user = userEvent.setup()
    const props = renderModal()

    await user.click(screen.getByRole('tab', { name: /กราฟิก/ }))
    await user.click(screen.getByRole('radio', { name: 'สูง' }))

    expect(props.onPerformanceOverrideChange).toHaveBeenCalledWith('high')
  })

  test('กรอกคูปองแล้วส่ง — โค้ดถูกบังคับเป็นตัวพิมพ์ใหญ่และแลกสำเร็จเคลียร์ช่องกรอก', async () => {
    const user = userEvent.setup()
    const onRedeemCoupon = vi.fn().mockResolvedValue({ ok: true, player: {}, amount: 100 })
    renderModal({ onRedeemCoupon })

    await user.click(screen.getByRole('tab', { name: /คูปอง/ }))
    const input = screen.getByLabelText('โค้ดคูปอง')
    await user.type(input, 'abcd')
    expect(input).toHaveValue('ABCD')

    await user.click(screen.getByRole('button', { name: 'แลกรางวัล' }))

    expect(onRedeemCoupon).toHaveBeenCalledWith('ABCD')
    expect(await screen.findByText('แลกรางวัล')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  test('โค้ดคูปองสั้นกว่าขั้นต่ำ — ปุ่มแลกรางวัลถูก disable ไม่เรียก onRedeem', async () => {
    const user = userEvent.setup()
    const onRedeemCoupon = vi.fn()
    renderModal({ onRedeemCoupon })

    await user.click(screen.getByRole('tab', { name: /คูปอง/ }))
    await user.type(screen.getByLabelText('โค้ดคูปอง'), 'ab')

    expect(screen.getByRole('button', { name: 'แลกรางวัล' })).toBeDisabled()
    expect(onRedeemCoupon).not.toHaveBeenCalled()
  })

  test('กดออกจากบัญชี เรียก onLogout', async () => {
    const user = userEvent.setup()
    const props = renderModal()

    await user.click(screen.getByRole('button', { name: 'ออกจากบัญชี' }))

    expect(props.onLogout).toHaveBeenCalledTimes(1)
  })
})
