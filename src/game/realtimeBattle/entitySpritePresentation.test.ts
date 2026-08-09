import { describe, expect, it } from 'vitest'
import {
  ENTITY_SPRITE_ASPECT,
  ENTITY_SPRITE_HEIGHT,
  ENTITY_SPRITE_PITCH_RAD,
  resolveSpriteMeshPresentation,
  resolveTemporaryEntityContainerLiftY,
} from './entitySpritePresentation'
import { DEFAULT_COMBAT_CAMERA_CONFIG } from './combatCameraConfig'

describe('entitySpritePresentation', () => {
  it('keeps character presentation constants independent from camera tuning', () => {
    expect(ENTITY_SPRITE_HEIGHT).toBe(DEFAULT_COMBAT_CAMERA_CONFIG.referenceCharacterHeight)
    expect(ENTITY_SPRITE_ASPECT).toBeGreaterThan(1)
    expect(ENTITY_SPRITE_PITCH_RAD).toBeLessThan(0)
    expect(ENTITY_SPRITE_PITCH_RAD).toBeGreaterThan(-0.5)
  })

  it('keeps average visible stature stable between idle and walk sheets', () => {
    const idle = resolveSpriteMeshPresentation('monkey-king', '/characters/monkey-v2-idle-0.webp')
    const walk = resolveSpriteMeshPresentation(
      'monkey-king',
      '/characters/walk/monkey-walk-right-0.webp',
    )

    const idleVisibleHeight = ENTITY_SPRITE_HEIGHT * (324 / 376) * idle.scaleY
    const walkVisibleHeight = ENTITY_SPRITE_HEIGHT * (299.55 / 512) * walk.scaleY

    expect(walkVisibleHeight).toBeCloseTo(idleVisibleHeight, 2)
    expect(idle.scaleX / idle.scaleY).toBeCloseTo(396 / 376 / ENTITY_SPRITE_ASPECT, 5)
    expect(walk.scaleX / walk.scaleY).toBeCloseTo(640 / 512 / ENTITY_SPRITE_ASPECT, 8)
  })

  it('keeps the calibrated feet on the same ground anchor across idle and walk', () => {
    const idle = resolveSpriteMeshPresentation('pig-warrior', '/characters/pigsy-idle-0.webp')
    const walk = resolveSpriteMeshPresentation(
      'pig-warrior',
      '/characters/walk/pigsy-walk-left-0.webp',
    )
    const pitchCos = Math.cos(Math.abs(ENTITY_SPRITE_PITCH_RAD))
    const idleFootY =
      idle.centerY + ENTITY_SPRITE_HEIGHT * (15 / 376 - 0.5) * idle.scaleY * pitchCos
    const walkFootY =
      walk.centerY + ENTITY_SPRITE_HEIGHT * (39 / 512 - 0.5) * walk.scaleY * pitchCos

    expect(idleFootY).toBeCloseTo(walkFootY, 8)
  })

  it.each([
    ['monkey-king', '/characters/monkey-v2-idle-0.webp', 11, 376],
    ['pig-warrior', '/characters/pigsy-idle-0.webp', 15, 376],
    ['pilgrim-monk', '/characters/tripitaka-idle-0.webp', 11, 376],
  ] as const)(
    'lifts the %s visual container so feet land on Y=0 without moving gameplay',
    (kind, frameUrl, bottomInsetPx, canvasHeight) => {
      const presentation = resolveSpriteMeshPresentation(kind, frameUrl)
      const pitchCos = Math.cos(Math.abs(ENTITY_SPRITE_PITCH_RAD))
      const localFootY =
        ENTITY_SPRITE_HEIGHT * (bottomInsetPx / canvasHeight - 0.5) * presentation.scaleY
      const renderedFootY =
        resolveTemporaryEntityContainerLiftY(kind) + presentation.centerY + localFootY * pitchCos

      expect(renderedFootY).toBeCloseTo(0, 8)
    },
  )
})
