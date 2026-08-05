import { publicUrl } from '../../lib/publicUrl'
import type { NpcDefinition } from './types'

export const NPCS: NpcDefinition[] = [
  {
    id: 'npc-shadow-guard',
    name: 'ทหารเงา',
    spriteUrl: publicUrl('characters/monkey-v2-idle-0.png'),
    mapId: 'village-01',
    /*
      เดิมอยู่ที่ (620, 360) ซึ่งอยู่ "ข้างใน" สิ่งกีดขวางของแผนที่
      (480,280 ขนาด 240x120 = ครอบ x 480–720, y 280–400 ดู src/game/exploration/maps.ts)

      ผลคือคุยกับ NPC ตัวนี้ไม่ได้เลย: findNearbyNpc เรียก hasLineOfSight ซึ่งไล่ probe
      เป็นจุด ๆ จากผู้เล่นไปหา NPC แล้วเช็ค isWalkable ทุกจุด — จุดปลายทางอยู่ในสิ่งกีดขวาง
      จึงคืน false เสมอ ปุ่ม "คุย" เลยไม่เคยขึ้น และด่าน trial-01 เข้าไม่ได้ทั้งเกม

      ย้ายลงมาที่ y = 448 ซึ่งพ้นขอบล่างของสิ่งกีดขวาง (400) แล้ว ยังยืนอยู่หน้าวิหาร
      เหมือนเดิม และผู้เล่นเดินเข้าถึงได้จริง (ระยะเข้าใกล้สุด ~61 < interactionRadius 72)
    */
    position: { x: 620, y: 448 },
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
