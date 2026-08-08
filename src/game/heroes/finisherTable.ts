import type { AttackDefinition } from '../realtimeBattle/attacks'

/** Combo finisher metadata per hero — Blueprint §3.6.12 */
export interface FinisherSpec {
  characterId: string
  comboHitIndex: 2
  attackId: string
  knockdown: boolean
  notes: string
}

export const HERO_FINISHER_TABLE: FinisherSpec[] = [
  {
    characterId: 'monkey-king',
    comboHitIndex: 2,
    attackId: 'monkey-attack-3',
    knockdown: true,
    notes: 'Knockdown เฉพาะ elite/boss — ม็อบปกติได้แค่ hitstun',
  },
  {
    characterId: 'pig-warrior',
    comboHitIndex: 2,
    attackId: 'pig-attack-3',
    knockdown: true,
    notes: 'Heavy slam — finisher แรงสุดในชุด',
  },
  {
    characterId: 'celestial-archer',
    comboHitIndex: 2,
    attackId: 'archer-attack-3',
    knockdown: false,
    notes: 'Piercing shot — ไม่มี knockdown (ranged archetype)',
  },
  {
    characterId: 'nezha-warden',
    comboHitIndex: 2,
    attackId: 'nezha-attack-3',
    knockdown: false,
    notes: 'Root CC แทน knockdown — ตามกติกา control archetype',
  },
  {
    characterId: 'sand-sage',
    comboHitIndex: 2,
    attackId: 'sage-attack-3',
    knockdown: false,
    notes: 'Bead burst — ดาเมจ + summon charge',
  },
]

export function getFinisherSpec(characterId: string): FinisherSpec | undefined {
  return HERO_FINISHER_TABLE.find((row) => row.characterId === characterId)
}

export function getFinisherAttack(attackChain: AttackDefinition[]): AttackDefinition | undefined {
  return attackChain[2]
}
