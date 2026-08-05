import { useCallback, useEffect, useRef, useState } from 'react'
import { clampToWalkable, isWalkable, npcObstacle } from '../game/exploration/collisions'
import { getMap } from '../game/exploration/maps'
import { movePosition } from '../game/exploration/movement'
import { findNearbyNpc } from '../game/npc/proximity'
import { getNpcsForMap } from '../game/npc/npcs'
import type { ExplorationState, MovementVector } from '../game/exploration/types'

const KEY_TO_VECTOR: Record<string, MovementVector> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
}

interface UseExplorationOptions {
  mapId: string
  initialPosition?: ExplorationState['playerPosition']
  movementLocked: boolean
}

export function useExploration({
  mapId,
  initialPosition,
  movementLocked,
}: UseExplorationOptions) {
  const map = getMap(mapId)
  const npcs = getNpcsForMap(mapId)

  const [state, setState] = useState<ExplorationState>(() => ({
    mapId,
    playerPosition: initialPosition ?? map?.spawn ?? { x: 200, y: 520, direction: 'right' },
    nearbyNpcId: null,
    movementLocked,
  }))

  const inputRef = useRef<MovementVector>({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    setState((current) => ({ ...current, movementLocked }))
  }, [movementLocked])

  useEffect(() => {
    if (!map || movementLocked) return

    const tick = (time: number) => {
      const last = lastTimeRef.current ?? time
      lastTimeRef.current = time
      const delta = Math.min(0.05, (time - last) / 1000)
      const vector = inputRef.current

      if (vector.x !== 0 || vector.y !== 0) {
        setState((current) => {
          const npcBlocks = npcs.map(npcObstacle)
          const next = movePosition(current.playerPosition, vector, delta)
          const clamped = clampToWalkable(
            isWalkable(next, map, npcBlocks) ? next : current.playerPosition,
            map,
            npcBlocks,
          )
          const nearby = findNearbyNpc(clamped, npcs, map)
          return {
            ...current,
            playerPosition: clamped,
            nearbyNpcId: nearby?.id ?? null,
          }
        })
      } else {
        setState((current) => {
          const nearby = findNearbyNpc(current.playerPosition, npcs, map)
          const nextId = nearby?.id ?? null
          if (nextId === current.nearbyNpcId) return current
          return { ...current, nearbyNpcId: nextId }
        })
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = null
    }
  }, [map, movementLocked, npcs])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (movementLocked) return
      const vector = KEY_TO_VECTOR[event.key]
      if (!vector) return
      event.preventDefault()
      inputRef.current = vector
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const vector = KEY_TO_VECTOR[event.key]
      if (!vector) return
      event.preventDefault()
      inputRef.current = { x: 0, y: 0 }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [movementLocked])

  const setMovementVector = useCallback((vector: MovementVector) => {
    if (movementLocked) return
    inputRef.current = vector
  }, [movementLocked])

  const setPosition = useCallback((position: ExplorationState['playerPosition']) => {
    setState((current) => ({ ...current, playerPosition: position }))
  }, [])

  return {
    map,
    npcs,
    state,
    setMovementVector,
    setPosition,
  }
}
