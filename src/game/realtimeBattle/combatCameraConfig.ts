/**
 * Combat camera tuning — single source of truth (presentation only).
 *
 * Naruto-mobile-style elevated side / 2.5D action framing.
 * Does not affect battle coordinates, combat logic, or hitboxes.
 */

export interface CombatCameraConfig {
  /** Downward pitch from horizontal plane (degrees). ~30° elevated action framing. */
  pitchDeg: number
  /** Base camera distance from look target (world units). */
  distance: number
  /** Perspective vertical field of view (degrees). */
  fovDeg: number
  /** Extra height above pitch-derived camera Y. */
  heightOffset: number
  /** Look-at Y offset above ground (world units). */
  targetHeightOffset: number
  /** Closest zoom multiplier (larger = nearer). */
  minZoom: number
  /** Furthest zoom multiplier (smaller = farther). */
  maxZoom: number
  /** Position smoothing time constant (seconds). */
  followSmoothing: number
  /** Zoom smoothing time constant (seconds). */
  zoomSmoothing: number
  /**
   * Composition bias on look target between player and enemy focus.
   * Negative nudges framing so the player sits left of center.
   */
  playerScreenBias: number
  /** Depth bias toward camera for UI-safe vertical composition. */
  depthCompositionBias: number
  /** Horizontal FOV margin when clamping to arena edges. */
  horizontalViewMargin: number
  /** Expected on-screen character height (matches EntitySprite SPRITE_HEIGHT). */
  referenceCharacterHeight: number
  /** Target idle character height as fraction of gameplay viewport height. */
  targetCharacterScreenHeightRatio: number
  /** Combat span (world units) at max zoom-in. */
  minCombatSpanWorld: number
  /** Combat span (world units) at max zoom-out. */
  maxCombatSpanWorld: number
  /** Extra distance multiplier when a boss is in the relevant group. */
  bossDistanceModifier: number
  /** Widen enemy-group focus when a boss is present. */
  bossFramingScale: number
  /** Max living enemies averaged into group focus. */
  maxRelevantEnemies: number
}

/** Elevated side-down action camera — presentation baseline. */
export const DEFAULT_COMBAT_CAMERA_CONFIG: CombatCameraConfig = {
  pitchDeg: 30,
  distance: 5.0,
  fovDeg: 38,
  heightOffset: 0.58,
  targetHeightOffset: 0,
  minZoom: 0.9,
  maxZoom: 1.26,
  followSmoothing: 0.12,
  zoomSmoothing: 0.14,
  playerScreenBias: -0.06,
  depthCompositionBias: 0.35,
  horizontalViewMargin: 0.9,
  referenceCharacterHeight: 1.6,
  targetCharacterScreenHeightRatio: 0.36,
  minCombatSpanWorld: 2.8,
  maxCombatSpanWorld: 7.5,
  bossDistanceModifier: 0.92,
  bossFramingScale: 1.18,
  maxRelevantEnemies: 4,
}
