import type { CombatCameraConfig } from './combatCameraConfig'
import type { EntityType } from './types'

export interface WorldXZ {
  x: number
  z: number
}

export interface CameraEnemySample {
  world: WorldXZ
  hp: number
  entityType: EntityType
}

export interface CameraRigLimits {
  limitX: number
  limitZ: number
}

export interface CameraPose {
  lookX: number
  lookY: number
  lookZ: number
  positionX: number
  positionY: number
  positionZ: number
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Frame-rate independent exponential smoothing toward a target scalar. */
export function smoothToward(
  current: number,
  target: number,
  smoothingSec: number,
  deltaSec: number,
): number {
  if (smoothingSec <= 0) return target
  const alpha = 1 - Math.exp(-deltaSec / smoothingSec)
  return current + (target - current) * alpha
}

export function worldDistance2D(a: WorldXZ, b: WorldXZ): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.hypot(dx, dz)
}

export function computeViewDistance(cameraHeight: number, pitchRad: number): number {
  const sinPitch = Math.sin(pitchRad)
  if (sinPitch <= 0.001) return cameraHeight
  return cameraHeight / sinPitch
}

export function computeHorizontalHalfWidth(
  viewDistance: number,
  fovDeg: number,
  aspect: number,
  margin: number,
): number {
  const halfFov = degToRad(fovDeg) / 2
  return Math.tan(halfFov) * aspect * viewDistance * margin
}

export function computeCameraRigLimits(
  config: CombatCameraConfig,
  aspect: number,
  worldWidth: number,
  worldDepth: number,
  zoom: number,
): CameraRigLimits {
  const pitchRad = degToRad(config.pitchDeg)
  const effectiveDistance = config.distance / Math.max(0.01, zoom)
  const height = effectiveDistance * Math.sin(pitchRad) + config.heightOffset
  const viewDistance = computeViewDistance(height, pitchRad)
  const halfWidth = computeHorizontalHalfWidth(
    viewDistance,
    config.fovDeg,
    aspect,
    config.horizontalViewMargin,
  )

  return {
    limitX: Math.max(0, worldWidth / 2 - halfWidth),
    limitZ: Math.max(0, worldDepth / 2 - worldDepth * 0.08),
  }
}

/** Scratch buffers — this runs once per rendered frame, so it must not allocate per call. */
const relevantScratch: CameraEnemySample[] = []
const relevantDistanceScratch: number[] = []

/**
 * The K nearest living enemies, nearest first.
 *
 * Equivalent to `filter(alive).toSorted(byDistance).slice(0, K)` including tie
 * order (equal distances keep input order), but it selects in one pass into a
 * reused K-slot buffer instead of allocating four arrays and running a full
 * sort every frame. The returned array is the scratch buffer itself — read it
 * before calling again.
 */
function selectNearestLiving(
  player: WorldXZ,
  enemies: CameraEnemySample[],
  maxRelevant: number,
): CameraEnemySample[] {
  relevantScratch.length = 0
  relevantDistanceScratch.length = 0
  if (maxRelevant <= 0) return relevantScratch

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue

    const distance = worldDistance2D(player, enemy.world)
    if (relevantScratch.length === maxRelevant) {
      if (distance >= relevantDistanceScratch[relevantScratch.length - 1]) continue
      relevantScratch.length -= 1
      relevantDistanceScratch.length -= 1
    }

    // Strictly-less keeps equal distances in input order, matching a stable sort.
    let insertAt = relevantScratch.length
    while (insertAt > 0 && distance < relevantDistanceScratch[insertAt - 1]) insertAt -= 1
    for (let i = relevantScratch.length; i > insertAt; i -= 1) {
      relevantScratch[i] = relevantScratch[i - 1]
      relevantDistanceScratch[i] = relevantDistanceScratch[i - 1]
    }
    relevantScratch[insertAt] = enemy
    relevantDistanceScratch[insertAt] = distance
  }

  return relevantScratch
}

/**
 * Weighted centroid of combat-relevant enemies — nearest first, bosses widen focus.
 */
