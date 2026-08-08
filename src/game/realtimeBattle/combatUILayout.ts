/**
 * Centralized mobile combat control layout — Blueprint v3 §3.3.
 *
 * Skills form a right-thumb arc around the bottom-right Attack button. Geometry
 * and rendered CSS sizes share this module so rendered controls, safe-area
 * placement, and collision tests cannot silently disagree.
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
  /** Joystick center as % of viewport width/height. */
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
  skillScale: 0.86,
  ultimateScale: 0.85,
  leftInset: 0,
  rightInset: 12,
  bottomInset: 12,
  clusterGapRatio: 0.15,
  joystickAnchorXPercent: 14,
  joystickAnchorYPercent: 76,
  joystickTouchAreaScale: 1.35,
  hudVitalsScale: 0.75,
  hudStageScale: 0.65,
}

/** Base visual diameters (CSS px) before scale. */
export const COMBAT_BUTTON_SIZES = {
  attack: 92,
  skill: 56,
  ultimate: 66,
  minTouchTarget: 48,
} as const

/** Minimum edge-to-edge gap between combat buttons (CSS px). */
export const MIN_BUTTON_GAP_PX = 14

export interface CombatClusterMetrics {
  attackSize: number
  skillSize: number
  ultimateSize: number
  gap: number
  width: number
  height: number
  buttons: Record<CombatActionId, CombatButtonCircle>
}

export type CombatActionId = 'skill1' | 'skill2' | 'skill3' | 'ultimate' | 'basic-attack'

export interface CombatButtonCircle {
  /** Button center relative to the cluster's top-left corner. */
  x: number
  y: number
  size: number
}

export interface CombatViewport {
  width: number
  height: number
}

export interface CombatSafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CombatScreenLayout {
  clusterLeft: number
  clusterTop: number
  buttons: Record<CombatActionId, CombatButtonCircle>
  joystick: CombatButtonCircle
}

