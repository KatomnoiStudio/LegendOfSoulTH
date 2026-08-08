/**
 * Centralized mobile combat control layout — Naruto-mobile-inspired ergonomics.
 *
 * Positions use polar offsets from the ATK anchor (not independent pixel offsets)
 * so the cluster scales across 16:9 … 20:9 landscape without button overlap.
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

/** Minimum center-to-center gap between combat buttons (logical px). */
export const MIN_BUTTON_GAP_PX = 14

export type CombatClusterSlot = 'attack' | 'skill1' | 'skill2' | 'skill3' | 'ultimate'

export interface PolarButtonLayout {
  slot: CombatClusterSlot
  /** Degrees from straight up (0°), toward left (90°) — arc above ATK anchor. */
  angleFromUpDeg: number
  /** Radius as multiple of attack button diameter. ULT uses a larger radius. */
  radiusMul: number
}

/**
 * Skill arc from ATK anchor (bottom-right of cluster):
 *
 *        ULT
 *    S3
 *  S2      ATK
 *    S1
 */
export const COMBAT_CLUSTER_POLAR: readonly PolarButtonLayout[] = [
  { slot: 'attack', angleFromUpDeg: 0, radiusMul: 0 },
  { slot: 'skill1', angleFromUpDeg: 68, radiusMul: 1.48 },
  { slot: 'skill2', angleFromUpDeg: 52, radiusMul: 1.5 },
  { slot: 'skill3', angleFromUpDeg: 36, radiusMul: 1.55 },
  { slot: 'ultimate', angleFromUpDeg: 18, radiusMul: 2.05 },
] as const

export interface ClusterOffset {
  right: number
  bottom: number
}

/** Polar offset from ATK anchor — right/bottom are positive CSS offsets (up-left quadrant). */
export function buttonPolarPosition(
  attackSize: number,
  angleFromUpDeg: number,
  radiusMul: number,
  clusterGap = 0,
): ClusterOffset {
  if (radiusMul <= 0) return { right: 0, bottom: 0 }

  const radius = attackSize * radiusMul + clusterGap
  const rad = (angleFromUpDeg * Math.PI) / 180
  return {
    right: radius * Math.sin(rad),
    bottom: radius * Math.cos(rad),
  }
}

export function resolveClusterOffsets(
  attackSize: number,
  clusterGap: number,
  layouts: readonly PolarButtonLayout[] = COMBAT_CLUSTER_POLAR,
): Record<CombatClusterSlot, ClusterOffset> {
  const offsets = {} as Record<CombatClusterSlot, ClusterOffset>
  for (const layout of layouts) {
    offsets[layout.slot] = buttonPolarPosition(
      attackSize,
      layout.angleFromUpDeg,
      layout.radiusMul,
      layout.slot === 'attack' ? 0 : clusterGap,
    )
  }
  return offsets
}

interface BoundingBox {
  right: number
  bottom: number
  width: number
  height: number
}

function slotBoundingBox(offset: ClusterOffset, size: number): BoundingBox {
  return {
    right: offset.right,
    bottom: offset.bottom,
    width: size,
    height: size,
  }
}

function boxesOverlap(a: BoundingBox, b: BoundingBox, minGap: number): boolean {
  const aLeft = a.right + a.width
  const aTop = a.bottom + a.height
  const bLeft = b.right + b.width
  const bTop = b.bottom + b.height

  const overlapX = a.right - minGap < bLeft && b.right - minGap < aLeft
  const overlapY = a.bottom - minGap < bTop && b.bottom - minGap < aTop
  return overlapX && overlapY
}

/** True when any pair of slot bounding boxes overlap closer than minGap. */
export function clusterButtonsCollide(
  offsets: Record<CombatClusterSlot, ClusterOffset>,
  sizes: Record<CombatClusterSlot, number>,
  minGap = MIN_BUTTON_GAP_PX,
): boolean {
  const slots = Object.keys(offsets) as CombatClusterSlot[]
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slotBoundingBox(offsets[slots[i]], sizes[slots[i]])
      const b = slotBoundingBox(offsets[slots[j]], sizes[slots[j]])
      if (boxesOverlap(a, b, minGap)) return true
    }
  }
  return false
}

export function layoutCssVars(
  layout: CombatUILayout = DEFAULT_COMBAT_UI_LAYOUT,
): Record<string, string> {
  const attackSize = COMBAT_BUTTON_SIZES.attack * layout.attackScale
  const skillSize = COMBAT_BUTTON_SIZES.skill * layout.skillScale
  const ultimateSize = COMBAT_BUTTON_SIZES.ultimate * layout.ultimateScale
  const joystickSize = 120 * layout.joystickScale
  const clusterGap = attackSize * layout.clusterGapRatio
  const offsets = resolveClusterOffsets(attackSize, clusterGap)

  const vars: Record<string, string> = {
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
  }

  for (const [slot, offset] of Object.entries(offsets)) {
    vars[`--combat-polar-${slot}-right`] = `${offset.right}px`
    vars[`--combat-polar-${slot}-bottom`] = `${offset.bottom}px`
  }

  return vars
}
