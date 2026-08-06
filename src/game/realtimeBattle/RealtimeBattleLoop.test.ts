import { describe, expect, test, vi } from 'vitest'
import {
  FIXED_STEP_MS,
  startBattleLoop,
  type BattleLoopScheduler,
} from './RealtimeBattleLoop'

/*
  ลูปนี้เป็นตัวคุมเวลาของห้องต่อสู้ทั้งระบบ แต่เดิมไม่มีเทสต์เลยสักตัว

  ทุกอย่างที่ขยับในห้องต่อสู้เดินจาก step() ตัวนี้ ความผิดพลาดตรงนี้จึงไม่โผล่มาเป็น
  ข้อผิดพลาด แต่โผล่เป็น "ตัวละครกระโดดข้ามห้องตอนสลับแท็บกลับมา" หรือ "เกมช้าลงเรื่อย ๆ
  จนค้าง" ซึ่งอ่านจากโค้ดแล้วเดาไม่ออกว่าเกิดจากอะไร

  ป้อน scheduler ปลอมเข้าไปแทนการ stub global — เวลาเดินเมื่อเทสต์สั่งเท่านั้น
*/

/** scheduler ปลอมที่สั่งเฟรมได้เอง คืนตัวคุมไว้เดินเวลา */
function fakeScheduler() {
  const frames = new Map<number, (t: number) => void>()
  const visibilityHandlers = new Set<() => void>()
  let nextId = 1
  let hidden = false

  const scheduler: BattleLoopScheduler = {
    requestFrame: (cb) => {
      const id = nextId++
      frames.set(id, cb)
      return id
    },
    cancelFrame: (id) => {
      frames.delete(id)
    },
    isHidden: () => hidden,
    onVisibilityChange: (handler) => {
      visibilityHandlers.add(handler)
      return () => visibilityHandlers.delete(handler)
    },
  }

  return {
    scheduler,
    /** เดินไปหนึ่งเฟรมที่เวลา nowMs */
    frame(nowMs: number) {
      const pending = [...frames.values()]
      frames.clear()
      for (const cb of pending) cb(nowMs)
    },
    setHidden(next: boolean) {
      hidden = next
      for (const handler of visibilityHandlers) handler()
    },
    get pendingFrames() {
      return frames.size
    },
    get visibilityListeners() {
      return visibilityHandlers.size
    },
  }
}

describe('startBattleLoop', () => {
  test('เฟรมแรกใช้ตั้งเวลาอ้างอิงเท่านั้น ยังไม่ step', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    startBattleLoop({ step, scheduler: clock.scheduler })

    clock.frame(0)
    expect(step).not.toHaveBeenCalled()

    // เวลา 0 ต้องนับเป็นเวลาจริง ไม่ใช่สัญญาณ "ยังไม่ตั้งค่า" — เฟรมถัดไปต้องเดินได้
    clock.frame(100)
    expect(step).toHaveBeenCalled()
  })

  test('เดินก้าวคงที่ตามเวลาที่ผ่านไป ไม่ใช่ตามจำนวนเฟรม', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    startBattleLoop({ step, scheduler: clock.scheduler })

    clock.frame(0)
    clock.frame(100)

    // 100ms / 16.667 = 5 ก้าวเต็ม เศษ 16.6667 เก็บไว้รอบหน้า
    // (ไม่ใช่ 6 — 6 ก้าวคือ 100.00000000000001ms ซึ่งเกิน 100 ไปนิดเดียวด้วยเลขทศนิยม)
    expect(step).toHaveBeenCalledTimes(5)
    // ทุกก้าวได้ delta เท่ากันเสมอ นี่คือหัวใจของ fixed-step
    for (const call of step.mock.calls) expect(call[0]).toBe(FIXED_STEP_MS)
  })

  test('เศษเวลาถูกสะสมข้ามเฟรม ไม่ถูกปัดทิ้ง', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    startBattleLoop({ step, scheduler: clock.scheduler })

    clock.frame(0)
    clock.frame(10) // ยังไม่ถึงหนึ่งก้าว
    expect(step).not.toHaveBeenCalled()

    clock.frame(20) // รวมเป็น 20ms -> ได้หนึ่งก้าว
    expect(step).toHaveBeenCalledTimes(1)
  })

  test('เพดานกันการไล่ย้อนหลังไม่รู้จบเมื่อเฟรมหายไปนาน', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    startBattleLoop({ step, scheduler: clock.scheduler })

    clock.frame(0)
    // หายไป 10 วินาที ถ้าไม่มีเพดานจะได้ ~600 ก้าวในเฟรมเดียว ซึ่งกินเวลานานกว่าหนึ่งเฟรม
    // แล้วทำให้เฟรมถัดไป delta ใหญ่ขึ้นอีก (spiral of death)
    clock.frame(10_000)

    // เพดาน 200ms -> 12 ก้าว
    expect(step).toHaveBeenCalledTimes(12)
  })

  test('แท็บถูกซ่อนแล้วไม่ step และกลับมาแล้วไม่ไล่เก็บเวลาที่หายไป', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    startBattleLoop({ step, scheduler: clock.scheduler })

    clock.frame(0)
    clock.frame(100)
    const beforeHidden = step.mock.calls.length
    expect(beforeHidden).toBeGreaterThan(0)

    clock.setHidden(true)
    clock.frame(200)
    expect(step).toHaveBeenCalledTimes(beforeHidden)

    clock.setHidden(false)
    /*
      เฟรมแรกหลังกลับมาใช้ตั้งเวลาใหม่ ไม่ step แม้ตัวเลขเวลาจะกระโดดไปไกล

      นี่คือข้อพิสูจน์ว่ารีเซ็ตทำงาน: ถ้าไม่รีเซ็ต delta จะเป็น 60 วินาที แล้วโดนเพดานตัด
      เหลือ 200ms = 12 ก้าวรวดในเฟรมเดียว ตัวละครกระโดดข้ามห้องทันที
    */
    clock.frame(60_000)
    expect(step).toHaveBeenCalledTimes(beforeHidden)

    // เฟรมถัดไปเดินตามเวลาที่ผ่านไปจริง (100ms) บวกเศษที่ค้างจากก่อนถูกซ่อน = 6 ก้าว
    // ไม่ใช่ 60 วินาทีที่หายไป
    clock.frame(60_100)
    expect(step).toHaveBeenCalledTimes(beforeHidden + 6)
  })

  test('onFrame ถูกเรียกหนึ่งครั้งต่อเฟรม ไม่ใช่หนึ่งครั้งต่อก้าว', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    const onFrame = vi.fn()
    startBattleLoop({ step, onFrame, scheduler: clock.scheduler })

    clock.frame(0)
    clock.frame(100)

    expect(step).toHaveBeenCalledTimes(5)
    expect(onFrame).toHaveBeenCalledTimes(1)
  })

  test('stop() หยุดจริง ไม่ขอเฟรมต่อ และถอด listener ทิ้ง', () => {
    const clock = fakeScheduler()
    const step = vi.fn()
    const handle = startBattleLoop({ step, scheduler: clock.scheduler })

    expect(clock.visibilityListeners).toBe(1)
    clock.frame(0)
    handle.stop()

    // หยุดแล้วต้องไม่มีเฟรมค้างรออยู่ ไม่งั้นลูปยังวนเงียบ ๆ หลังออกจากห้องต่อสู้
    expect(clock.pendingFrames).toBe(0)
    expect(clock.visibilityListeners).toBe(0)

    clock.frame(100)
    expect(step).not.toHaveBeenCalled()
  })
})
