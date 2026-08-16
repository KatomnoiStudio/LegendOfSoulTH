import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    hasGoogleLinked: false,
    onLinkGoogleAccount: vi.fn().mockResolvedValue(null),
    isGuest: false,
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
    const user = userEvent.setup({ delay: null })
    const props = renderModal()

    await user.click(screen.getByRole('button', { name: 'ปิด' }))

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  test('สลับไปแท็บเสียง แล้วกดเพิ่มเสียงช่อง master — ค่าที่ส่งออกบวกด้วย VOLUME_STEP', async () => {
    const user = userEvent.setup({ delay: null })
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
    const user = userEvent.setup({ delay: null })
    const props = renderModal({ audio: { ...DEFAULT_AUDIO_SETTINGS, muted: true } })

    await user.click(screen.getByRole('tab', { name: /เสียง/ }))
    const increaseButtons = screen.getAllByRole('button', { name: 'เพิ่มเสียง' })
    await user.click(increaseButtons[0])

    expect(props.onAudioChange).toHaveBeenCalledWith(
      expect.objectContaining({ master: DEFAULT_AUDIO_SETTINGS.master + 2, muted: false }),
    )
  })

  test('สลับแท็บกราฟิกแล้วเลือกระดับ "สูง" — เรียก onPerformanceOverrideChange ด้วยค่านั้น', async () => {
    const user = userEvent.setup({ delay: null })
    const props = renderModal()

    await user.click(screen.getByRole('tab', { name: /กราฟิก/ }))
    await user.click(screen.getByRole('radio', { name: 'สูง' }))

    expect(props.onPerformanceOverrideChange).toHaveBeenCalledWith('high')
  })

  test('กรอกคูปองแล้วส่ง — โค้ดถูกบังคับเป็นตัวพิมพ์ใหญ่และแลกสำเร็จเคลียร์ช่องกรอก', async () => {
    const user = userEvent.setup({ delay: null })
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
    const user = userEvent.setup({ delay: null })
    const onRedeemCoupon = vi.fn()
    renderModal({ onRedeemCoupon })

    await user.click(screen.getByRole('tab', { name: /คูปอง/ }))
    await user.type(screen.getByLabelText('โค้ดคูปอง'), 'ab')

    expect(screen.getByRole('button', { name: 'แลกรางวัล' })).toBeDisabled()
    expect(onRedeemCoupon).not.toHaveBeenCalled()
  })

  test('กดออกจากบัญชี เรียก onLogout', async () => {
    const user = userEvent.setup({ delay: null })
    const props = renderModal()

    await user.click(screen.getByRole('button', { name: 'ออกจากบัญชี' }))

    expect(props.onLogout).toHaveBeenCalledTimes(1)
  })

  test('ยังไม่เชื่อม Google — กดปุ่มแล้วเรียก onLinkGoogleAccount', async () => {
    const user = userEvent.setup({ delay: null })
    const props = renderModal({ hasGoogleLinked: false })

    const linkButton = screen.getByRole('button', { name: 'เชื่อมบัญชี Google' })
    expect(linkButton).not.toBeDisabled()
    await user.click(linkButton)

    expect(props.onLinkGoogleAccount).toHaveBeenCalledTimes(1)
  })

  test('เชื่อม Google ไว้แล้ว — ปุ่มขึ้นข้อความยืนยันและกดไม่ได้', () => {
    renderModal({ hasGoogleLinked: true })

    const linkButton = screen.getByRole('button', { name: 'เชื่อมบัญชี Google แล้ว' })
    expect(linkButton).toBeDisabled()
  })

  test('onLinkGoogleAccount คืนข้อความ error — โชว์ toast และปุ่มกลับมากดได้', async () => {
    const user = userEvent.setup({ delay: null })
    const onLinkGoogleAccount = vi.fn().mockResolvedValue('เชื่อมบัญชี Google ไม่สำเร็จ')
    renderModal({ hasGoogleLinked: false, onLinkGoogleAccount })

    const linkButton = screen.getByRole('button', { name: 'เชื่อมบัญชี Google' })
    await user.click(linkButton)

    expect(await screen.findByText('เชื่อมบัญชี Google ไม่สำเร็จ')).toBeInTheDocument()
    expect(linkButton).not.toBeDisabled()
  })

  test('onLinkGoogleAccount reject ไม่ทำให้ปุ่มค้าง disable ถาวร', async () => {
    const user = userEvent.setup({ delay: null })
    const onLinkGoogleAccount = vi.fn().mockRejectedValue(new Error('เครือข่ายขัดข้อง'))
    renderModal({ hasGoogleLinked: false, onLinkGoogleAccount })

    const linkButton = screen.getByRole('button', { name: 'เชื่อมบัญชี Google' })
    await user.click(linkButton)

    await waitFor(() => expect(onLinkGoogleAccount).toHaveBeenCalled())
    await waitFor(() => expect(linkButton).not.toBeDisabled())
    expect(screen.getByText('เชื่อมบัญชี Google ไม่สำเร็จ ลองใหม่อีกครั้ง')).toBeInTheDocument()
  })

  test('isGuest true — โชว์คำเตือนบัญชี guest แทนข้อความ sync ปกติ', () => {
    renderModal({ isGuest: true })

    expect(screen.getByText(/บัญชีนี้เป็น guest/)).toBeInTheDocument()
    expect(
      screen.queryByText(/บัญชีนี้ผูกกับอีเมลและเก็บบนเซิร์ฟเวอร์แล้ว/),
    ).not.toBeInTheDocument()
  })

  /*
    ปุ่ม "ส่งออก save เป็นไฟล์" ถูกลบพร้อมข้อความที่สัญญาไว้ผิด — เหตุผลเดียวกับที่ลบ
    ปุ่มสำรองข้อมูลบนจอ crash: exportSave ฝั่ง Supabase (เดิมเป็น stub ที่ hardcode คืน ok:false
    เสมอ, ลบทิ้งแล้ว 2026-08-10 พร้อมปุ่มนี้เพราะไม่มีผู้เรียกเหลืออยู่เลย — ดู
    src/data/accountRepository.supabase.ts) กดแล้ว error ทุกครั้ง ไม่มีทางได้ไฟล์จริง
    ข้อความเดิม "ปุ่มส่งออก save ด้านล่างมีไว้สำรองไฟล์เก็บเอง" จึงเป็นสัญญาที่ให้ไม่ได้

    เทสต์นี้ทำให้เอาปุ่มกลับมาโดยไม่มี export จริงรองรับ เป็นสีแดง แทนที่จะเงียบ ๆ ผ่านไป
  */
  test('ไม่มีปุ่มส่งออก save — ยังไม่มี export ฝั่งเซิร์ฟเวอร์ให้ปุ่มนี้เรียก', () => {
    renderModal()

    expect(screen.queryByRole('button', { name: /ส่งออก save/ })).not.toBeInTheDocument()
    // ข้อความที่สัญญาไว้ผิดต้องหายไปด้วย ไม่ใช่แค่ตัวปุ่ม
    expect(screen.queryByText(/มีไว้สำรองไฟล์เก็บเอง/)).not.toBeInTheDocument()
    // ปุ่มที่ใช้ได้จริงในหน้านี้ต้องยังอยู่ครบ
    expect(screen.getByRole('button', { name: /เชื่อมบัญชี Google/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ออกจากบัญชี' })).toBeInTheDocument()
  })
})
