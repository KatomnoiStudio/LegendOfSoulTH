import { reportError } from '../../lib/errors/reportError'
import { getEnemyTemplate } from './stageConfig'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * Effects System — เอฟเฟกต์ที่ไม่ใช่ดาเมจบนท่าโจมตี/สกิล (Blueprint v3 §3.6.7/§3.8, agent-blueprint #7)
 *
 * แค่ตัวแปลความหมาย effects[] เป็นการแก้สถานะจริง — ไม่ใช่ pipeline/manager ทั่วไป
 * (ตาม low-maintenance-cost design ของ work contract: ยังไม่มีเหตุผลให้สร้าง
 * StatusEffectManager ทั้งที่มีแค่ 4 kind และแต่ละ kind มี caller จริงแค่ที่เดียว)
 *
 * cc/buff ไม่แตะ hitStunRemainingMs และไม่เรียก applyDamage เด็ดขาด (§3.8.6) — เส้นแบ่งนี้
 * คือสิ่งที่ Done-criterion #4 ของ work contract เทสต์อยู่
 */

export type TargetSelector =
  'self' | 'singleEnemy' | 'nearestEnemy' | 'allEnemies' | 'singleAlly' | 'allAllies' | 'aoe'

export interface HealEffectDefinition {
  kind: 'heal'
  target: TargetSelector
  healAmount: number
}

export interface BuffEffectDefinition {
  kind: 'buff'
  target: TargetSelector
  buffType: string
  magnitude: number
  durationMs: number
}

export interface CcEffectDefinition {
  kind: 'cc'
  target: TargetSelector
  ccType: string
  ccDurationMs: number
}

export interface SummonEffectDefinition {
  kind: 'summon'
  target: TargetSelector
  summonId: string
}

export type EffectDefinition =
  HealEffectDefinition | BuffEffectDefinition | CcEffectDefinition | SummonEffectDefinition

/**
 * หน่วยที่มีอยู่จริงบนสนามตอนแก้เอฟเฟกต์ — ผู้เรียกส่งมาสด ๆ ทุกครั้ง ไม่ได้อ้างอิง state กลาง
 * (ตัด "active hero" implicit assumption ทิ้งตั้งแต่ signature — ดู Known scars ในสเปก)
 */
export interface EffectContext {
  /** หน่วยที่เป็นเจ้าของเอฟเฟกต์ (ผู้ร่าย) — ไม่จำเป็นต้องเป็นผู้เล่นตัวที่กำลังแอคทีฟ */
  owner: RealtimeBattleEntity
  /** พวกเดียวกับ owner ที่ไม่ใช่ตัว owner เอง (summon ที่ยังไม่ตาย ฯลฯ) */
  allies: RealtimeBattleEntity[]
  /** ฝ่ายตรงข้ามของ owner */
  enemies: RealtimeBattleEntity[]
}

function alive(unit: RealtimeBattleEntity): boolean {
  return unit.state !== 'dead' && unit.hp > 0
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function nearestTo(origin: Vec2, units: RealtimeBattleEntity[]): RealtimeBattleEntity | null {
  let nearest: RealtimeBattleEntity | null = null
  let nearestDist = Infinity
  for (const unit of units) {
    const d = distance(origin, unit.position)
    if (d < nearestDist) {
      nearest = unit
      nearestDist = d
    }
  }
  return nearest
}

/**
 * แปลง TargetSelector เป็นรายชื่อหน่วยจริงบนสนาม
 *
 * กฎ fallback-to-self ของ singleAlly/allAllies (§3.8.1): โซโล่ฮีโร่ไม่มีเพื่อนร่วมทีมจริง
 * → เอฟเฟกต์ที่เล็งพวกพ้องตกกลับมาที่ตัวเอง แต่ถ้ามี summon ออกสนามอยู่ (allies ไม่ว่าง)
 * ให้เล็งกลุ่มจริงตามปกติ — fallback อยู่ที่ชั้น targeting นี้จุดเดียว ไม่ต้องซ้ำในทุกคิทฮีโร่
 */
export function resolveTargets(target: TargetSelector, ctx: EffectContext): RealtimeBattleEntity[] {
  const livingAllies = ctx.allies.filter(alive)
  const livingEnemies = ctx.enemies.filter(alive)

  switch (target) {
    case 'self':
      return [ctx.owner]
    case 'singleEnemy':
      return livingEnemies.length > 0 ? [livingEnemies[0]] : []
    case 'nearestEnemy': {
      const nearest = nearestTo(ctx.owner.position, livingEnemies)
      return nearest ? [nearest] : []
    }
    case 'allEnemies':
    case 'aoe':
      // ponytail: schema ยังไม่มีฟิลด์รัศมี — aoe เท่ากับ allEnemies จนกว่าจะมีคีย์ radius จริง
      return livingEnemies
    case 'singleAlly':
      return livingAllies.length > 0 ? [livingAllies[0]] : [ctx.owner]
    case 'allAllies':
      return livingAllies.length > 0 ? livingAllies : [ctx.owner]
    default:
      return []
  }
}

/** heal เป้าหมายที่ resolve ได้ทุกตัว ไม่เกิน maxHp — คืนรายชื่อที่โดน heal จริง */
export function applyHealEffect(
  effect: HealEffectDefinition,
  ctx: EffectContext,
): RealtimeBattleEntity[] {
  const targets = resolveTargets(effect.target, ctx)
  for (const unit of targets) {
    unit.hp = Math.min(unit.maxHp, unit.hp + effect.healAmount)
  }
  return targets
}

/**
 * ผูก buff record ไว้กับเป้าหมาย — ไม่แตะ atk/def/speed ตรง ๆ ที่นี่
 *
 * การนำ magnitude ไปคูณเข้าสูตรจริง (เช่น DamageSystem อ่าน atk ตอนคำนวณ) เป็นงานของ
 * ระบบที่บริโภค activeBuffs ทีหลัง (Hero Kit / Archetype System #12) — ที่นี่แค่บันทึก record
 */
export function applyBuffEffect(
  effect: BuffEffectDefinition,
  ctx: EffectContext,
): RealtimeBattleEntity[] {
  const targets = resolveTargets(effect.target, ctx)
  for (const unit of targets) {
    const buffs = unit.activeBuffs ?? []
    unit.activeBuffs = [
      ...buffs,
      { buffType: effect.buffType, magnitude: effect.magnitude, remainingMs: effect.durationMs },
    ]
  }
  return targets
}

/**
 * ผูก CC record ไว้กับเป้าหมาย — ห้ามแตะ hitStunRemainingMs และห้ามเรียก applyDamage เด็ดขาด
 * (§3.8.6, Done-criterion #4) มอบ mob ปกติก็ติด CC ได้โดยไม่ผ่านระบบ knockdown
 */
export function applyCcEffect(
  effect: CcEffectDefinition,
  ctx: EffectContext,
): RealtimeBattleEntity[] {
  const targets = resolveTargets(effect.target, ctx)
  for (const unit of targets) {
    const ccs = unit.activeCc ?? []
    unit.activeCc = [...ccs, { ccType: effect.ccType, remainingMs: effect.ccDurationMs }]
  }
  return targets
}

/**
 * สร้างหน่วย ally จาก summonId — สเตตมาจาก ENEMY_TEMPLATES เดิม (stageConfig.ts) ตรง ๆ
 *
 * ponytail: ยังไม่มี registry เฉพาะของหน่วยเรียก เพราะ MVP นี้ไม่ต้องการสเตตแยกจากศัตรู
 * ที่มีอยู่แล้ว — ถ้า Hero Kit / Archetype System (#12) ต้องการสเตตหน่วยเรียกที่ต่างจาก
 * ศัตรูจริง ๆ ค่อยแยก registry ตอนนั้น
 *
 * คืน entity เฉย ๆ — ไม่ผูก AI loop ให้ (นั่นไม่ใช่หน้าที่ของระบบนี้ต่อ contract) ผู้เรียก
 * เอา entity นี้ไปเก็บในรายการของตัวเอง แล้วสร้าง brain คู่กันด้วย createEnemyBrain() เพื่อ
 * เดินผ่าน stepEnemyAI ตัวเดียวกับศัตรู (§3.8.3 reuse ไม่ fork)
 */
export function resolveSummonEffect(
  effect: SummonEffectDefinition,
  ctx: EffectContext,
  id: string,
): RealtimeBattleEntity | null {
  const template = getEnemyTemplate(effect.summonId)
  if (!template) {
    reportError('BATTLE_SUMMON_TEMPLATE_MISSING', 'silent', undefined, {
      summonId: effect.summonId,
    })
    return null
  }

  return {
    id,
    entityType: 'ally',
    name: template.name,
    position: { ...ctx.owner.position },
    velocity: { x: 0, y: 0 },
    facing: ctx.owner.facing,
    combatFacing: ctx.owner.combatFacing,
    state: 'idle',
    hp: template.maxHp,
    maxHp: template.maxHp,
    atk: template.atk,
    def: template.def,
    speed: template.speed,
    collisionRadius: template.collisionRadius,
    hurtboxRadius: template.hurtboxRadius,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    enemyId: template.id,
  }
}

/**
 * จุดเข้าเดียวสำหรับ SkillSystem/ผู้เรียก — แยกตาม kind แล้วส่งต่อให้ฟังก์ชันข้างบน
 *
 * heal/buff/cc มีผลข้างเคียง (mutate targets) แล้วจบ ไม่มีค่าคืน — summon อย่างเดียวที่มีค่าคืน
 * เพราะเป็นหน่วยใหม่ที่ผู้เรียกต้องเอาไปเก็บเอง (Effects System ไม่ได้ถือ roster เอง)
 */
export function resolveEffect(
  effect: EffectDefinition,
  ctx: EffectContext,
  summonId?: string,
): RealtimeBattleEntity | null {
  switch (effect.kind) {
    case 'heal':
      applyHealEffect(effect, ctx)
      return null
    case 'buff':
      applyBuffEffect(effect, ctx)
      return null
    case 'cc':
      applyCcEffect(effect, ctx)
      return null
    case 'summon':
      return resolveSummonEffect(
        effect,
        ctx,
        summonId ?? `summon-${ctx.owner.id}-${effect.summonId}`,
      )
    default:
      return null
  }
}
