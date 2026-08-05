import { hasLineOfSight } from '../exploration/collisions'
import type { MapDefinition } from '../exploration/types'
import type { PlayerPosition } from '../exploration/types'
import type { NpcDefinition } from './types'

export function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function findNearbyNpc(
  position: PlayerPosition,
  npcs: NpcDefinition[],
  map: MapDefinition,
): NpcDefinition | null {
  let closest: NpcDefinition | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const npc of npcs) {
    const radiusSq = npc.interactionRadius * npc.interactionRadius
    const distSq = distanceSquared(position, npc.position)
    if (distSq > radiusSq) continue
    if (!hasLineOfSight(position, npc.position, map)) continue
    if (distSq < closestDistance) {
      closest = npc
      closestDistance = distSq
    }
  }

  return closest
}
