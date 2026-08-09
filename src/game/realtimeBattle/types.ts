/**
 * ชนิดข้อมูลของห้องต่อสู้แบบ Real-time (Top-down Hack & Slash)
 *
 * แยกขาดจากระบบ Turn-based เดิมใน src/game/battle/ โดยตั้งใจ —
 * ห้ามนำ BattleSnapshot แบบเทิร์นมาใช้ต่อ และห้ามให้สองระบบใช้ type ร่วมกัน
 * (ยกเว้น BattleResult ที่เป็น contract กับ useGameFlow ซึ่งแปลงผ่าน BattleResultAdapter)
 *
 * ── ระบบพิกัด ──────────────────────────────────────────────
 * Runtime ใช้พิกัด 2 มิติแบบ "หน่วยเดียวกับแผนที่สำรวจ" (หน่วยละ ~1px ของงานออกแบบ)
 *   x = ซ้าย→ขวา, y = บน→ล่าง  (y เพิ่ม = เดินลงล่างของจอ)
 * ตอนวาดด้วย Three.js จะ map เป็น (x, 0, y) บนระนาบ XZ แล้วคูณ WORLD_SCALE
 * ดู src/components/BattleScene/BattleArena.tsx
 * ───────────────────────────────────────────────────────────
 */

export type BattleStatus = 'loading' | 'intro' | 'running' | 'victory' | 'defeat' | 'exiting'

export interface Vec2 {
  x: number
  y: number
}

export type Direction8 =
  'up' | 'up-right' | 'right' | 'down-right' | 'down' | 'down-left' | 'left' | 'up-left'

export type EntityState = 'idle' | 'walk' | 'attack' | 'skill' | 'dash' | 'hit' | 'dead'

/** ฝ่ายของหน่วย — ใช้ตรวจว่า hitbox ทำอันตรายใครได้บ้าง */
export type EntityType = 'player' | 'enemy' | 'boss'

export interface RealtimeBattleEntity {
  id: string
  entityType: EntityType
  name: string
  position: Vec2
  velocity: Vec2
  facing: Direction8
  state: EntityState
  /** ภาพ Normal Attack ที่สุ่มไว้สำหรับไม้ปัจจุบัน ห้ามสุ่มใหม่ระหว่างเล่นเฟรม */
  attackAnimationId?: 'attack-1' | 'attack-2' | 'attack-3' | 'skill-1' | 'skill-2'

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
  skillCooldownRemainingMs: number
  dashCooldownRemainingMs: number

  /** เวลา (elapsedMs ของ runtime) ที่ยังอยู่ยงคงกระพันจนถึง */
  invulnerableUntilMs: number
  hitStunRemainingMs: number

  /** id ตัวละครผู้เล่น (ดู src/game/characters.ts) — มีเฉพาะฝ่ายผู้เล่น */
  characterId?: string
  /** id แม่แบบศัตรู (ดู stageConfig.ts) — มีเฉพาะฝ่ายศัตรู */
  enemyId?: string
}

export interface DamageEvent {
  id: string
  targetId: string
  amount: number
  critical: boolean
  position: Vec2
  createdAtMs: number
}

export type BattleEffectKind =
  'hit-spark' | 'dash-trail' | 'skill-spin' | 'skill-lightning' | 'death' | 'spawn'

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
