/**
 * Centralized mobile combat control layout — Naruto-mobile-inspired ergonomics.
 *
 * Positions use viewport-relative percentages and attack-size multipliers
 * (not fixed pixels per resolution) so controls anchor correctly across
 * 16:9 … 20:9 landscape and tablets.
 */

export interface CombatUILayout {
  /** Joystick normalized dead zone (0–1 of stick travel). */
  deadZone: number
  joystickScale: number
  attackScale: number
  skillScale: number
  ultimateScale: number
  leftInset: number
  rightInset: number
  bottomInset: number
  clusterGapRatio: number
  /** Joystick center as % of viewport (width, height from bottom-left origin). */
  joystickAnchorXPercent: number
  joystickAnchorYPercent: number
  /** Touch hit area multiplier vs visual stick size. */
  joystickTouchAreaScale: number
  /** Top HUD compact scale (player/enemy vitals). */
  hudVitalsScale: number
  /** Center stage info compact scale. */
  hudStageScale: number
}

/** Default layout tuned for mobile landscape thumb reach. */
export const DEFAULT_COMBAT_UI_LAYOUT: CombatUILayout = {
  deadZone: 0.12,
  joystickScale: 1,
  attackScale: 1,
  skillScale: 0.6,
  ultimateScale: 0.72,
  leftInset: 0,
  rightInset: 12,
  bottomInset: 12,
  clusterGapRatio: 0.12,
  joystickAnchorXPercent: 14,
  joystickAnchorYPercent: 80,
  joystickTouchAreaScale: 1.35,
  hudVitalsScale: 0.75,
  hudStageScale: 0.65,
}

/** Base visual diameters (CSS px) before scale — ATK is primary anchor. */
export const COMBAT_BUTTON_SIZES = {
  attack: 92,
  skill: 56,
  ultimate: 66,
  minTouchTarget: 44,
} as const

/**
 * Skill arc offsets as multiples of attack button size.
 * ATK anchors bottom-right of cluster; skills arc up-left.
 *
 *        ULT
 *    S3
 *  S2      ATK
 *    S1
 */
export const COMBAT_CLUSTER_ARC = {
  s1: { rightMul: 1.02, bottomMul: 0.04 },
  s2: { rightMul: 0.7, bottomMul: 0.72 },
  s3: { rightMul: 0.4, bottomMul: 1.38 },
  ultimate: { rightMul: 0.1, bottomMul: 1.08 },
} as const

export function layoutCssVars(
  layout: CombatUILayout = DEFAULT_COMBAT_UI_LAYOUT,
): Record<string, string> {
  const attackSize = COMBAT_BUTTON_SIZES.attack * layout.attackScale
  const skillSize = COMBAT_BUTTON_SIZES.skill * layout.skillScale
  const ultimateSize = COMBAT_BUTTON_SIZES.ultimate * layout.ultimateScale
  const joystickSize = 120 * layout.joystickScale
  const clusterGap = attackSize * layout.clusterGapRatio

  return {
    '--combat-dead-zone': String(layout.deadZone),
    '--combat-joystick-x': `${layout.joystickAnchorXPercent}%`,
    '--combat-joystick-y': `${layout.joystickAnchorYPercent}%`,
    '--combat-joystick-size': `${joystickSize}px`,
    '--combat-joystick-touch-scale': String(layout.joystickTouchAreaScale),
    '--combat-attack-size': `${attackSize}px`,
    '--combat-skill-size': `${skillSize}px`,
    '--combat-ultimate-size': `${ultimateSize}px`,
    '--combat-cluster-gap': `${clusterGap}px`,
    '--combat-inset-left': `${layout.leftInset}px`,
    '--combat-inset-right': `${layout.rightInset}px`,
    '--combat-inset-bottom': `${layout.bottomInset}px`,
    '--combat-hud-vitals-scale': String(layout.hudVitalsScale),
    '--combat-hud-stage-scale': String(layout.hudStageScale),
    '--combat-arc-s1-right': String(COMBAT_CLUSTER_ARC.s1.rightMul),
    '--combat-arc-s1-bottom': String(COMBAT_CLUSTER_ARC.s1.bottomMul),
    '--combat-arc-s2-right': String(COMBAT_CLUSTER_ARC.s2.rightMul),
    '--combat-arc-s2-bottom': String(COMBAT_CLUSTER_ARC.s2.bottomMul),
    '--combat-arc-s3-right': String(COMBAT_CLUSTER_ARC.s3.rightMul),
    '--combat-arc-s3-bottom': String(COMBAT_CLUSTER_ARC.s3.bottomMul),
    '--combat-arc-ult-right': String(COMBAT_CLUSTER_ARC.ultimate.rightMul),
    '--combat-arc-ult-bottom': String(COMBAT_CLUSTER_ARC.ultimate.bottomMul),
  }
}
