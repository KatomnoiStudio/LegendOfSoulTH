import { publicUrl } from '../../lib/publicUrl'
import type { CharacterModelKind } from '../characters'
import type { Vec2 } from './types'

/**
 * ข้อมูลด่านของห้องต่อสู้ real-time — แหล่งความจริงจุดเดียว
 *
 * ห้าม hard-code ข้อมูลด่านไว้ใน Component (§9) ทุกอย่างที่ห้องต่อสู้ต้องรู้
 * (ขนาดห้อง จุดเกิด คลื่นศัตรู ภาพพื้นหลัง) อยู่ในไฟล์นี้ไฟล์เดียว
 *
 * ค่าสถานะศัตรูตั้งต้นอ้างอิงจาก ENEMY_TEMPLATES ของระบบเทิร์นเดิม
 * (src/game/battle/stages.ts) แต่ปรับสเกลใหม่ให้เข้ากับการต่อสู้แบบเรียลไทม์:
 * เทิร์นเบสคิดดาเมจครั้งละมาก ๆ ทีละเทิร์น ส่วนเรียลไทม์ตีถี่กว่ามาก
 * HP จึงถูกลดลงราวครึ่งหนึ่ง และ atk ลดลงราว 60% เพื่อไม่ให้ผู้เล่นตายใน 2 ครั้ง
 */

/** หน่วยพิกัดของ runtime ต่อ 1 หน่วยของ Three.js */
export const WORLD_SCALE = 0.01

export interface RealtimeEnemyTemplate {
  id: string
  name: string
  /** ชุดเฟรมภาพที่ใช้ (ดู src/game/battleSpriteSequences.ts) */
  spriteKind: CharacterModelKind
  accent: string
  maxHp: number
  atk: number
  def: number
  /** หน่วยต่อวินาที */
  speed: number
  collisionRadius: number
  hurtboxRadius: number
  /**
   * ระยะที่เริ่มไล่ผู้เล่น
   *
   * ต้องกว้างพอครอบระยะจากจุดเกิดศัตรูถึงจุดเกิดผู้เล่น ไม่งั้นศัตรูจะยืนนิ่งตั้งแต่ต้น
   * และการต่อสู้จะไม่มีวันเริ่ม — ในลานฝึกหน้าวิหารระยะนั้นคือ ~784 หน่วย
   * (เจอตอนเขียนเทสต์: ค่าเดิม 520 ทำให้ศัตรูไม่ขยับเลยแม้แต่ก้าวเดียว)
   * ค่าที่ใช้จึงเผื่อไว้ให้ครอบเกือบทั้งห้อง แต่ยังเป็นขอบเขตจริงสำหรับด่านที่ใหญ่กว่านี้
   */
  detectRange: number
  /** ระยะที่เข้าโจมตีได้ */
  attackRange: number
  attackCooldownMs: number
}

export interface BattleWaveDefinition {
  id: string
  enemies: Array<{ templateId: string; spawnIndex: number }>
}

export interface RealtimeBattleStage {
  id: string
  name: string

  /** ขนาดห้องในพิกัด runtime */
  width: number
  height: number

  playerSpawn: Vec2
  enemySpawns: Vec2[]

  waves: BattleWaveDefinition[]

  backgroundAsset?: string
  musicAsset?: string
}

export const ENEMY_TEMPLATES: Record<string, RealtimeEnemyTemplate> = {
  'shadow-soldier': {
    id: 'shadow-soldier',
    name: 'ทหารเงา',
    spriteKind: 'pig-warrior',
    accent: '#8b7cff',
    maxHp: 210,
    atk: 22,
    def: 18,
    speed: 132,
    collisionRadius: 34,
    hurtboxRadius: 40,
    detectRange: 1600,
    attackRange: 74,
    attackCooldownMs: 1500,
  },
  'demon-captain': {
    id: 'demon-captain',
    name: 'แม่ทัพปีศาจ',
    spriteKind: 'pig-warrior',
    accent: '#ff6a5c',
    maxHp: 340,
    atk: 31,
    def: 24,
    speed: 118,
    collisionRadius: 40,
    hurtboxRadius: 48,
    detectRange: 1700,
    attackRange: 86,
    attackCooldownMs: 1700,
  },
  'spirit-guardian': {
    id: 'spirit-guardian',
    name: 'ผู้พิทักษ์วิญญาณ',
    spriteKind: 'pilgrim-monk',
    accent: '#6dffb8',
    maxHp: 260,
    atk: 26,
    def: 20,
    speed: 148,
    collisionRadius: 34,
    hurtboxRadius: 40,
    detectRange: 1600,
    attackRange: 78,
    attackCooldownMs: 1300,
  },
}

/**
 * ห้องแรก: ลานฝึกหน้าวิหาร (Temple Training Arena)
 *
 * ผู้เล่นเกิดล่างกลาง ศัตรูเกิดแถวบน ไม่มีสิ่งกีดขวางในเวอร์ชันแรก (§9)
 * ขนาดห้องกว้างกว่าจอออกแบบ (1600x900) เล็กน้อยเพื่อให้กล้องมีที่ให้ตาม
 */
const TEMPLE_TRAINING_ARENA_SPAWNS: Vec2[] = [
  { x: 420, y: 260 },
  { x: 900, y: 220 },
  { x: 1380, y: 260 },
  { x: 660, y: 400 },
  { x: 1140, y: 400 },
]

export const REALTIME_STAGES: Record<string, RealtimeBattleStage> = {
  'trial-01': {
    id: 'trial-01',
    name: 'ลานฝึกหน้าวิหาร',
    width: 1800,
    height: 1100,
    playerSpawn: { x: 900, y: 880 },
    enemySpawns: TEMPLE_TRAINING_ARENA_SPAWNS,
    waves: [
      {
        id: 'wave-1',
        enemies: [
          { templateId: 'shadow-soldier', spawnIndex: 0 },
          { templateId: 'shadow-soldier', spawnIndex: 1 },
          { templateId: 'shadow-soldier', spawnIndex: 2 },
        ],
      },
    ],
    backgroundAsset: publicUrl('ui/thai/thai-temple-lobby.png'),
  },
  'trial-02': {
    id: 'trial-02',
    name: 'ประตูปีศาจ',
    width: 1800,
    height: 1100,
    playerSpawn: { x: 900, y: 880 },
    enemySpawns: TEMPLE_TRAINING_ARENA_SPAWNS,
    waves: [
      {
        id: 'wave-1',
        enemies: [
          { templateId: 'shadow-soldier', spawnIndex: 0 },
          { templateId: 'spirit-guardian', spawnIndex: 2 },
        ],
      },
      {
        id: 'wave-2',
        enemies: [
          { templateId: 'demon-captain', spawnIndex: 1 },
          { templateId: 'shadow-soldier', spawnIndex: 3 },
          { templateId: 'shadow-soldier', spawnIndex: 4 },
        ],
      },
    ],
    backgroundAsset: publicUrl('backgrounds/wukong-vs-bull-demon-v2-game-art.png'),
  },
}

export function getRealtimeStage(id: string): RealtimeBattleStage | null {
  return REALTIME_STAGES[id] ?? null
}

export function getEnemyTemplate(id: string): RealtimeEnemyTemplate | null {
  return ENEMY_TEMPLATES[id] ?? null
}
