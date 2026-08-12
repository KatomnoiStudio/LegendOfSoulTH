import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SideActions } from './SideActions'
import { ToastProvider } from '../Toast/ToastProvider'
import type { PlayerBadges } from '../../types/player'

vi.mock('../../lib/audio/AudioEngine', () => ({
  playSfx: vi.fn(() => Promise.resolve()),
}))

const badges: PlayerBadges = {
  mail: 3,
  mission: 132,
}

function renderSideActions(overrides: Partial<Parameters<typeof SideActions>[0]> = {}) {
  const onOpenSettings = vi.fn()
  const onOpenAddFriend = vi.fn()
  const props = {
    badges,
    onOpenSettings,
    onOpenAddFriend,
    ...overrides,
  }

  return {
    ...render(
      <ToastProvider>
        <SideActions {...props} />
      </ToastProvider>,
    ),
    onOpenSettings,
    onOpenAddFriend,
  }
}

describe('SideActions', () => {
  it('แสดงปุ่มเมนูลัดและ badge ตามจำนวนที่มีอยู่', () => {
    renderSideActions()

    expect(screen.getByRole('complementary', { name: 'เมนูลัด' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ตั้งค่า' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'จดหมาย มี 3 รายการใหม่' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ภารกิจ มี 132 รายการใหม่' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เพิ่มเพื่อน' })).toBeInTheDocument()
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('ส่งต่อการกดตั้งค่าและเพิ่มเพื่อนให้ callback ที่รับมา', async () => {
    const user = userEvent.setup()
    const { onOpenSettings, onOpenAddFriend } = renderSideActions()

    await user.click(screen.getByRole('button', { name: 'ตั้งค่า' }))
    await user.click(screen.getByRole('button', { name: 'เพิ่มเพื่อน' }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onOpenAddFriend).toHaveBeenCalledTimes(1)
  })

  it('ปุ่มที่ยังไม่เปิดใช้แสดง coming-soon toast ตามชื่อฟีเจอร์', async () => {
    const user = userEvent.setup()
    renderSideActions()

    await user.click(screen.getByRole('button', { name: 'จดหมาย มี 3 รายการใหม่' }))
    expect(screen.getByText('จดหมาย — เร็ว ๆ นี้')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ภารกิจ มี 132 รายการใหม่' }))
    expect(screen.getByText('ภารกิจ — เร็ว ๆ นี้')).toBeInTheDocument()
  })
})
