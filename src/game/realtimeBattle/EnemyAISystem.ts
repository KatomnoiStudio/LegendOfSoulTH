import { ENEMY_ATTACK, totalDurationMs } from './attacks'
import { faceTargetHorizontally } from './combatFacing'
import { GET_UP_IFRAME_MS } from './DamageSystem'
import {
  getBossTemplate,
  getEnemyTemplate,
  type BossAttackRow,
  type RealtimeEnemyTemplate,
} from './stageConfig'
import type { RealtimeBattleEntity, Vec2 } from './types'

/**
 * สมองของศัตรู — ตัดสินใจอย่างเดียว ไม่ขยับตัวเอง
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
 */

export type EnemyAIState =
  | 'idle'
  | 'chase'
  | 'attack'
  | 'recover'
  | 'hit'
  | 'dead'
  // เฉพาะบอส (§3.6.8/§3.6.9) — ศัตรูทั่วไปไม่เข้าสองสถานะนี้
  | 'telegraph'
  | 'phase-transition'
  // Knockdown/GetUp (§3.6.8, §3.8.4) — elite/boss เท่านั้น (isKnockdownEligible ใน DamageSystem.ts)
  | 'knockdown'
  | 'getup'

/**
 * จังหวะของท่าโจมตีศัตรู (มิลลิวินาที) — ยึด ENEMY_ATTACK จาก attacks.ts เป็นแหล่งความจริงจุดเดียว
 *
 * export นี้คงไว้เพื่อความเข้ากันได้กับโค้ด/เทสต์เดิมที่ import ชื่อนี้ แต่ตัวเลขไม่ได้ hard-code
 * ซ้ำที่นี่อีกแล้ว — มาจาก ENEMY_ATTACK โดยตรง
 */
export const ENEMY_ATTACK_TIMING = {
  startupMs: ENEMY_ATTACK.startupMs,
  activeMs: ENEMY_ATTACK.activeMs,
  recoveryMs: ENEMY_ATTACK.recoveryMs,
} as const

const ATTACK_TOTAL_MS = ENEMY_ATTACK.startupMs + ENEMY_ATTACK.activeMs + ENEMY_ATTACK.recoveryMs

/** สถานะเฉพาะของศัตรูที่ไม่ได้อยู่ใน RealtimeBattleEntity (entity เป็นข้อมูลกลางของทุกฝ่าย) */
export interface EnemyBrain {
  state: EnemyAIState
  /**
   * เวลาที่อยู่ในสถานะปัจจุบันมาแล้ว
   *
   * ระบบดาเมจในงานถัดไปใช้ค่านี้คู่กับ ENEMY_ATTACK_TIMING เพื่อรู้ว่าอยู่ใน active frame
   * หรือยัง — ไม่ต้องเก็บ timestamp แยกอีกตัว
   */
  stateElapsedMs: number
  /**
   * ผู้เล่นที่โดนท่านี้ไปแล้ว — กัน hitbox เดียวกันโดนซ้ำในท่าเดียว (§15)
   *
   * ล้างเมื่อออกจากสถานะ attack ไม่ใช่ตอนเข้า เพราะ active frame กินหลายเฟรมจำลอง
   */
  hitTargets: Set<string>

  // ── ฟิลด์เฉพาะบอส (#11) — enemy ทั่วไปไม่แตะฟิลด์พวกนี้เลย ────────────
  /** ดัชนีเฟสปัจจุบัน (0 = เฟส 1, 1 = เฟส 2) — เปลี่ยนได้ครั้งเดียวต่อบอสหนึ่งตัว (Done-criterion 5) */
  bossPhaseIndex: number
  /** ข้าม HP threshold แล้วแต่ยังสลับเฟสไม่ได้ (ท่า/เทเลกราฟปัจจุบันยังไม่จบ, Done-criterion 1) */
  bossPendingPhaseTransition: boolean
  /** ดัชนีท่าถัดไปในพูลของเฟสปัจจุบัน (round-robin) */
  bossAttackIndex: number
  /** ท่าที่ล็อกไว้ตั้งแต่เข้า Telegraph — ใช้ยิงจริงตอน AttackActive กันสลับท่าหลังเทเลกราฟ (scar #2) */
  bossAttackRow: BossAttackRow | null
}

export function createEnemyBrain(): EnemyBrain {
  return {
    state: 'idle',
    stateElapsedMs: 0,
    hitTargets: new Set(),
    bossPhaseIndex: 0,
    bossPendingPhaseTransition: false,
    bossAttackIndex: 0,
    bossAttackRow: null,
  }
}

export interface EnemyDecision {
  /** ทิศที่อยากเดินไป — ศูนย์คือหยุดอยู่กับที่ */
  move: Vec2
  /**
   * ส่งเมื่อบอสเพิ่งเข้าสถานะ Telegraph ในติ๊กนี้ — ให้ผู้เรียกยิง BattleEffectEvent
   * ('ground-marker') ก่อน AttackActive จะเริ่ม (§3.6.8 telegraph feedback layer, Done-criterion 4)
   */
  telegraph?: { position: Vec2; durationMs: number }
}

/** สถานะที่ถือว่า "กำลังทำท่าค้างอยู่" — HP ข้ามเกณฑ์ระหว่างนี้ต้องรอจนจบก่อน (Done-criterion 1) */
const BOSS_COMMITTED_STATES: readonly EnemyAIState[] = ['telegraph', 'attack', 'recover']

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function toState(brain: EnemyBrain, next: EnemyAIState): void {
  if (brain.state === next) return
  brain.state = next
  brain.stateElapsedMs = 0
}

