import { describe, expect, it } from 'vitest'
import { sumHeldDirections } from './useExploration'
import type { Direction } from '../game/exploration/types'

/**
 * เทสต์เฉพาะ sumHeldDirections — ตรรกะแกนที่แก้จริงจาก ask-CB retroactive audit
 * (2026-08-06): เดิมเก็บ "เวกเตอร์ล่าสุด" ตัวเดียวแทนที่จะเป็น "ชุดทิศที่กดอยู่"
 * ทำให้ปล่อยปุ่มไหนก็ได้ = หยุดสนิททันที แม้ปุ่มอื่นยังกดค้างอยู่จริง
 *
 * ไม่เทสต์ทั้ง hook (rAF/keyboard listener/DOM) ตรง ๆ เพราะโปรเจกต์นี้ไม่มี
 * @testing-library/react ติดตั้งอยู่ — ตามธรรมเนียมเดิมของโปรเจกต์ (ดู InputSystem.ts
 * ของห้องต่อสู้) แยกตรรกะแกนเป็นฟังก์ชัน pure ที่เทสต์ตรง ๆ ได้โดยไม่ต้องมี DOM
 */
describe('sumHeldDirections', () => {
  it('ไม่มีทิศไหนกดอยู่ = นิ่ง', () => {
    expect(sumHeldDirections(new Set())).toEqual({ x: 0, y: 0 })
  })

  it('กดทิศเดียว', () => {
    expect(sumHeldDirections(new Set(['up']))).toEqual({ x: 0, y: -1 })
    expect(sumHeldDirections(new Set(['right']))).toEqual({ x: 1, y: 0 })
  })

  it('กดสองทิศไม่ตรงข้ามกันพร้อมกัน = เดินทแยง', () => {
    expect(sumHeldDirections(new Set(['up', 'right']))).toEqual({ x: 1, y: -1 })
  })

  it('กดสองทิศตรงข้ามกันพร้อมกัน = หักล้างกันเป็นศูนย์', () => {
    expect(sumHeldDirections(new Set(['up', 'down']))).toEqual({ x: 0, y: 0 })
  })

  // นี่คือบั๊กที่ ask-CB เจอโดยตรง: กดค้าง 2 ทิศ แล้ว "ปล่อย" ไปหนึ่งทิศ (ลบออกจาก Set)
  // ทิศที่เหลือต้องยังส่งผลอยู่ ไม่ใช่หยุดสนิท
  it('กดค้าง 2 ทิศแล้วปล่อยไปหนึ่งทิศ — ทิศที่เหลือต้องยังเดินต่อ ไม่หยุดสนิท', () => {
    const held = new Set<Direction>(['up', 'right'])
    held.delete('right') // จำลองปล่อยปุ่ม right ขณะ up ยังกดค้างอยู่
    expect(sumHeldDirections(held)).toEqual({ x: 0, y: -1 })
  })
})