export function computeEnemyGroupFocus(
  player: WorldXZ,
  enemies: CameraEnemySample[],
  config: Pick<CombatCameraConfig, 'maxRelevantEnemies' | 'bossFramingScale'>,
): WorldXZ | null {
  const relevant = selectNearestLiving(player, enemies, config.maxRelevantEnemies)
  if (relevant.length === 0) return null

  const hasBoss = relevant.some((enemy) => enemy.entityType === 'boss')

  let sumX = 0
  let sumZ = 0
  let weightTotal = 0

  for (const enemy of relevant) {
    const dist = worldDistance2D(player, enemy.world)
    let weight = 1 / (1 + dist * 0.35)
    if (enemy.entityType === 'boss') {
      weight *= config.bossFramingScale
    }
    sumX += enemy.world.x * weight
    sumZ += enemy.world.z * weight
    weightTotal += weight
  }

  if (weightTotal <= 0) {
    return relevant[0].world
  }

  const focus: WorldXZ = { x: sumX / weightTotal, z: sumZ / weightTotal }

  if (hasBoss) {
    const boss = relevant.find((enemy) => enemy.entityType === 'boss')
    if (boss) {
      const blend = 0.28
      focus.x = focus.x * (1 - blend) + boss.world.x * blend
      focus.z = focus.z * (1 - blend) + boss.world.z * blend
    }
  }

  return focus
}

export function computeCombatSpan(player: WorldXZ, enemyFocus: WorldXZ): number {
  return worldDistance2D(player, enemyFocus)
}

/**
 * Zoom from desired on-screen character height + combat span (close = zoom in).
 */
export function computeDesiredZoom(
  combatSpan: number,
  aspect: number,
  config: CombatCameraConfig,
  hasBoss: boolean,
): number {
  const pitchRad = degToRad(config.pitchDeg)
  const halfFov = degToRad(config.fovDeg) / 2
  const tanHalfFov = Math.tan(halfFov)

  const targetViewDistance =
    config.referenceCharacterHeight / (config.targetCharacterScreenHeightRatio * 2 * tanHalfFov)

  const baseHeight = config.distance * Math.sin(pitchRad) + config.heightOffset
  const baseViewDistance = computeViewDistance(baseHeight, pitchRad)
  let heightZoom = baseViewDistance / Math.max(0.01, targetViewDistance)

  if (hasBoss) {
    heightZoom *= config.bossDistanceModifier
  }

  const spanT = clamp(
    (combatSpan - config.minCombatSpanWorld) /
      Math.max(0.01, config.maxCombatSpanWorld - config.minCombatSpanWorld),
    0,
    1,
  )

  // Wider aspect gets a slight zoom boost so characters do not shrink on ultrawide phones.
  const aspectBoost = clamp(aspect / 1.78, 0.95, 1.08)
  const spanZoom = config.maxZoom + (config.minZoom - config.maxZoom) * spanT

  return clamp(heightZoom * spanZoom * aspectBoost, config.minZoom, config.maxZoom)
}

/** Midpoint between player and enemy group with composition offsets. */
export function computeLookTarget(
  player: WorldXZ,
  enemyFocus: WorldXZ | null,
  config: Pick<CombatCameraConfig, 'playerScreenBias' | 'depthCompositionBias'>,
): WorldXZ {
  if (!enemyFocus) {
    return {
      x: player.x,
      z: player.z + config.depthCompositionBias,
    }
  }

  const midpointX = (player.x + enemyFocus.x) / 2
  const midpointZ = (player.z + enemyFocus.z) / 2
  const deltaX = enemyFocus.x - player.x
  const deltaZ = enemyFocus.z - player.z

  return {
    x: midpointX + deltaX * config.playerScreenBias,
    z: midpointZ + deltaZ * config.playerScreenBias + config.depthCompositionBias,
  }
}

export function computeCameraPose(
  look: WorldXZ,
  zoom: number,
  config: CombatCameraConfig,
): CameraPose {
  const pitchRad = degToRad(config.pitchDeg)
  const effectiveDistance = config.distance / Math.max(0.01, zoom)
  const height = effectiveDistance * Math.sin(pitchRad) + config.heightOffset
  const back = effectiveDistance * Math.cos(pitchRad)

  return {
    lookX: look.x,
    lookY: config.targetHeightOffset,
    lookZ: look.z,
    positionX: look.x,
    positionY: height,
    positionZ: look.z + back,
  }
}

export function clampLookTarget(look: WorldXZ, limits: CameraRigLimits): WorldXZ {
  return {
    x: clamp(look.x, -limits.limitX, limits.limitX),
    z: clamp(look.z, -limits.limitZ, limits.limitZ),
  }
}