/**
 * เดินสมองของศัตรูหนึ่งตัวไปหนึ่ง tick
 *
 * แก้ `brain` และ `enemy.state` โดยตรง (mutable ตามสถาปัตยกรรมของ runtime)
 * แล้วคืนทิศที่อยากเดิน ให้ผู้เรียกเอาไปป้อน stepMovement
 */
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

  // ตายแล้วหยุดทุกอย่าง ไม่คิด ไม่เดิน ไม่โจมตี (§19)
  if (enemy.hp <= 0 || enemy.state === 'dead') {
    toState(brain, 'dead')
    enemy.state = 'dead'
    return { move: { x: 0, y: 0 } }
  }

  /*
   * ล้มจาก Knockdown (DamageSystem.applyDamage ตั้ง enemy.state='knockdown' +
   * hitStunRemainingMs ให้ตอนโดนตีจากท่า attack.knockdown ที่เป้าหมาย eligible, §3.8.4)
   * ค้างอยู่กับที่จนกว่า hitStunRemainingMs หมด แล้วเข้าช่วงลุกสั้น ๆ (GetUp, i-frame 200ms
   * ตาม §3.6.12) ก่อนกลับไปไล่ต่อ — จบเป็น block แยกจาก bossTemplate/phase-transition โดย
   * สิ้นเชิง (Done-criterion #2/#4: ไม่มี PhaseTransition/invulnerable flag ใดเกี่ยวข้องกับ
   * mini-boss เลย — เหมือน state 'hit' เดิมที่ return ก่อนถึง bossTemplate block เช่นกัน)
   */
  if (enemy.state === 'knockdown' || brain.state === 'knockdown' || brain.state === 'getup') {
    if (brain.state !== 'getup') {
      toState(brain, 'knockdown')
      enemy.state = 'knockdown'
      if (enemy.hitStunRemainingMs <= 0) {
        toState(brain, 'getup')
        enemy.state = 'getup'
      }
      return { move: { x: 0, y: 0 } }
    }

    enemy.state = 'getup'
    if (brain.stateElapsedMs >= GET_UP_IFRAME_MS) {
      const ranges = resolveRanges(enemy.enemyId ? getEnemyTemplate(enemy.enemyId) : null)
      const distance = distanceBetween(enemy.position, player.position)
      const playerAlive = player.hp > 0
      toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      enemy.state = 'idle'
    }
    return { move: { x: 0, y: 0 } }
  }

  // โดนตีจนเซ = ขยับไม่ได้ และท่าโจมตีที่ค้างอยู่ถูกยกเลิก
  if (enemy.hitStunRemainingMs > 0) {
    toState(brain, 'hit')
    enemy.state = 'hit'
    return { move: { x: 0, y: 0 } }
  }

  const bossTemplate =
    enemy.entityType === 'boss' && enemy.enemyId ? getBossTemplate(enemy.enemyId) : null
  const template = (enemy.enemyId ? getEnemyTemplate(enemy.enemyId) : null) ?? bossTemplate
  const ranges = resolveRanges(template)
  const distance = distanceBetween(enemy.position, player.position)
  const playerAlive = player.hp > 0

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
      brain.bossAttackRow = null
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
      enemy.state = 'skill'
      const telegraphMs = brain.bossAttackRow?.telegraphMs ?? 0
      if (brain.stateElapsedMs >= telegraphMs) {
        toState(brain, 'attack')
        enemy.state = 'attack'
      }
      return { move: { x: 0, y: 0 } }
    }

    case 'attack': {
      // อยู่ในท่าโจมตี: หยุดเดินจนกว่าจะจบท่า (§19 หยุดเดินขณะโจมตี)
      enemy.state = 'attack'
      const attackTotalMs = brain.bossAttackRow
        ? totalDurationMs(brain.bossAttackRow)
        : ATTACK_TOTAL_MS
      if (brain.stateElapsedMs >= attackTotalMs) toState(brain, 'recover')
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
      // พ้นอาการเซแล้วกลับไปไล่ต่อทันที
      toState(brain, playerAlive && distance <= ranges.detect ? 'chase' : 'idle')
      enemy.state = 'idle'
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
            enemy.state = 'attack'
            return { move: { x: 0, y: 0 } }
          }
          const row = pool[brain.bossAttackIndex % pool.length]
          brain.bossAttackIndex += 1
          brain.bossAttackRow = row
          toState(brain, 'telegraph')
          enemy.state = 'skill'
          return {
            move: { x: 0, y: 0 },
            telegraph: { position: { ...enemy.position }, durationMs: row.telegraphMs },
          }
        }

        toState(brain, 'attack')
        enemy.state = 'attack'
        return { move: { x: 0, y: 0 } }
      }

      // เข้าใกล้พอแล้วแต่ยังคูลดาวน์อยู่ = ยืนรอ ไม่เบียดทับผู้เล่น
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

/** เวลาพักหลังจบท่าโจมตี ก่อนกลับไปไล่ใหม่ */
const RECOVER_MS = 260

/** ค่าเริ่มต้นเมื่อไม่พบแม่แบบศัตรู — ยังเล่นต่อได้แทนที่จะพังทั้งห้อง */
const FALLBACK_RANGES = { detect: 500, attack: 80, attackCooldownMs: 1500 }

/** พิกัดระยะที่ทั้ง RealtimeEnemyTemplate และ BossTemplate มีเหมือนกัน — resolveRanges ใช้ได้กับทั้งคู่ */
type RangeTemplate = Pick<RealtimeEnemyTemplate, 'detectRange' | 'attackRange' | 'attackCooldownMs'>

function resolveRanges(template: RangeTemplate | null) {
  if (!template) return FALLBACK_RANGES
  return {
    detect: template.detectRange,
    attack: template.attackRange,
    attackCooldownMs: template.attackCooldownMs,
  }
}

function directionTowards(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: 0, y: 0 }
  return { x: dx / length, y: dy / length }
}
