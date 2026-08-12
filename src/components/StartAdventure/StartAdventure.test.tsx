import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StartAdventure } from './StartAdventure'
import { playSfx } from '../../lib/audio/AudioEngine'

vi.mock('../../lib/audio/AudioEngine', () => ({
  playSfx: vi.fn(() => Promise.resolve()),
}))

describe('StartAdventure', () => {
  it('แสดงข้อความชวนเริ่มและใช้ภาพกรอบปุ่มผ่าน CSS custom property', () => {
    render(<StartAdventure onStart={vi.fn()} />)

    expect(screen.getByText('เหล่าตำนานพร้อมออกศึกแล้ว')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'เริ่มการผจญภัย' })
    expect(button.style.getPropertyValue('--bg-rahu')).toContain('rahu-button-frame.webp')
  })

  it('กดเริ่มการผจญภัยแล้วเล่นเสียงและเรียก onStart ครั้งเดียว', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<StartAdventure onStart={onStart} />)

    await user.click(screen.getByRole('button', { name: 'เริ่มการผจญภัย' }))

    expect(playSfx).toHaveBeenCalledWith('buttonClick')
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
