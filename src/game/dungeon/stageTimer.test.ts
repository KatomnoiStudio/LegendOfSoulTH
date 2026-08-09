import { describe, expect, it } from 'vitest'
import { StageTimer } from './stageTimer'

describe('StageTimer', () => {
  it('countdown expires', () => {
    const timer = new StageTimer()
    timer.configure({ mode: 'countdown', durationMs: 1000 })
    timer.start()
    timer.tick(500)
    expect(timer.isExpired()).toBe(false)
    timer.tick(600)
    expect(timer.isExpired()).toBe(true)
  })

  it('countup does not expire', () => {
    const timer = new StageTimer()
    timer.configure({ mode: 'countup' })
    timer.start()
    timer.tick(5000)
    expect(timer.isExpired()).toBe(false)
    expect(timer.getSnapshot().elapsedMs).toBe(5000)
  })

  it('stops on clear and does not tick further', () => {
    const timer = new StageTimer()
    timer.configure({ mode: 'countup' })
    timer.start()
    timer.tick(100)
    timer.stop()
    timer.tick(100)
    expect(timer.getSnapshot().elapsedMs).toBe(100)
    expect(timer.getSnapshot().running).toBe(false)
  })

  it('resets elapsed', () => {
    const timer = new StageTimer()
    timer.configure({ mode: 'countup' })
    timer.start()
    timer.tick(200)
    timer.reset()
    expect(timer.getSnapshot().elapsedMs).toBe(0)
  })
})
