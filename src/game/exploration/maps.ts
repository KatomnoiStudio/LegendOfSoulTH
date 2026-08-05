import { publicUrl } from '../../lib/publicUrl'
import type { MapDefinition } from './types'

export const MAPS: Record<string, MapDefinition> = {
  'village-01': {
    id: 'village-01',
    name: 'หมู่บ้านแห่งเงา',
    width: 1200,
    height: 800,
    background: publicUrl('ui/thai/thai-temple-lobby.png'),
    walkBounds: { x: 80, y: 120, width: 1040, height: 560 },
    obstacles: [
      { x: 480, y: 280, width: 240, height: 120 },
      { x: 180, y: 420, width: 120, height: 80 },
      { x: 900, y: 400, width: 140, height: 100 },
    ],
    spawn: { x: 200, y: 520, direction: 'right' },
  },
}

export function getMap(mapId: string): MapDefinition | undefined {
  return MAPS[mapId]
}
