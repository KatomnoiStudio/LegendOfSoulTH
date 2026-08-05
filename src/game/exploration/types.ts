export type Direction = 'up' | 'down' | 'left' | 'right'

export interface PlayerPosition {
  x: number
  y: number
  direction: Direction
}

export interface ExplorationState {
  mapId: string
  playerPosition: PlayerPosition
  nearbyNpcId: string | null
  movementLocked: boolean
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface MapDefinition {
  id: string
  name: string
  width: number
  height: number
  background: string
  /** พื้นที่เดินได้ */
  walkBounds: Rect
  /** สิ่งกีดขวาง */
  obstacles: Rect[]
  spawn: PlayerPosition
}

export type MovementVector = {
  x: number
  y: number
}
