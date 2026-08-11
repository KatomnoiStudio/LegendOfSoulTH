import { describe, expect, it } from 'vitest'
import { getBattleSpriteSet, resolveBattleSpriteScaleX } from './battleSpriteSequences'

describe('Wukong v4 battle animation contract', () => {
  const wukong = getBattleSpriteSet('monkey-king')

  it('uses the accepted 12-frame idle at the preview cadence', () => {
    expect(wukong.idle.frames.right).toHaveLength(12)
    expect(wukong.idle.frames.right?.[0]).toMatch(/monkey-king-v4\/idle-0\.webp$/)
    expect(wukong.idle.rate).toBeCloseTo(10 / 3)
  })

  it('uses the accepted 6-frame Normal Attack 1 without changing combat timing', () => {
    expect(wukong['attack-1'].frames.right).toHaveLength(6)
    expect(wukong['attack-1'].frames.right?.[5]).toMatch(/monkey-king-v4\/attack-5\.webp$/)
    expect(wukong['attack-1'].rate).toBe(16)
  })

  it('keeps the Erlang reference run-cycle duration', () => {
    const runFrames = wukong.walk.frames.right ?? []

    expect(runFrames).toHaveLength(20)
    expect(runFrames[19]).toMatch(/monkey-king-v4\/run-19\.webp$/)
    expect((runFrames.length / wukong.walk.rate) * 1000).toBeCloseTo(2040, 0)
  })

  it('mirrors Wukong right-master frames only when combat-facing left', () => {
    expect(resolveBattleSpriteScaleX(wukong.walk, 'right', 2)).toBe(2)
    expect(resolveBattleSpriteScaleX(wukong.walk, 'left', 2)).toBe(-2)

    const pigsy = getBattleSpriteSet('pig-warrior')
    expect(resolveBattleSpriteScaleX(pigsy.walk, 'left', 2)).toBe(2)
  })
})
