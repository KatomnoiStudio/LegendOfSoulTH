import type { RealtimeBattleState } from './createRealtimeBattle'
import { createEnemyBrain, stepEnemyAI, type EnemyBrain } from './EnemyAISystem'
import { resolveCircleOverlap, stepMovement } from './MovementSystem'
import type {
  BattleEffectEvent,
  DamageEvent,
  RealtimeBattleEntity,
  RealtimeBattleSnapshot,
  Vec2,
} from './types'

/**
 * หัวใจของห้องต่อสู้ real-time — ถือสถานะทั้งหมดไว้ "นอก React state"
 *
 * ทำไมต้องนอก React: สเปกข้อ 8 ห้ามอัปเดตตำแหน่งตัวละครผ่าน setState ทุกเฟรม
 * (60 ครั้งต่อวินาที × ทุกหน่วย = re-render ถล่มทลาย) React จึงได้เห็นเฉพาะ snapshot
 * ที่ publish เป็นช่วง ๆ สำหรับ HUD ส่วนตำแหน่งที่ต้องลื่นทุกเฟรม ให้ชั้นวาดอ่าน
 * entity ตรงจาก runtime ผ่าน ref แทน (ดู BattleArena.tsx)
 *
 * ตัวคลาสนี้ไม่รู้จัก React, ไม่รู้จัก DOM และไม่เรียก requestAnimationFrame เอง —
 * ตัวขับเวลาอยู่ที่ RealtimeBattleLoop.ts ทำให้เทสต์เรียก step() ตรง ๆ ได้แบบ deterministic
 */

/** ระยะเวลาฉากเปิดก่อนเริ่มควบคุมได้จริง */
const INTRO_MS = 700

/** ความถี่ในการ publish snapshot ให้ React (HUD ไม่ต้องการ 60 Hz) */
const PUBLISH_INTERVAL_MS = 100

/** อายุของ event ที่ค้างไว้ให้ชั้นวาดหยิบไปใช้ก่อนถูกทิ้ง */
const EVENT_TTL_MS = 900

type Listener = () => void

export class RealtimeBattleRuntime {
  private state: RealtimeBattleState
  private listeners = new Set<Listener>()
  private damageEvents: DamageEvent[] = []
  private effectEvents: BattleEffectEvent[] = []
  private publishTimerMs = 0
  private snapshot: RealtimeBattleSnapshot
  private disposed = false
  /** เวกเตอร์เดินล่าสุดจากผู้เล่น — ป้อนเข้ามาจากชั้น React ทุกเฟรม */
  private moveInput: Vec2 = { x: 0, y: 0 }
  /**
   * สมองของศัตรูแยกตาม id
   *
   * ไม่เก็บไว้ใน entity เพราะ entity เป็นข้อมูลกลางที่ทั้งผู้เล่นและศัตรูใช้ร่วมกัน
   * และมันถูกคัดลอกลง snapshot ทุกครั้งที่ publish — สถานะ AI ไม่ควรไหลไปถึง React
   */
  private brains = new Map<string, EnemyBrain>()

  constructor(state: RealtimeBattleState) {
    this.state = state
    this.snapshot = this.buildSnapshot()
  }

  /** เดินเวลาจำลองไปข้างหน้าหนึ่งก้าวคงที่ — เรียกจาก RealtimeBattleLoop หรือจากเทสต์ */
  step(deltaMs: number): void {
    if (this.disposed) return
    const state = this.state
    if (state.status === 'exiting') return

    state.elapsedMs += deltaMs

    if (state.status === 'intro') {
      if (state.elapsedMs >= INTRO_MS) {
        state.status = 'running'
        this.publish()
      }
      return
    }

    if (state.status !== 'running') return

    this.tickTimers(state.player, deltaMs)
    for (const enemy of state.enemies) this.tickTimers(enemy, deltaMs)

    const moved = stepMovement(state.player, this.moveInput, deltaMs, {
      stage: state.stage,
      blockers: state.enemies,
    })
    // สถานะเดิน/ยืน คุมจากผลของระบบเดินจุดเดียว ไม่ให้ component เดาเอง
    if (state.player.state === 'idle' && moved) state.player.state = 'walk'
    else if (state.player.state === 'walk' && !moved) state.player.state = 'idle'

    this.stepEnemies(deltaMs)
    this.separateEnemies()

    this.pruneEvents()

    this.publishTimerMs += deltaMs
    if (this.publishTimerMs >= PUBLISH_INTERVAL_MS) {
      this.publishTimerMs = 0
      this.publish()
    }
  }

  /**
   * เดินสมองศัตรูทุกตัว แล้วส่งทิศที่มันอยากไปให้ระบบเดินตัวเดียวกับผู้เล่น
   *
   * ศัตรูกันทางกันเองและกันผู้เล่นด้วย จึงใส่ทั้งกองเป็น blockers ยกเว้นตัวที่กำลังเดินอยู่
   * (stepMovement ข้ามตัวเองให้อยู่แล้วจาก id)
   */
  private stepEnemies(deltaMs: number): void {
    const state = this.state

    for (const enemy of state.enemies) {
      const brain = this.brainFor(enemy.id)
      const decision = stepEnemyAI(enemy, brain, state.player, deltaMs)

      if (decision.move.x === 0 && decision.move.y === 0) {
        enemy.velocity = { x: 0, y: 0 }
        continue
      }

      stepMovement(enemy, decision.move, deltaMs, {
        stage: state.stage,
        blockers: [state.player, ...state.enemies],
      })
    }
  }

