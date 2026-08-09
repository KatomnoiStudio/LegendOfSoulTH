/**
 * ชนิดข้อมูลของห้องต่อสู้แบบ Real-time (2.5D side-down — Blueprint v3)
 *
 * ── ระบบพิกัด (ดู battleCoordinates.ts) ─────────────────
 * Runtime: x = ซ้าย–ขวา, y = depth หน้า–หลัง
 * World:   XZ plane — y runtime → world Z (depth)
 * ───────────────────────────────────────────────────────────
 */

import type { SkillSlot } from './skills'

export type BattleStatus = 'loading' | 'intro' | 'running' | 'victory' | 'defeat' | 'exiting'

export interface Vec2 {
  x: number
  y: number
}

export type Direction8 =
  'up' | 'up-right' | 'right' | 'down-right' | 'down' | 'down-left' | 'left' | 'up-left'

/** ทิศโจมตีพื้นฐาน — ซ้าย/ขวาเท่านั้น (Blueprint v3 P2) */
export type CombatFacing = 'left' | 'right'

/**
 * knockdown/getup ต่อจาก hit ตามลำดับ Hit → Knockdown → GetUp → Chase (§3.6.8)
 * ใช้ร่วมกันทั้ง elite และ boss ไม่มี state แยกต่อ tier (§3.8.4)
 */
export type EntityState =
  'idle' | 'walk' | 'attack' | 'skill' | 'hit' | 'dead' | 'knockdown' | 'getUp'

/** ระดับความแรงของศัตรู — elite ยืมสเตตัสจากตัวคูณในข้อมูล ไม่มี kit พิเศษ (§3.8.4) */
export type EnemyTier = 'normal' | 'elite'

/** Mob / elite / boss tier — elite uses same AI core, different data. */
export type CombatTier = 'mob' | 'elite' | 'boss'

/** ช่องสกิล 1–3 (ultimate ใช้ gauge แยก — ดู ultimateGauge.ts) */
export type SkillCooldownSlot = 'skill1' | 'skill2' | 'skill3'

/**
 * ฝ่ายของหน่วย — ใช้ตรวจว่า hitbox ทำอันตรายใครได้บ้าง
 *
 * 'ally' = หน่วยที่เกิดจากเอฟเฟกต์ summon (§3.8.3) — วิ่งสมองเดียวกับ EnemyAISystem
 * แต่ธงฝ่ายตรงข้าม (เล็งศัตรู ไม่ใช่เล็งผู้เล่น)
 */
export type EntityType = 'player' | 'pvp-player' | 'enemy' | 'boss' | 'ally'

/** สถานะ buff ที่ยังค้างเวลาอยู่บนหน่วยหนึ่งตัว (Effects System §7 — kind 'buff') */
export interface ActiveBuff {
  buffType: string
  magnitude: number
  remainingMs: number
}

/**
 * สถานะ CC (stun/root/silence) ที่ยังค้างเวลาอยู่บนหน่วยหนึ่งตัว (Effects System §7 — kind 'cc')
 *
 * เป็นสถานะแยกจาก hit-reaction/knockdown โดยเจตนา (§3.8.6) — ระบบนี้แค่เขียน record ไว้
 * ให้ Hit Reaction System (#6, ยังไม่ทำ) เป็นคนอ่านไปกันไม่ให้ขยับ/ร่ายท่าในอนาคต
 */
export interface ActiveCc {
  ccType: string
  remainingMs: number
}

export interface RealtimeBattleEntity {
  id: string
  entityType: EntityType
  name: string
  position: Vec2
  velocity: Vec2
  facing: Direction8
  /** ทิศโจมตีซ้าย/ขวา — แยกจาก facing สำหรับสไปรต์เดิน (P2) */
  combatFacing: CombatFacing
  state: EntityState

  hp: number
  maxHp: number
  atk: number
  def: number
  /** หน่วยต่อวินาที (พิกัด runtime) */
  speed: number

