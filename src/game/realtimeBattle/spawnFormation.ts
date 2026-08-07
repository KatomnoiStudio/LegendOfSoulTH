import { DEFAULT_BATTLE_PRESENTATION, type BattlePresentationConfig } from './battlePresentation'
import type { RealtimeBattleStage } from './stageConfig'
import type { Vec2 } from './types'

/** Normalized offset from enemy group center — deterministic, readable formations. */
const FORMATION_SLOT_OFFSETS: ReadonlyArray<{ x: number; depth: number }> = [
  { x: 0, depth: 0 },
  { x: -1, depth: -0.85 },
  { x: 0.75, depth: 0.9 },
  { x: -0.55, depth: 0.65 },
  { x: 1.1, depth: -0.45 },
  { x: -1.2, depth: 0.15 },
  { x: 0.35, depth: -1.05 },
  { x: 1.35, depth: 0.35 },
]

export interface SpawnFootprint {
  collisionRadius: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizedToRuntime(
  xNorm: number,
  depthNorm: number,
  stage: Pick<RealtimeBattleStage, 'width' | 'height'>,
): Vec2 {
  return {
    x: xNorm * stage.width,
    y: depthNorm * stage.height,
  }
}

export function runtimeToNormalized(
  position: Vec2,
  stage: Pick<RealtimeBattleStage, 'width' | 'height'>,
): { xNorm: number; depthNorm: number } {
  return {
    xNorm: stage.width > 0 ? position.x / stage.width : 0.5,
    depthNorm: stage.height > 0 ? position.y / stage.height : 0.5,
  }
}

export function resolvePlayerSpawn(
  stage: Pick<RealtimeBattleStage, 'width' | 'height'>,
  presentation: BattlePresentationConfig = DEFAULT_BATTLE_PRESENTATION,
): Vec2 {
  const marginX = presentation.arenaMarginXNorm * stage.width
  const marginDepth = presentation.arenaMarginDepthNorm * stage.height

  return {
    x: clamp(presentation.playerStartXNorm * stage.width, marginX, stage.width - marginX),
    y: clamp(presentation.playerDepthNorm * stage.height, marginDepth, stage.height - marginDepth),
  }
}

function footprintScale(collisionRadius: number, baseRadius: number): number {
  return Math.max(1, collisionRadius / baseRadius)
}

function desiredEnemySlot(
  slotIndex: number,
  presentation: BattlePresentationConfig,
  footprint: number,
): { xNorm: number; depthNorm: number } {
  const offset = FORMATION_SLOT_OFFSETS[slotIndex % FORMATION_SLOT_OFFSETS.length]
  const h = presentation.enemyHorizontalSpacingNorm * footprint
  const d = presentation.enemyDepthSpacingNorm * footprint

  return {
    xNorm: presentation.enemyGroupCenterXNorm + offset.x * h,
    depthNorm: presentation.centerDepthNorm + offset.depth * d,
  }
}

export function resolveEnemyFormation(
  stage: Pick<RealtimeBattleStage, 'width' | 'height'>,
  footprints: SpawnFootprint[],
  presentation: BattlePresentationConfig = DEFAULT_BATTLE_PRESENTATION,
): Vec2[] {
  if (footprints.length === 0) return []

  const baseRadius = footprints[0]?.collisionRadius ?? 34
  const marginX = presentation.arenaMarginXNorm * stage.width
  const marginDepth = presentation.arenaMarginDepthNorm * stage.height
  const maxX = stage.width - marginX
  const maxY = stage.height - marginDepth
  const minX = marginX
  const minY = marginDepth

  const desired = footprints.map((footprint, index) => {
    const scale = footprintScale(footprint.collisionRadius, baseRadius)
    const slot = desiredEnemySlot(index, presentation, scale)
    return normalizedToRuntime(slot.xNorm, slot.depthNorm, stage)
  })

  return separateSpawnPositions(
    desired,
    footprints.map((f) => f.collisionRadius),
    {
      minX,
      minY,
      maxX,
      maxY,
      minSeparationMul: presentation.minSpawnSeparationMul,
    },
  )
}

export function separateSpawnPositions(
  positions: Vec2[],
  radii: number[],
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    minSeparationMul: number
  },
): Vec2[] {
  const result = positions.map((p) => ({ ...p }))

  for (let iter = 0; iter < 10; iter++) {
    let moved = false

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]
        const b = result[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        const minDist = (radii[i] + radii[j]) * bounds.minSeparationMul

        if (dist < minDist) {
          if (dist < 0.001) {
            b.x += minDist * 0.5
            moved = true
            continue
          }
          const push = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          a.x -= nx * push
          a.y -= ny * push
          b.x += nx * push
          b.y += ny * push
          moved = true
        }
      }
    }

    for (const pos of result) {
      pos.x = clamp(pos.x, bounds.minX, bounds.maxX)
      pos.y = clamp(pos.y, bounds.minY, bounds.maxY)
    }

    if (!moved) break
  }

  return result
}

/** Horizontal gap between player and enemy group center (normalized X). */
export function startGapXNorm(
  presentation: BattlePresentationConfig = DEFAULT_BATTLE_PRESENTATION,
): number {
  return presentation.enemyGroupCenterXNorm - presentation.playerStartXNorm
}
