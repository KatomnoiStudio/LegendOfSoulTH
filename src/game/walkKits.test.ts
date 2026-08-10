import { describe, expect, it } from 'vitest'
import { getWalkKit, hasWalkFrames } from './walkKits'

describe('monkey king local idle kit', () => {
  it('uses the locked 12-frame idle and keeps the local walk kit intact', () => {
    const kit = getWalkKit('monkey-king')

    expect(hasWalkFrames('monkey-king')).toBe(true)
    expect(kit.walkPrefix).toContain('characters/walk/wukong-walk')
    expect(kit.runPrefix).toContain('characters/monkey-king-run-erlang-style-local/run')
    expect(kit.runFrameCount).toBe(12)
    expect(kit.runFrameDuration).toBe(125)
    expect(kit.idlePrefix).toContain('characters/monkey-king-idle-local/idle')
    expect(kit.idleCount).toBe(12)
    expect(kit.idleFrameDuration).toBe(300)
    expect(kit.idleScale).toBe(1)
  })
})

describe('spear warrior walk kit', () => {
  it('uses the authored 16-frame side-view run art as its walk model', () => {
    const kit = getWalkKit('spear-warrior')

    expect(hasWalkFrames('spear-warrior')).toBe(true)
    expect(kit.walkFrameCount).toBe(25)
    expect(kit.walkFrameStride).toEqual({ walking: 20, running: 16 })
    expect(kit.usesMirroredSideView).toBe(true)
    expect(kit.walkPrefix).toContain('characters/walk/erlang-shen-v3-run')
    expect(kit.idlePrefix).toContain('characters/erlang-shen-v6-idle')
    expect(kit.idleCount).toBe(25)
    expect(kit.idleFrameDuration).toBe(221)
    expect(kit.idleScale).toBe(1)
  })
})
