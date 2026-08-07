import type { StageTimerConfig, TimerMode } from './dungeonSchema'

export interface StageTimerSnapshot {
  mode: TimerMode
  elapsedMs: number
  remainingMs: number | null
  running: boolean
}

/**
 * Authoritative stage timer — UI reads snapshots only.
 * Pauses when `running` is false; resets on `reset()`.
 */
export class StageTimer {
  private mode: TimerMode = 'none'
  private durationMs = 0
  private elapsedMs = 0
  private running = false

  configure(config: StageTimerConfig | undefined): void {
    this.mode = config?.mode ?? 'none'
    this.durationMs = config?.durationMs ?? 0
    this.elapsedMs = 0
    this.running = false
  }

  start(): void {
    this.running = true
  }

  pause(): void {
    this.running = false
  }

  stop(): void {
    this.running = false
  }

  reset(): void {
    this.elapsedMs = 0
    this.running = false
  }

  tick(deltaMs: number): void {
    if (!this.running || this.mode === 'none') return
    this.elapsedMs += deltaMs
  }

  isExpired(): boolean {
    if (this.mode !== 'countdown' || this.durationMs <= 0) return false
    return this.elapsedMs >= this.durationMs
  }

  getSnapshot(): StageTimerSnapshot {
    const remainingMs =
      this.mode === 'countdown' && this.durationMs > 0
        ? Math.max(0, this.durationMs - this.elapsedMs)
        : null
    return {
      mode: this.mode,
      elapsedMs: this.elapsedMs,
      remainingMs,
      running: this.running,
    }
  }
}