  /**
   * ดันศัตรูที่ซ้อนกันให้แยกออก
   *
   * ทำแยกจากตอนเดิน เพราะศัตรูหลายตัวมุ่งหน้าจุดเดียวกัน (ตัวผู้เล่น) ทำให้ทุกตัวไปกอง
   * ทับกันเป็นตัวเดียวได้ ทั้งที่แต่ละตัวเดินถูกกฎ — สเปกข้อ 19 ห้ามอาการนี้ตรง ๆ
   */
  private separateEnemies(): void {
    const state = this.state
    const alive = state.enemies.filter((enemy) => enemy.state !== 'dead')

    for (let i = 0; i < alive.length; i += 1) {
      for (let j = i + 1; j < alive.length; j += 1) {
        const a = alive[i]
        const b = alive[j]
        // ดันเฉพาะตัวหลังออกจากตัวหน้า ทำให้ผลลัพธ์ไม่ขึ้นกับลำดับที่วนเจอ
        b.position = resolveCircleOverlap(b.position, b.collisionRadius, a.position, a.collisionRadius)
      }
    }
  }

  private brainFor(enemyId: string): EnemyBrain {
    let brain = this.brains.get(enemyId)
    if (!brain) {
      brain = createEnemyBrain()
      this.brains.set(enemyId, brain)
    }
    return brain
  }

  /** นับถอยหลังคูลดาวน์และสถานะที่อิงเวลาของหน่วยหนึ่งตัว */
  private tickTimers(entity: RealtimeBattleEntity, deltaMs: number): void {
    if (entity.state === 'dead') return
    entity.attackCooldownRemainingMs = Math.max(0, entity.attackCooldownRemainingMs - deltaMs)
    entity.skillCooldownRemainingMs = Math.max(0, entity.skillCooldownRemainingMs - deltaMs)
    entity.dashCooldownRemainingMs = Math.max(0, entity.dashCooldownRemainingMs - deltaMs)
    entity.hitStunRemainingMs = Math.max(0, entity.hitStunRemainingMs - deltaMs)
  }

  private pruneEvents(): void {
    const cutoff = this.state.elapsedMs - EVENT_TTL_MS
    if (this.damageEvents.length > 0 && this.damageEvents[0].createdAtMs < cutoff) {
      this.damageEvents = this.damageEvents.filter((event) => event.createdAtMs >= cutoff)
    }
    if (this.effectEvents.length > 0 && this.effectEvents[0].createdAtMs < cutoff) {
      this.effectEvents = this.effectEvents.filter((event) => event.createdAtMs >= cutoff)
    }
  }

  /**
   * ป้อนเวกเตอร์เดินของผู้เล่น
   *
   * แยกจาก InputSystem โดยตั้งใจ: runtime ไม่ควรรู้ว่าอินพุตมาจากคีย์บอร์ด จอยสติก
   * หรือเทสต์ที่ป้อนค่าตรง ๆ — มันรู้แค่ "ตอนนี้ผู้เล่นอยากเดินไปทางไหน"
   */
  setMoveInput(vector: Vec2): void {
    this.moveInput = vector
  }

  /** ขอออกจากห้องต่อสู้ — หยุดจำลองทันที ไม่ให้ระบบใดเดินต่อ */
  requestExit(): void {
    if (this.state.status === 'exiting') return
    this.state.status = 'exiting'
    this.publish()
  }

  /** อ่านสถานะภายในตรง ๆ สำหรับชั้นวาดที่ต้องอัปเดตทุกเฟรมผ่าน ref (ห้ามแก้ค่า) */
  getState(): Readonly<RealtimeBattleState> {
    return this.state
  }

  getSnapshot = (): RealtimeBattleSnapshot => this.snapshot

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** สร้าง snapshot ใหม่แล้วแจ้ง React — เรียกเมื่อมีอะไรที่ HUD ต้องเห็นเปลี่ยนไป */
  publish(): void {
    if (this.disposed) return
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }

  private buildSnapshot(): RealtimeBattleSnapshot {
    const state = this.state
    return {
      stageId: state.stage.id,
      stageName: state.stage.name,
      status: state.status,
      elapsedMs: state.elapsedMs,
      player: { ...state.player, position: { ...state.player.position }, velocity: { ...state.player.velocity } },
      enemies: state.enemies.map((enemy) => ({
        ...enemy,
        position: { ...enemy.position },
        velocity: { ...enemy.velocity },
      })),
      currentWave: state.currentWaveIndex + 1,
      totalWaves: state.stage.waves.length,
      damageEvents: this.damageEvents,
      effectEvents: this.effectEvents,
    }
  }

  dispose(): void {
    this.disposed = true
    this.listeners.clear()
    this.brains.clear()
    this.damageEvents = []
    this.effectEvents = []
  }
}
