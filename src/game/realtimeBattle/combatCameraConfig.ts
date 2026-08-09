/**
 * Combat camera tuning — single source of truth (presentation only).
 *
 * Naruto-mobile-style elevated side / 2.5D action framing.
 * Does not affect battle coordinates, combat logic, or hitboxes.
 */

export interface CombatCameraConfig {
  /** Downward pitch from horizontal plane (degrees). Target ~10–20°. */
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

/** v0.8.2 camera baseline before the misinterpreted +30% height change (v0.8.3). */
export const COMBAT_CAMERA_V082_BASELINE = {
  pitchDeg: 18,
  distance: 5.5,
  heightOffset: 0.58,
  targetCharacterScreenHeightRatio: 0.3,
  minZoom: 0.88,
  maxZoom: 1.22,
} as const

/** Viewpoint height boost on top of the v0.8.2 baseline (+30% camera elevation). */
export const COMBAT_CAMERA_VIEW_HEIGHT_BOOST = 1.3

/**
 * v0.8.2 baseline camera Y at zoom 1 ≈ 2.28.
 * +30% target Y ≈ 2.96 → heightOffset 1.264 with pitch/distance restored.
 */
export const DEFAULT_COMBAT_CAMERA_CONFIG: CombatCameraConfig = {
  pitchDeg: COMBAT_CAMERA_V082_BASELINE.pitchDeg,
  distance: COMBAT_CAMERA_V082_BASELINE.distance,
  fovDeg: 38,
  heightOffset: 1.264,
  targetHeightOffset: 0,
  minZoom: COMBAT_CAMERA_V082_BASELINE.minZoom,
  maxZoom: COMBAT_CAMERA_V082_BASELINE.maxZoom,
  followSmoothing: 0.12,
  zoomSmoothing: 0.14,
  playerScreenBias: -0.06,
  depthCompositionBias: 0.35,
  horizontalViewMargin: 0.9,
  referenceCharacterHeight: 1.6,
  targetCharacterScreenHeightRatio: COMBAT_CAMERA_V082_BASELINE.targetCharacterScreenHeightRatio,
  minCombatSpanWorld: 2.8,
  maxCombatSpanWorld: 7.5,
  bossDistanceModifier: 0.92,
  bossFramingScale: 1.18,
  maxRelevantEnemies: 4,
}
