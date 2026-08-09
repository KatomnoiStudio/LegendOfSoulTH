import type { AttackDefinition } from './attacks'
import { getEnemyAttackById } from './attacks'
import {
  attackTotalDurationMs,
  isExecuteActiveWindow,
  resolveTelegraphMs,
} from './combatMoveSchema'
import { faceTargetHorizontally } from './combatFacing'
import { getBossTemplate, getEnemyTemplate, type RealtimeEnemyTemplate } from './stageConfig'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * สมองของศัตรู — P4 production loop:
 *   Observe → Evaluate → Select → Telegraph → Execute → Recover → Re-evaluate
 *
 * เหตุผลที่แยกแบบนี้: ระบบเดินมีอยู่แล้วและถูกเทสต์ไว้แล้ว (MovementSystem) การให้ AI
 * ไปเขียนโค้ดขยับตำแหน่งเองจะกลายเป็นระบบเดินชุดที่สองที่กฎไม่ตรงกัน (ขอบห้อง การชนกัน)
 * AI จึงมีหน้าที่แค่ "อยากไปทางไหน" แล้วคืนเวกเตอร์ให้ผู้เรียกส่งต่อ stepMovement
 *
 * วงจรตามสเปกข้อ 19:
 *   Spawn → Idle → Detect Player → Chase → Attack → Recover → Chase → Dead
 *
 * บอส (entityType === 'boss') ต่อยอดวงจรเดียวกันนี้ ไม่แยกเป็นสมองอีกชุด (#11 Boss System,
 * Low-maintenance-cost design: "boss-gated branches ในลูปเดียวกัน ไม่ใช่ BossAI class ใหม่"):
 *   ... → Chase → Telegraph → Attack → Recover → Chase → ...
 *   HP ข้ามเกณฑ์ (§3.6.9) → (รอจนจบท่า/เทเลกราฟปัจจุบันก่อน) → PhaseTransition (คงกระพัน) → Chase (เฟส 2)
 *
 * AI คืนเวกเตอร์เดินให้ MovementSystem เท่านั้น — ไม่อ่าน render coordinates
 */

export type EnemyAIState =
  | 'idle'
  | 'chase'
  | 'telegraph'
  | 'attack'
  | 'recover'
  | 'hit'
  | 'knockdown'
  | 'getUp'
  | 'dead'
  // เฉพาะบอส (§3.6.8/§3.6.9) — ศัตรูทั่วไปไม่เข้าสถานะนี้
  | 'phase-transition'

export interface EnemyBrain {
  state: EnemyAIState
  stateElapsedMs: number
  hitTargets: Set<string>

  // ── ฟิลด์เฉพาะบอส (#11) — enemy ทั่วไปไม่แตะฟิลด์พวกนี้เลย ────────────
  /** ดัชนีเฟสปัจจุบัน (0 = เฟส 1, 1 = เฟส 2) — เปลี่ยนได้ครั้งเดียวต่อบอสหนึ่งตัว (Done-criterion 5) */
  bossPhaseIndex: number
  /** ข้าม HP threshold แล้วแต่ยังสลับเฟสไม่ได้ (ท่า/เทเลกราฟปัจจุบันยังไม่จบ, Done-criterion 1) */
  bossPendingPhaseTransition: boolean
  /** ดัชนีท่าถัดไปในพูลของเฟสปัจจุบัน (round-robin) */
  bossAttackIndex: number
  /** ท่าที่เลือกไว้ตั้งแต่เข้า Telegraph — ใช้ยิงจริงตอน AttackActive กันสลับท่าหลังเทเลกราฟ (scar #2) */
  selectedAttack: AttackDefinition | null
}

export function createEnemyBrain(): EnemyBrain {
  return {
    state: 'idle',
    stateElapsedMs: 0,
    hitTargets: new Set(),
    bossPhaseIndex: 0,
    bossPendingPhaseTransition: false,
    bossAttackIndex: 0,
    selectedAttack: null,
  }
}

