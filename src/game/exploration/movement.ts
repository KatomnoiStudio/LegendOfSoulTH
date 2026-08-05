import type { Direction, MovementVector, PlayerPosition } from './types'

const DIRECTION_VECTORS: Record<Direction, MovementVector> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const MOVE_SPEED = 180

export function vectorFromDirection(direction: Direction): MovementVector {
  return DIRECTION_VECTORS[direction]
}

export function directionFromVector(vector: MovementVector): Direction {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x < 0 ? 'left' : 'right'
  }
  return vector.y < 0 ? 'up' : 'down'
}

export function movePosition(
  position: PlayerPosition,
  vector: MovementVector,
  deltaSeconds: number,
  speed = MOVE_SPEED,
): PlayerPosition {
  if (vector.x === 0 && vector.y === 0) return position

  const length = Math.hypot(vector.x, vector.y)
  const nx = (vector.x / length) * speed * deltaSeconds
  const ny = (vector.y / length) * speed * deltaSeconds

  return {
    x: position.x + nx,
    y: position.y + ny,
    direction: directionFromVector(vector),
  }
}

export function nudgeAwayFrom(
  position: PlayerPosition,
  target: { x: number; y: number },
  distance: number,
): PlayerPosition {
  const dx = position.x - target.x
  const dy = position.y - target.y
  const length = Math.hypot(dx, dy) || 1
  return {
    ...position,
    x: target.x + (dx / length) * distance,
    y: target.y + (dy / length) * distance,
  }
}
