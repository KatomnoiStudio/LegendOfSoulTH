import { describe, expect, it } from 'vitest'
import { isPortraitViewport, readViewportSize } from './battleViewport'

describe('battleViewport', () => {
  it('detects portrait when height exceeds width', () => {
    expect(isPortraitViewport(390, 844)).toBe(true)
    expect(isPortraitViewport(844, 390)).toBe(false)
    expect(isPortraitViewport(800, 800)).toBe(false)
  })

  it('readViewportSize returns non-negative numbers', () => {
    const size = readViewportSize()
    expect(size.width).toBeGreaterThanOrEqual(0)
    expect(size.height).toBeGreaterThanOrEqual(0)
  })
})