export interface EnemyDecision {
  move: Vec2
  /**
   * ส่งเมื่อบอสเพิ่งเข้าสถานะ Telegraph ในติ๊กนี้ — ให้ผู้เรียกยิง BattleEffectEvent
   * ('ground-marker') ก่อน AttackActive จะเริ่ม (§3.6.8 telegraph feedback layer, Done-criterion 4)
   */
  telegraph?: { position: Vec2; durationMs: number }
}

/** สถานะที่ถือว่า "กำลังทำท่าค้างอยู่" — HP ข้ามเกณฑ์ระหว่างนี้ต้องรอจนจบก่อน (Done-criterion 1) */
const BOSS_COMMITTED_STATES: readonly EnemyAIState[] = ['telegraph', 'attack', 'recover']

/** เวลาพักหลังจบท่าโจมตี ก่อนกลับไปไล่ใหม่ */
const RECOVER_MS = 260

/** ค่าเริ่มต้นเมื่อไม่พบแม่แบบศัตรู — ยังเล่นต่อได้แทนที่จะพังทั้งห้อง */
const FALLBACK_RANGES = { detect: 500, attack: 80, attackCooldownMs: 1500 }

/** พิกัดระยะที่ทั้ง RealtimeEnemyTemplate และ BossTemplate มีเหมือนกัน — resolveRanges ใช้ได้กับทั้งคู่ */
type RangeTemplate = Pick<RealtimeEnemyTemplate, 'detectRange' | 'attackRange' | 'attackCooldownMs'>

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function toState(brain: EnemyBrain, next: EnemyAIState): void {
  if (brain.state === next) return
  brain.state = next
  brain.stateElapsedMs = 0
}

function resolveRanges(template: RangeTemplate | null) {
  if (!template) return FALLBACK_RANGES
  return {
    detect: template.detectRange,
    attack: template.attackRange,
    attackCooldownMs: template.attackCooldownMs,
  }
}

function resolveAttack(template: RealtimeEnemyTemplate | null): AttackDefinition {
  if (!template) return getEnemyAttackById('enemy-melee')
  return getEnemyAttackById(template.attackId)
}

function executeDurationMs(attack: AttackDefinition): number {
  return attack.startupMs + attack.activeMs + attack.recoveryMs
}

function directionTowards(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: 0, y: 0 }
  return { x: dx / length, y: dy / length }
}

