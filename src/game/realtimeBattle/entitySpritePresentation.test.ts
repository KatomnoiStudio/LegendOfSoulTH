import { describe, expect, it } from 'vitest'
import {
  ENTITY_SPRITE_ASPECT,
  ENTITY_SPRITE_HEIGHT,
  ENTITY_SPRITE_PITCH_RAD,
} from './entitySpritePresentation'
import { DEFAULT_COMBAT_CAMERA_CONFIG } from './combatCameraConfig'

describe('entitySpritePresentation', () => {
  it('keeps character presentation constants independent from camera tuning', () => {
    expect(ENTITY_SPRITE_HEIGHT).toBe(DEFAULT_COMBAT_CAMERA_CONFIG.referenceCharacterHeight)
    expect(ENTITY_SPRITE_ASPECT).toBeGreaterThan(1)
    expect(ENTITY_SPRITE_PITCH_RAD).toBeLessThan(0)
    expect(ENTITY_SPRITE_PITCH_RAD).toBeGreaterThan(-0.5)
  })
})
