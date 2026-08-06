import { MONKEY_SPRITE_URL, PIGSY_SPRITE_URL, TRIPITAKA_SPRITE_URL } from '../characters'

export interface EnemyTemplate {
  id: string
  name: string
  spriteUrl: string
  accent: string
  atk: number
  def: number
  spd: number
  hp: number
}

export interface BattleStage {
  id: string
  name: string
  recommendedLevel: number
  enemies: Array<{ templateId: string; slot: number }>
}

const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  'shadow-soldier': {
    id: 'shadow-soldier',
    name: 'ทหารเงา',
    spriteUrl: MONKEY_SPRITE_URL,
    accent: '#8b7cff',
    atk: 58,
    def: 42,
    spd: 72,
    hp: 420,
  },
  'demon-captain': {
    id: 'demon-captain',
    name: 'แม่ทัพปีศาจ',
    spriteUrl: PIGSY_SPRITE_URL,
    accent: '#ff6a5c',
    atk: 78,
    def: 55,
    spd: 64,
    hp: 680,
  },
  'spirit-guardian': {
    id: 'spirit-guardian',
    name: 'ผู้พิทักษ์วิญญาณ',
    spriteUrl: TRIPITAKA_SPRITE_URL,
    accent: '#6dffb8',
    atk: 66,
    def: 48,
    spd: 80,
    hp: 520,
  },
}

export const BATTLE_STAGES: BattleStage[] = [
  {
    id: 'trial-01',
    name: 'ทุ่งทดสอบแห่งเงา',
    recommendedLevel: 10,
    enemies: [
      { templateId: 'shadow-soldier', slot: 0 },
      { templateId: 'shadow-soldier', slot: 1 },
    ],
  },
  {
    id: 'trial-02',
    name: 'ประตูปีศาจ',
    recommendedLevel: 20,
    enemies: [
      { templateId: 'shadow-soldier', slot: 0 },
      { templateId: 'demon-captain', slot: 2 },
      { templateId: 'spirit-guardian', slot: 3 },
    ],
  },
]

export function getStage(id: string): BattleStage | undefined {
  return BATTLE_STAGES.find((stage) => stage.id === id)
}

export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_TEMPLATES[id]
}