export function stepEnemyAI(
  enemy: RealtimeBattleEntity,
  brain: EnemyBrain,
  player: RealtimeBattleEntity,
  deltaMs: number,
  /** เวลาสะสมของ runtime ปัจจุบัน (state.elapsedMs) — บอสใช้ตั้ง invulnerableUntilMs แบบ absolute
   *  timestamp เดียวกับที่ DamageSystem/SkillSystem ทำอยู่แล้ว ศัตรูทั่วไปไม่ใช้ค่านี้เลย จึง
   *  default เป็น 0 ได้โดยไม่กระทบพฤติกรรมเดิม (ไม่ต้องแก้ call site เดิมทุกจุด) */
  elapsedMs = 0,
): EnemyDecision {
  brain.stateElapsedMs += deltaMs

  if (enemy.hp <= 0 || enemy.state === 'dead') {
    toState(brain, 'dead')
    enemy.state = 'dead'
    return { move: { x: 0, y: 0 } }
  }

  // ล้มจาก Knockdown / กำลังลุก — combatReaction.ts's tickKnockdownState (เรียกจาก
  // RealtimeBattleRuntime.tickTimers ก่อน stepEnemyAI ทุกติ๊ก) เป็นเจ้าของ timing จริงแล้ว
  // AI แค่หยุดขยับตาม enemy.state ที่มันตั้งไว้ ไม่ต้องมีตัวจับเวลาซ้ำในนี้
  if (enemy.state === 'knockdown' || enemy.state === 'getUp') {
    toState(brain, enemy.state === 'knockdown' ? 'knockdown' : 'getUp')
    return { move: { x: 0, y: 0 } }
  }

  // โดนตีจนเซ = ขยับไม่ได้ และท่าโจมตีที่ค้างอยู่ถูกยกเลิก
  if (enemy.hitStunRemainingMs > 0) {
    toState(brain, 'hit')
    brain.selectedAttack = null
    enemy.state = 'hit'
    return { move: { x: 0, y: 0 } }
  }

  const bossTemplate =
    enemy.entityType === 'boss' && enemy.enemyId ? getBossTemplate(enemy.enemyId) : null
  const enemyTemplate = enemy.enemyId ? getEnemyTemplate(enemy.enemyId) : null
  const template = enemyTemplate ?? bossTemplate
  const ranges = resolveRanges(template)
  const distance = distanceBetween(enemy.position, player.position)
  const playerAlive = player.hp > 0
  const attack = brain.selectedAttack ?? resolveAttack(enemyTemplate)

  if (bossTemplate) {
    // ข้าม HP threshold ครั้งแรก (เฟส 1 เท่านั้น — Done-criterion 5: เปลี่ยนได้ครั้งเดียวต่อบอส)
    if (
      brain.bossPhaseIndex === 0 &&
      enemy.hp <= bossTemplate.maxHp * bossTemplate.phaseHpThreshold
    ) {
      brain.bossPendingPhaseTransition = true
    }

    // ตัดเข้า PhaseTransition ได้เฉพาะจุดที่ไม่ได้ทำท่าค้างอยู่ (Done-criterion 1) —
    // ปล่อยให้ switch ด้านล่างเดินท่า/พักท่าที่ค้างอยู่ให้จบตามปกติก่อนเสมอ
    if (brain.bossPendingPhaseTransition && !BOSS_COMMITTED_STATES.includes(brain.state)) {
      brain.bossPendingPhaseTransition = false
      brain.bossPhaseIndex = 1
      brain.bossAttackIndex = 0
      brain.selectedAttack = null
      toState(brain, 'phase-transition')
      // ยืม EntityState 'skill' แสดงแอนิเมชันพิเศษไปก่อน — ponytail: ยังไม่มี EntityState
      // เฉพาะของ phase-transition เพราะยังไม่มีชั้นเรนเดอร์ที่ต้องแยกมันจากท่าสกิล อัปเกรดตอน
      // render layer ต้องการแยกจริง
      enemy.state = 'skill'
      // Done-criterion 2: คุ้มกันให้ยาวเกินระยะเปลี่ยนเฟสทั้งหมด — HitboxSystem.ts เช็คค่านี้อยู่แล้ว
      // ไม่ต้องเพิ่ม invulnerability path ใหม่
      enemy.invulnerableUntilMs = elapsedMs + bossTemplate.phaseTransitionMs
      return { move: { x: 0, y: 0 } }
    }

    if (brain.state === 'phase-transition') {
      enemy.state = 'skill'
      if (brain.stateElapsedMs >= bossTemplate.phaseTransitionMs) {
        toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
        enemy.state = 'idle'
      }
      return { move: { x: 0, y: 0 } }
    }
  }

  switch (brain.state) {
    case 'telegraph': {
      // เงื้อท่า (§3.6.8) — หยุดเดิน ยังไม่มี hitbox จนกว่าจะครบ telegraphMs ของท่าที่ล็อกไว้
      // บอสยืม EntityState 'skill' แสดงวินด์อัพให้เห็นชัด mob ทั่วไปใช้ 'attack' ตามเดิม
      enemy.state = bossTemplate ? 'skill' : 'attack'
      if (brain.stateElapsedMs >= resolveTelegraphMs(attack)) {
        toState(brain, 'attack')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'attack': {
      // อยู่ในท่าโจมตี: หยุดเดินจนกว่าจะจบท่า (§19 หยุดเดินขณะโจมตี)
      enemy.state = bossTemplate ? 'skill' : 'attack'
      if (brain.stateElapsedMs >= executeDurationMs(attack)) {
        brain.hitTargets.clear()
        brain.selectedAttack = null
        toState(brain, 'recover')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'recover': {
      enemy.state = 'idle'
      if (brain.stateElapsedMs >= RECOVER_MS) {
        toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'hit': {
      toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      enemy.state = 'idle'
      return { move: { x: 0, y: 0 } }
    }

    case 'knockdown':
    case 'getUp': {
      // ถึงจุดนี้ enemy.state ไม่ใช่ knockdown/getUp แล้ว (การ์ดบรรทัดบนจับไว้ก่อนแล้วตอนยังค้างอยู่)
      // — tickKnockdownState เพิ่งเปลี่ยนเป็น idle เมื่อกี้ ต้องให้ brain ตัดสิน chase/idle ทันที
      // ไม่งั้น brain.state จะค้างที่ knockdown/getUp ตลอดไป ไม่มีทางออกจาก case นี้เลย
      toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      return { move: { x: 0, y: 0 } }
    }

    case 'chase': {
      if (!playerAlive || distance > ranges.detect) {
        toState(brain, 'idle')
        enemy.state = 'idle'
        return { move: { x: 0, y: 0 } }
      }

      if (distance <= ranges.attack && enemy.attackCooldownRemainingMs <= 0) {
        faceTargetHorizontally(enemy, player.position)
        enemy.attackCooldownRemainingMs = ranges.attackCooldownMs

        if (bossTemplate) {
          const pool = bossTemplate.phases[brain.bossPhaseIndex].attacks
          if (pool.length === 0) {
            // พูลว่าง (ข้อมูลยังไม่ครบ) — ยังเล่นต่อได้แทนที่จะพังทั้งห้อง เหมือน FALLBACK_RANGES
            toState(brain, 'attack')
            enemy.state = 'skill'
            return { move: { x: 0, y: 0 } }
          }
          const row = pool[brain.bossAttackIndex % pool.length]
          brain.bossAttackIndex += 1
          brain.selectedAttack = row
          brain.hitTargets.clear()
          toState(brain, 'telegraph')
          enemy.state = 'skill'
          return {
            move: { x: 0, y: 0 },
            telegraph: { position: { ...enemy.position }, durationMs: row.telegraphMs },
          }
        }

        brain.selectedAttack = resolveAttack(enemyTemplate)
        brain.hitTargets.clear()
        toState(brain, 'telegraph')
        enemy.state = 'attack'
        return { move: { x: 0, y: 0 } }
      }

      if (distance <= ranges.attack) {
        enemy.state = 'idle'
        return { move: { x: 0, y: 0 } }
      }

      enemy.state = 'walk'
      return { move: directionTowards(enemy.position, player.position) }
    }

    case 'idle':
    case 'dead':
    default: {
      enemy.state = 'idle'
      if (playerAlive && distance <= ranges.detect) toState(brain, 'chase')
      return { move: { x: 0, y: 0 } }
    }
  }
}

/** True when enemy attack is in damage-active execute phase. */
export function isEnemyAttackDamageWindow(brain: EnemyBrain): boolean {
  if (brain.state !== 'attack' || !brain.selectedAttack) return false
  return isExecuteActiveWindow(brain.selectedAttack, brain.stateElapsedMs)
}

export function isEnemyTelegraphing(brain: EnemyBrain): boolean {
  return brain.state === 'telegraph'
}

export function getEnemySelectedAttack(brain: EnemyBrain): AttackDefinition | null {
  return brain.selectedAttack
}

/**
 * @deprecated — use attack definition from brain
 *
 * ค่าอ่านจาก `enemy-melee` (attacks.ts) ตรง ๆ ไม่ hardcode ซ้ำ — done-criterion #5
 * ของ Per-Move-Property-Schema ห้าม move-data literal อยู่นอก attacks.ts
 */
export const ENEMY_ATTACK_TIMING = {
  startupMs: getEnemyAttackById('enemy-melee').startupMs,
  activeMs: getEnemyAttackById('enemy-melee').activeMs,
  recoveryMs: getEnemyAttackById('enemy-melee').recoveryMs,
} as const

export function enemyAttackTotalMs(attack: AttackDefinition): number {
  return attackTotalDurationMs(attack)
}