const ARC_ANGLES_DEG: Record<Exclude<CombatActionId, 'basic-attack'>, number> = {
  skill1: 180,
  skill2: 225,
  skill3: 270,
  ultimate: 315,
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function resolveCombatClusterMetrics(
  layout: CombatUILayout = DEFAULT_COMBAT_UI_LAYOUT,
): CombatClusterMetrics {
  const attackSize = Math.max(
    COMBAT_BUTTON_SIZES.minTouchTarget,
    COMBAT_BUTTON_SIZES.attack * layout.attackScale,
  )
  const skillSize = Math.max(
    COMBAT_BUTTON_SIZES.minTouchTarget,
    COMBAT_BUTTON_SIZES.skill * layout.skillScale,
  )
  const ultimateSize = Math.max(
    COMBAT_BUTTON_SIZES.minTouchTarget,
    COMBAT_BUTTON_SIZES.ultimate * layout.ultimateScale,
  )
  const gap = Math.max(MIN_BUTTON_GAP_PX, attackSize * layout.clusterGapRatio)
  const adjacentArcChord = 2 * Math.sin(Math.PI / 8)
  const radius = Math.max(
    attackSize / 2 + ultimateSize / 2 + gap,
    (skillSize / 2 + ultimateSize / 2 + gap) / adjacentArcChord,
  )

  const rawButtons: Record<CombatActionId, CombatButtonCircle> = {
    'basic-attack': { x: 0, y: 0, size: attackSize },
    skill1: { x: 0, y: 0, size: skillSize },
    skill2: { x: 0, y: 0, size: skillSize },
    skill3: { x: 0, y: 0, size: skillSize },
    ultimate: { x: 0, y: 0, size: ultimateSize },
  }

  for (const [actionId, angleDeg] of Object.entries(ARC_ANGLES_DEG) as [
    Exclude<CombatActionId, 'basic-attack'>,
    number,
  ][]) {
    const angle = degreesToRadians(angleDeg)
    rawButtons[actionId].x = Math.cos(angle) * radius
    rawButtons[actionId].y = Math.sin(angle) * radius
  }

  const circles = Object.values(rawButtons)
  const minX = Math.min(...circles.map((button) => button.x - button.size / 2))
  const minY = Math.min(...circles.map((button) => button.y - button.size / 2))
  const maxX = Math.max(...circles.map((button) => button.x + button.size / 2))
  const maxY = Math.max(...circles.map((button) => button.y + button.size / 2))
  const buttons = Object.fromEntries(
    Object.entries(rawButtons).map(([actionId, button]) => [
      actionId,
      { ...button, x: button.x - minX, y: button.y - minY },
    ]),
  ) as Record<CombatActionId, CombatButtonCircle>

  return {
    attackSize,
    skillSize,
    ultimateSize,
    gap,
    width: maxX - minX,
    height: maxY - minY,
    buttons,
  }
}

/** Mirrors the CSS safe-area placement for deterministic viewport tests. */
export function resolveCombatScreenLayout(
  viewport: CombatViewport,
  safeArea: CombatSafeAreaInsets,
  layout: CombatUILayout = DEFAULT_COMBAT_UI_LAYOUT,
): CombatScreenLayout {
  const metrics = resolveCombatClusterMetrics(layout)
  const rightInset = Math.max(layout.rightInset, safeArea.right)
  const bottomInset = Math.max(layout.bottomInset, safeArea.bottom)
  const clusterLeft = viewport.width - rightInset - metrics.width
  const clusterTop = viewport.height - bottomInset - metrics.height
  const buttons = Object.fromEntries(
    Object.entries(metrics.buttons).map(([actionId, button]) => [
      actionId,
      { ...button, x: clusterLeft + button.x, y: clusterTop + button.y },
    ]),
  ) as Record<CombatActionId, CombatButtonCircle>
  const joystickTouchSize = 120 * layout.joystickScale * layout.joystickTouchAreaScale
  const joystickRadius = joystickTouchSize / 2
  const joystickX = Math.min(
    viewport.width - safeArea.right - joystickRadius,
    Math.max(
      safeArea.left + joystickRadius,
      viewport.width * (layout.joystickAnchorXPercent / 100),
    ),
  )
  const joystickY = Math.min(
    viewport.height - safeArea.bottom - joystickRadius,
    Math.max(
      safeArea.top + joystickRadius,
      viewport.height * (layout.joystickAnchorYPercent / 100),
    ),
  )

  return {
    clusterLeft,
    clusterTop,
    buttons,
    joystick: { x: joystickX, y: joystickY, size: joystickTouchSize },
  }
}

export function layoutCssVars(
  layout: CombatUILayout = DEFAULT_COMBAT_UI_LAYOUT,
): Record<string, string> {
  const joystickSize = 120 * layout.joystickScale
  const joystickTouchRadius = (joystickSize * layout.joystickTouchAreaScale) / 2
  const metrics = resolveCombatClusterMetrics(layout)

  return {
    '--combat-dead-zone': String(layout.deadZone),
    '--combat-joystick-x': `${layout.joystickAnchorXPercent}%`,
    '--combat-joystick-y': `${layout.joystickAnchorYPercent}%`,
    '--combat-joystick-size': `${joystickSize}px`,
    '--combat-joystick-touch-scale': String(layout.joystickTouchAreaScale),
    '--combat-joystick-touch-radius': `${joystickTouchRadius}px`,
    '--combat-attack-size': `${metrics.attackSize}px`,
    '--combat-skill-size': `${metrics.skillSize}px`,
    '--combat-ultimate-size': `${metrics.ultimateSize}px`,
    '--combat-cluster-gap': `${metrics.gap}px`,
    '--combat-cluster-width': `${metrics.width}px`,
    '--combat-cluster-height': `${metrics.height}px`,
    '--combat-s1-x': `${metrics.buttons.skill1.x}px`,
    '--combat-s1-y': `${metrics.buttons.skill1.y}px`,
    '--combat-s2-x': `${metrics.buttons.skill2.x}px`,
    '--combat-s2-y': `${metrics.buttons.skill2.y}px`,
    '--combat-s3-x': `${metrics.buttons.skill3.x}px`,
    '--combat-s3-y': `${metrics.buttons.skill3.y}px`,
    '--combat-ultimate-x': `${metrics.buttons.ultimate.x}px`,
    '--combat-ultimate-y': `${metrics.buttons.ultimate.y}px`,
    '--combat-attack-x': `${metrics.buttons['basic-attack'].x}px`,
    '--combat-attack-y': `${metrics.buttons['basic-attack'].y}px`,
    '--combat-inset-left': `${layout.leftInset}px`,
    '--combat-inset-right': `${layout.rightInset}px`,
    '--combat-inset-bottom': `${layout.bottomInset}px`,
    '--combat-hud-vitals-scale': String(layout.hudVitalsScale),
    '--combat-hud-stage-scale': String(layout.hudStageScale),
  }
}
