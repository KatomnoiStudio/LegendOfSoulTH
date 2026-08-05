import { publicUrl } from '../../lib/publicUrl'
import type { NpcDefinition } from './types'

export const NPCS: NpcDefinition[] = [
  {
    id: 'npc-shadow-guard',
    name: 'ทหารเงา',
    spriteUrl: publicUrl('characters/monkey-v2-idle-0.png'),
    mapId: 'village-01',
    position: { x: 620, y: 360 },
    dialogueId: 'shadow-guard',
    interactionRadius: 72,
    battleStageId: 'trial-01',
  },
  {
    id: 'npc-shadow-captain',
    name: 'หัวหน้าทหารเงา',
    spriteUrl: publicUrl('characters/pigsy-idle-0.png'),
    mapId: 'village-01',
    position: { x: 920, y: 300 },
    dialogueId: 'shadow-captain',
    interactionRadius: 80,
    battleStageId: 'trial-02',
  },
]

export function getNpc(id: string): NpcDefinition | undefined {
  return NPCS.find((npc) => npc.id === id)
}

export function getNpcsForMap(mapId: string): NpcDefinition[] {
  return NPCS.filter((npc) => npc.mapId === mapId)
}
