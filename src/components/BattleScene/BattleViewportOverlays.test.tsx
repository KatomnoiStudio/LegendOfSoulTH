import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BattleFullscreenPrompt, BattlePortraitOverlay } from './BattleViewportOverlays'

describe('BattleViewportOverlays Components', () => {
  it('renders BattlePortraitOverlay with clear rotation instructions and ARIA attributes', () => {
    render(<BattlePortraitOverlay />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-label', 'หมุนอุปกรณ์')
    expect(screen.getByText('กรุณาหมุนอุปกรณ์เป็นแนวนอนเพื่อเล่นเกม')).toBeInTheDocument()
  })

  it('renders BattleFullscreenPrompt and calls onActivate callback on click', () => {
    const onActivate = vi.fn()
    render(<BattleFullscreenPrompt onActivate={onActivate} />)

    const button = screen.getByRole('button', { name: /เข้าสู่โหมดเต็มจอ/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
