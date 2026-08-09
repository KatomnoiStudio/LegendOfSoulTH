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

  it('keeps Erlang the same stature across his 640x512 and 800x640 sheets', () => {
    const idle = resolveSpriteMeshPresentation(
      'spear-warrior',
      '/characters/erlang-shen-v6-idle-0.webp',
    )
    const cast = resolveSpriteMeshPresentation(
      'spear-warrior',
      '/characters/erlang-shen-skill-2-cast-0.webp',
    )
    const reference = resolveSpriteMeshPresentation(
      'monkey-king',
      '/characters/monkey-v2-idle-0.webp',
    )

    // Alpha-scanned visible heights: idle 370/512, Skill 2 cast 447.7/640, reference idle 320/376.
    const idleVisibleHeight = ENTITY_SPRITE_HEIGHT * (370 / 512) * idle.scaleY
    const castVisibleHeight = ENTITY_SPRITE_HEIGHT * (447.7 / 640) * cast.scaleY
    const referenceVisibleHeight = ENTITY_SPRITE_HEIGHT * (320 / 376) * reference.scaleY

    expect(castVisibleHeight).toBeCloseTo(idleVisibleHeight, 2)
    expect(idleVisibleHeight).toBeCloseTo(referenceVisibleHeight, 2)
    // Unregistered sheets fall back to 396x376 and would render at the wrong scale.
    expect(idle.scaleX / idle.scaleY).toBeCloseTo(640 / 512 / ENTITY_SPRITE_ASPECT, 8)
    expect(cast.scaleX / cast.scaleY).toBeCloseTo(800 / 640 / ENTITY_SPRITE_ASPECT, 8)
  })

  it.each([
    ['monkey-king', '/characters/monkey-v2-idle-0.webp', 11, 376],
    ['pig-warrior', '/characters/pigsy-idle-0.webp', 15, 376],
    ['pilgrim-monk', '/characters/tripitaka-idle-0.webp', 11, 376],
    ['spear-warrior', '/characters/erlang-shen-v6-idle-0.webp', 31, 512],
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
