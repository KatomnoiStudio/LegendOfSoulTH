import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBattleViewport } from './useBattleViewport'

describe('useBattleViewport Hook', () => {
  const originalVisualViewport = window.visualViewport
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 720 })
  })

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: originalVisualViewport,
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
    vi.restoreAllMocks()
  })

  it('detects landscape mode and allows normal input when enabled in 16:9 landscape', () => {
    window.innerWidth = 1280
    window.innerHeight = 720

    const { result } = renderHook(() => useBattleViewport(true))

    expect(result.current.isPortrait).toBe(false)
    expect(result.current.inputBlocked).toBe(false)
  })

  it('detects portrait mode and blocks input when viewport is vertical (9:19.5)', () => {
    window.innerWidth = 390
    window.innerHeight = 844

    const { result } = renderHook(() => useBattleViewport(true))

    expect(result.current.isPortrait).toBe(true)
    expect(result.current.inputBlocked).toBe(true)
  })

  it('responds reactively to window resize / orientation change events', () => {
    window.innerWidth = 1280
    window.innerHeight = 720

    const { result } = renderHook(() => useBattleViewport(true))
    expect(result.current.isPortrait).toBe(false)

    act(() => {
      window.innerWidth = 412
      window.innerHeight = 915
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.isPortrait).toBe(true)
    expect(result.current.inputBlocked).toBe(true)

    act(() => {
      window.innerWidth = 915
      window.innerHeight = 412
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.isPortrait).toBe(false)
    expect(result.current.inputBlocked).toBe(false)
  })

  it('does nothing when enabled is false', () => {
    window.innerWidth = 390
    window.innerHeight = 844

    const { result } = renderHook(() => useBattleViewport(false))

    expect(result.current.isPortrait).toBe(false)
    expect(result.current.inputBlocked).toBe(false)
  })
})
