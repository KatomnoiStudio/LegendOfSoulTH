import { TEMPLE_LOBBY_BG, BATTLE_ART_BG } from '../backgroundAssets'
import type { CharacterModelKind } from '../characters'
import { resolvePlayerSpawn } from './spawnFormation'
import type { Vec2 } from './types'

/**
 * ข้อมูลด่านของห้องต่อสู้ real-time — แหล่งความจริงจุดเดียว
 *
 * ห้าม hard-code ข้อมูลด่านไว้ใน Component (§9) ทุกอย่างที่ห้องต่อสู้ต้องรู้
 * (ขนาดห้อง จุดเกิด คลื่นศัตรู ภาพพื้นหลัง) อยู่ในไฟล์นี้ไฟล์เดียว
 *
 * ค่าสถานะศัตรูตั้งต้นอ้างอิงจาก ENEMY_TEMPLATES ของระบบเทิร์นเดิม
 * (ไฟล์นั้นถูกลบไปพร้อมระบบเทิร์นแล้ว ดูของเดิมได้จากประวัติ git) แต่ปรับสเกลใหม่
 * ให้เข้ากับการต่อสู้แบบเรียลไทม์:
 * เทิร์นเบสคิดดาเมจครั้งละมาก ๆ ทีละเทิร์น ส่วนเรียลไทม์ตีถี่กว่ามาก HP จึงถูกลดลง
 *
 * ── เรื่อง atk ที่ต้องระวัง ─────────────────────────────────
 * สูตรดาเมจหักเกราะแบบ `atk - def * 0.42` และมีพื้นขั้นต่ำที่ 1 แปลว่าถ้า atk ของศัตรู
 * ต่ำกว่า `def ของผู้เล่น × 0.42` **ทุกหมัดจะเข้าแค่ 1 แต้ม** ผู้เล่นจะอมตีไปตลอด
 * เคยตั้ง atk ไว้ 22 ตอนแรกแล้วเจออาการนี้จริงตอนทดสอบในเบราว์เซอร์: สู้กับศัตรู 3 ตัว
 * ราว 8 วินาที ผู้เล่นเสียเลือดรวม 2 แต้ม
 * หงอคงมี def 78 → เกณฑ์ขั้นต่ำคือ ~33 ค่าที่ใช้จึงเผื่อไว้เหนือเกณฑ์นั้นพอสมควร
 * ถ้าจะเพิ่มตัวละครที่ def สูงกว่านี้ ต้องกลับมาทบทวนตัวเลขชุดนี้ด้วย
 * ────────────────────────────────────────────────────────────
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
  /** Attack row id in ENEMY_ATTACKS */
  attackId: string
  /** AI role config — same core, different data */
  aiRole: 'melee' | 'ranged' | 'tank' | 'controller' | 'support' | 'elite'
  combatTier: 'mob' | 'elite' | 'boss'
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
    atk: 55,
    def: 18,
    speed: 132,
    collisionRadius: 34,
    hurtboxRadius: 40,
    detectRange: 1600,
    attackRange: 74,
    attackCooldownMs: 1500,
    attackId: 'enemy-melee',
    aiRole: 'melee',
    combatTier: 'mob',
  },
  'demon-captain': {
    id: 'demon-captain',
    name: 'แม่ทัพปีศาจ',
    spriteKind: 'pig-warrior',
    accent: '#ff6a5c',
    maxHp: 340,
    atk: 72,
    def: 24,
    speed: 118,
    collisionRadius: 40,
    hurtboxRadius: 48,
    detectRange: 1700,
    attackRange: 86,
    attackCooldownMs: 1700,
    attackId: 'enemy-elite-slam',
    aiRole: 'elite',
    combatTier: 'elite',
  },
  'spirit-guardian': {
    id: 'spirit-guardian',
    name: 'ผู้พิทักษ์วิญญาณ',
    spriteKind: 'pilgrim-monk',
    accent: '#6dffb8',
    maxHp: 260,
    atk: 62,
    def: 20,
    speed: 148,
    collisionRadius: 34,
    hurtboxRadius: 40,
    detectRange: 1600,
    attackRange: 78,
    attackCooldownMs: 1300,
    attackId: 'enemy-melee',
    aiRole: 'controller',
    combatTier: 'mob',
  },
}

/**
 * ห้องแรก: ลานฝึกหน้าวิหาร (Temple Training Arena)
 *
 * Spawn composition มาจาก `spawnFormation.ts` + `battlePresentation.ts`
 * (player ซ้าย / enemy ขวา / formation กลางสนาม) — `playerSpawn`/`enemySpawns`
 * ใน stage object เป็น snapshot สำหรับเทสต์/เอกสารเท่านั้น
 */
const ARENA_SIZE = { width: 1800, height: 1100 }
const PRESENTATION_PLAYER_SPAWN = resolvePlayerSpawn(ARENA_SIZE)

export const REALTIME_STAGES: Record<string, RealtimeBattleStage> = {
  'trial-01': {
    id: 'trial-01',
    name: 'ลานฝึกหน้าวิหาร',
    width: ARENA_SIZE.width,
    height: ARENA_SIZE.height,
    playerSpawn: PRESENTATION_PLAYER_SPAWN,
    enemySpawns: [],
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
    backgroundAsset: TEMPLE_LOBBY_BG,
  },
  'trial-02': {
    id: 'trial-02',
    name: 'ประตูปีศาจ',
    width: ARENA_SIZE.width,
    height: ARENA_SIZE.height,
    playerSpawn: PRESENTATION_PLAYER_SPAWN,
    enemySpawns: [],
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
    backgroundAsset: BATTLE_ART_BG,
  },
}

export function getRealtimeStage(id: string): RealtimeBattleStage | null {
  return REALTIME_STAGES[id] ?? null
}

export function getEnemyTemplate(id: string): RealtimeEnemyTemplate | null {
  return ENEMY_TEMPLATES[id] ?? null
}