  /** รัศมีกันชนกับตัวอื่นและกับขอบห้อง */
  collisionRadius: number
  /** รัศมีที่ถูกโจมตีโดน — แยกจาก collisionRadius และห้ามอิงขนาดภาพ PNG (§15) */
  hurtboxRadius: number

  attackCooldownRemainingMs: number
  skillCooldownsMs: Record<SkillCooldownSlot, number>
  /** 0–100 — เต็มแล้วใช้อัลติเมทได้ (Blueprint v3 P3) */
  ultimateGauge: number

  /** เวลา (elapsedMs ของ runtime) ที่ยังอยู่ยงคงกระพันจนถึง */
  invulnerableUntilMs: number
  hitStunRemainingMs: number
  knockdownRemainingMs: number
  getUpRemainingMs: number
  /** mob | elite | boss — drives knockdown eligibility */
  combatTier: CombatTier

  /** id ตัวละครผู้เล่น (ดู src/game/characters.ts) — มีเฉพาะฝ่ายผู้เล่น */
  characterId?: string
  /** Auth profile that controls a PvP combatant; absent for PvE entities. */
  controllerId?: string
  /** id แม่แบบศัตรู (ดู stageConfig.ts) — มีเฉพาะฝ่ายศัตรูและฝ่าย ally ที่เกิดจาก summon */
  enemyId?: string
  /**
   * ระดับความแรง — resolve มาจาก RealtimeEnemyTemplate.tier ตอนสร้าง entity (§3.8.4)
   * ไม่มี = ฝ่ายผู้เล่น หรือศัตรูที่ไม่ผ่าน createWaveEnemies (fallback ปฏิบัติเหมือน 'normal')
   */
  tier?: EnemyTier

  /** buff ที่กำลังค้างเวลาอยู่ (Effects System §7) — ไม่มี = ไม่มี buff ใด ๆ อยู่ */
  activeBuffs?: ActiveBuff[]
  /** CC ที่กำลังค้างเวลาอยู่ (Effects System §7) — ไม่มี = ไม่ติด CC ใด ๆ */
  activeCc?: ActiveCc[]
}

export interface DamageEvent {
  id: string
  targetId: string
  amount: number
  critical: boolean
  position: Vec2
  createdAtMs: number
}

export type BattleEffectKind = 'hit-spark' | 'skill-spin' | 'death' | 'spawn' | 'ground-marker'

export interface BattleEffectEvent {
  id: string
  kind: BattleEffectKind
  position: Vec2
  createdAtMs: number
  durationMs: number
}

/**
 * ภาพนิ่งของสถานะห้องต่อสู้ที่ React อ่านได้
 *
 * ตัวนี้ถูกสร้างใหม่เฉพาะตอน publish (ไม่ใช่ทุกเฟรมจำลอง) — React ใช้แค่ค่าที่ HUD ต้องรู้
 * ส่วนตำแหน่งตัวละครที่ต้องลื่นทุกเฟรม อ่านตรงจาก runtime ผ่าน ref (ดู §8 ของสเปก)
 */
export interface RealtimeBattleSnapshot {
  stageId: string
  stageName: string
  status: BattleStatus
  elapsedMs: number

  player: RealtimeBattleEntity
  enemies: RealtimeBattleEntity[]

  currentWave: number
  totalWaves: number

  /** ช่องสกิลที่กำลังร่าย — null เมื่อไม่ได้ร่าย (สำหรับ UI state) */
  castingSkillSlot: SkillSlot | null

  damageEvents: DamageEvent[]
  effectEvents: BattleEffectEvent[]
}

/** ผลการต่อสู้ของระบบ real-time — แปลงเป็น contract เดิมด้วย BattleResultAdapter */
export interface RealtimeBattleResult {
  outcome: 'victory' | 'defeat'
  stageId: string
  stageName: string
  elapsedMs: number
  defeatedEnemyIds: string[]
  damageDealt: number
  damageTaken: number
  earnedExp: number
  earnedGold: number
  droppedItems: Array<{ itemId: string; quantity: number }>
  finishedAt: string
}
