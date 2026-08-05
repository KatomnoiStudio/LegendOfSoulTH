import type { RealtimeBattleState } from './createRealtimeBattle'
import type {
  BattleEffectEvent,
  DamageEvent,
  RealtimeBattleEntity,
  RealtimeBattleSnapshot,
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

    this.pruneEvents()

    this.publishTimerMs += deltaMs
    if (this.publishTimerMs >= PUBLISH_INTERVAL_MS) {
      this.publishTimerMs = 0
      this.publish()
    }
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
    this.damageEvents = []
    this.effectEvents = []
  }
}
