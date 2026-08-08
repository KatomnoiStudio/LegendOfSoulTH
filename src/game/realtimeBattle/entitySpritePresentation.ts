/**
 * Battle sprite presentation constants — presentation only, not gameplay.
 * Camera tuning must never change these values.
 *
 * Visual stack: battlePosition → worldPosition → spriteVisualOffset → renderedSprite
 * Gameplay coordinates and hitboxes stay on battle ground; only the mesh shifts.
 */

import type { CharacterModelKind } from '../characters'

export const ENTITY_SPRITE_HEIGHT = 1.6
export const ENTITY_SPRITE_ASPECT = 1.2508
/** Fixed pitch lean toward elevated side-down camera (~18° framing baseline). */
export const ENTITY_SPRITE_PITCH_RAD = -0.38

/** Default visual offset (world Y) from battle ground to sprite foot anchor. Negative = pull mesh down. */
export const DEFAULT_SPRITE_GROUND_OFFSET_Y = -0.26

/**
 * Per-sheet foot calibration — tune from sprite sheet foot baseline, not battle Y.
 * Keeps feet aligned with shadow at y≈0 without moving gameplay position.
 */
export const SPRITE_GROUND_OFFSET_BY_KIND: Partial<Record<CharacterModelKind, number>> = {
  'monkey-king': -0.28,
  'pig-warrior': -0.25,
  'pilgrim-monk': -0.24,
}

/** Shadow disc radius at battle ground (not sprite center). */
export const ENTITY_SPRITE_SHADOW_RADIUS = 0.34

export function resolveSpriteGroundOffsetY(kind: CharacterModelKind): number {
  return SPRITE_GROUND_OFFSET_BY_KIND[kind] ?? DEFAULT_SPRITE_GROUND_OFFSET_Y
}

/**
 * Mesh center Y so the foot anchor sits on battle ground after pitch rotation.
 * Pitch tilts the plane backward; compensate so feet stay on shadow/ground.
 */
export function resolveSpriteMeshCenterY(kind: CharacterModelKind): number {
  const groundOffsetY = resolveSpriteGroundOffsetY(kind)
  const pitchCompensation =
    (ENTITY_SPRITE_HEIGHT / 2) * (1 - Math.cos(Math.abs(ENTITY_SPRITE_PITCH_RAD)))
  return ENTITY_SPRITE_HEIGHT / 2 + groundOffsetY - pitchCompensation
}
