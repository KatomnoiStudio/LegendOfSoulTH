/**
 * คณิตศาสตร์การเดินอิสระของฉาก WukongAdventure — แยกจาก component ตามแพทเทิร์นเดียวกับ
 * src/game/exploration/movement.ts (เกรดกริด) แม้อัลกอริทึมจะต่างกันจริง (navmesh รูปหลายเหลี่ยม
 * 8 ทิศ vs กริด 4 ทิศ) — CoalBoard ask-CB สรุปตรงกัน 4/4 ว่าไม่ควรรวมเป็นระบบเดียว
 * (ปัญหาคนละแบบจริง) แต่ควรแยกคณิตศาสตร์ล้วนออกจาก UI component เหมือนฝั่งกริด
 */

export type Direction =
  'down' | 'down-right' | 'right' | 'up-right' | 'up' | 'up-left' | 'left' | 'down-left'

export type Point = { x: number; y: number }

/**
 * Navigation mesh traced from the visible courtyard floor. The narrow top is
 * the temple stairway: the player can approach the door, while the two upper
 * wings remain solid walls instead of invisible walkable scenery.
 */
export const WALKABLE_AREA: Point[] = [
  { x: 735, y: 530 },
  { x: 865, y: 530 },
  { x: 1015, y: 642 },
  { x: 1425, y: 662 },
  { x: 1490, y: 715 },
  { x: 1490, y: 790 },
  { x: 110, y: 790 },
  { x: 110, y: 715 },
  { x: 175, y: 662 },
  { x: 585, y: 642 },
]

export function directionFromVector(x: number, y: number): Direction {
  const angle = Math.atan2(y, x)
  const octant = Math.round(angle / (Math.PI / 4))
  const lookup: Record<number, Direction> = {
    0: 'right',
    1: 'down-right',
    2: 'down',
    3: 'down-left',
    4: 'left',
    [-4]: 'left',
    [-3]: 'up-left',
    [-2]: 'up',
    [-1]: 'up-right',
  }
  return lookup[octant] ?? 'down'
}

export function isInsideWalkableArea(point: Point): boolean {
  let inside = false
  for (
    let index = 0, previous = WALKABLE_AREA.length - 1;
    index < WALKABLE_AREA.length;
    previous = index++
  ) {
    const currentPoint = WALKABLE_AREA[index]
    const previousPoint = WALKABLE_AREA[previous]
    const crossesRay =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (crossesRay) inside = !inside
  }
  return inside
}

export function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  if (lengthSquared === 0) return start
  const amount = Math.min(
    1,
    Math.max(0, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared),
  )
  return { x: start.x + segmentX * amount, y: start.y + segmentY * amount }
}

export function projectToWalkableArea(point: Point): Point {
  if (isInsideWalkableArea(point)) return point

  let closest = WALKABLE_AREA[0]
  let closestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < WALKABLE_AREA.length; index++) {
    const candidate = closestPointOnSegment(
      point,
      WALKABLE_AREA[index],
      WALKABLE_AREA[(index + 1) % WALKABLE_AREA.length],
    )
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }
  return closest
}
