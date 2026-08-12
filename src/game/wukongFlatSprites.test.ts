import { describe, expect, it } from 'vitest'
import { getBattleSpriteSet } from './battleSpriteSequences'
import { getSpriteSequence } from './spriteSequences'
import { getWalkKit } from './walkKits'

describe('Wukong AutoSprite integration', () => {
  it('uses the flat side-view frames in battle and the lobby', () => {
    const battle = getBattleSpriteSet('monkey-king')
    const lobby = getSpriteSequence('monkey-king')

    expect(battle.idle.frames.right).toHaveLength(25)
    expect(battle.walk.frames.right).toHaveLength(25)
    expect(battle['attack-1'].frames.right).toHaveLength(25)
    expect(lobby.idleUrls).toHaveLength(25)
    expect(lobby.actionUrls).toHaveLength(25)
  })

  it('declares a single-direction run kit for the adventure scene', () => {
    const kit = getWalkKit('monkey-king')

    expect(kit.animationMode).toBe('side-view')
    expect(kit.walkFrameCount).toBe(25)
    expect(kit.walkPrefix).toMatch(/wukong-flat-run$/)
  })
})
