import { afterEach, describe, expect, it } from 'vitest'
import { InputSystem } from './InputSystem'

/** ยิงเหตุการณ์คีย์บอร์ดเข้า window แบบเดียวกับที่เบราว์เซอร์ทำ */
function key(type: 'keydown' | 'keyup', code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }))
}

let detach: (() => void) | null = null

afterEach(() => {
  detach?.()
  detach = null
})

describe('InputSystem', () => {
  it('อ่านทั้ง WASD และปุ่มลูกศร', () => {
    const input = new InputSystem()
    detach = input.attachKeyboard()

    key('keydown', 'KeyD')
    expect(input.getMoveVector()).toEqual({ x: 1, y: 0 })

    key('keyup', 'KeyD')
    key('keydown', 'ArrowUp')
    expect(input.getMoveVector()).toEqual({ x: 0, y: -1 })
  })

  it('กดสองปุ่มพร้อมกันได้ทิศเฉียง', () => {
    const input = new InputSystem()
    detach = input.attachKeyboard()

    key('keydown', 'KeyW')
    key('keydown', 'KeyD')
    expect(input.getMoveVector()).toEqual({ x: 1, y: -1 })
  })

  it('ปุ่มตรงข้ามกันหักล้างกันเป็นศูนย์', () => {
    const input = new InputSystem()
    detach = input.attachKeyboard()

    key('keydown', 'KeyA')
    key('keydown', 'KeyD')
    expect(input.getMoveVector()).toEqual({ x: 0, y: 0 })
  })

  it('จอยสติกชนะคีย์บอร์ดเมื่อถูกดันจริง', () => {
    const input = new InputSystem()
    detach = input.attachKeyboard()

    key('keydown', 'KeyD')
    input.setJoystick({ x: 0, y: -0.6 })
    expect(input.getMoveVector()).toEqual({ x: 0, y: -0.6 })

    // ปล่อยจอยแล้วคีย์บอร์ดที่ยังกดค้างอยู่ต้องกลับมาทำงานทันที
    input.setJoystick({ x: 0, y: 0 })
    expect(input.getMoveVector()).toEqual({ x: 1, y: 0 })
  })

  it('สลับแท็บทั้งที่กดค้าง (blur) ต้องไม่ทำให้ตัวละครเดินค้าง', () => {
    const input = new InputSystem()
    detach = input.attachKeyboard()

    key('keydown', 'KeyD')
    window.dispatchEvent(new Event('blur'))
    expect(input.getMoveVector()).toEqual({ x: 0, y: 0 })
  })

  it('ถอด listener แล้วไม่รับอินพุตอีก', () => {
    const input = new InputSystem()
    const stop = input.attachKeyboard()
    stop()

    key('keydown', 'KeyD')
    expect(input.getMoveVector()).toEqual({ x: 0, y: 0 })
  })

  it('ปุ่มที่ไม่เกี่ยวกับการเดินไม่มีผล', () => {
    const input = new InputSystem()
    detach = input.attachKeyboard()

    key('keydown', 'KeyQ')
    expect(input.getMoveVector()).toEqual({ x: 0, y: 0 })
  })

  it('queues the selected Skill 2 instead of silently falling back to Skill 1', () => {
    const input = new InputSystem()

    input.pressSkill('skill-2')
    expect(input.consumeSkill()).toBe('skill-2')
    expect(input.consumeSkill()).toBeUndefined()
  })
})
