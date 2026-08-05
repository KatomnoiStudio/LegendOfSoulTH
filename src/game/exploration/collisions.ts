import type { MapDefinition, PlayerPosition, Rect } from './types'

const PLAYER_RADIUS = 18

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function playerRect(position: PlayerPosition): Rect {
  return {
    x: position.x - PLAYER_RADIUS,
    y: position.y - PLAYER_RADIUS,
    width: PLAYER_RADIUS * 2,
    height: PLAYER_RADIUS * 2,
  }
}

function insideBounds(position: PlayerPosition, bounds: Rect): boolean {
  const rect = playerRect(position)
  return (
    rect.x >= bounds.x
    && rect.y >= bounds.y
    && rect.x + rect.width <= bounds.x + bounds.width
    && rect.y + rect.height <= bounds.y + bounds.height
  )
}

export function isWalkable(
  position: PlayerPosition,
  map: MapDefinition,
  extraObstacles: Rect[] = [],
): boolean {
  if (!insideBounds(position, map.walkBounds)) return false

  const rect = playerRect(position)
  const obstacles = [...map.obstacles, ...extraObstacles]
  return !obstacles.some((obstacle) => rectsOverlap(rect, obstacle))
}

export function clampToWalkable(
  position: PlayerPosition,
  map: MapDefinition,
  extraObstacles: Rect[] = [],
): PlayerPosition {
  if (isWalkable(position, map, extraObstacles)) return position

  const candidates: PlayerPosition[] = [
    position,
    { ...position, x: position.x - 4 },
    { ...position, x: position.x + 4 },
    { ...position, y: position.y - 4 },
    { ...position, y: position.y + 4 },
  ]

  return candidates.find((candidate) => isWalkable(candidate, map, extraObstacles)) ?? position
}

export function npcObstacle(npc: { position: { x: number; y: number }; interactionRadius: number }): Rect {
  const size = npc.interactionRadius * 1.2
  return {
    x: npc.position.x - size / 2,
    y: npc.position.y - size / 2,
    width: size,
    height: size,
  }
}

export function hasLineOfSight(
  from: PlayerPosition,
  to: { x: number; y: number },
  map: MapDefinition,
): boolean {
  const steps = 8
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    const probe: PlayerPosition = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      direction: from.direction,
    }
    if (!isWalkable(probe, map)) return false
  }
  return true
}
