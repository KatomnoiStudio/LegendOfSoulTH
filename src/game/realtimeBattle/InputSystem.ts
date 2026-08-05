import type { Vec2 } from './types'

/**
 * รวบรวมอินพุตทุกทางให้เหลือ "เวกเตอร์เดินหนึ่งตัว" ที่ runtime อ่าน
 *
 * รองรับพร้อมกันสองทาง (§11): คีย์บอร์ด WASD/ลูกศร และจอยสติกบนจอสัมผัส
 * ทั้งคู่เขียนลงตัวแปรเดียวกัน ผู้เล่นจึงสลับไปมาได้โดยไม่ต้องรีเซ็ตอะไร
 *
 * ไฟล์นี้ไม่รู้จัก React และไม่แตะ runtime โดยตรง — มันแค่ "อ่านค่าอินพุตปัจจุบัน"
 * ให้ผู้เรียกเอาไปป้อน runtime เอง ทำให้เทสต์ระบบเดินไม่ต้องมี DOM
 */

const KEY_VECTORS: Record<string, Vec2> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
}

export class InputSystem {
  private pressedKeys = new Set<string>()
  private joystick: Vec2 = { x: 0, y: 0 }

  /** เริ่มฟังคีย์บอร์ด คืนฟังก์ชันสำหรับถอด listener (ต้องเรียกตอน unmount — §28) */
  attachKeyboard(target: Window = window): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.code in KEY_VECTORS)) return
      // กันหน้าเว็บเลื่อนตามปุ่มลูกศรระหว่างเล่น
      event.preventDefault()
      this.pressedKeys.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      this.pressedKeys.delete(event.code)
    }
    // เปลี่ยนแท็บทั้งที่ยังกดค้างอยู่ = ไม่มี keyup ตามมา ต้องล้างเอง ไม่งั้นตัวละครเดินค้าง
    const onBlur = () => this.pressedKeys.clear()

    target.addEventListener('keydown', onKeyDown)
    target.addEventListener('keyup', onKeyUp)
    target.addEventListener('blur', onBlur)

    return () => {
      target.removeEventListener('keydown', onKeyDown)
      target.removeEventListener('keyup', onKeyUp)
      target.removeEventListener('blur', onBlur)
      this.pressedKeys.clear()
    }
  }

  /** จอยสติกส่งเวกเตอร์ในช่วง -1..1 เข้ามาตรง ๆ */
  setJoystick(vector: Vec2): void {
    this.joystick = vector
  }

  /**
   * เวกเตอร์เดินปัจจุบัน — ยังไม่ normalize (ปล่อยให้ MovementSystem จัดการ)
   *
   * จอยสติกชนะคีย์บอร์ดเมื่อถูกดันจริง เพราะมันให้ค่าต่อเนื่อง (เดินช้า-เร็วได้)
   * ถ้าเอามาบวกกับคีย์บอร์ดจะได้ทิศเพี้ยนตอนผู้เล่นเผลอแตะทั้งสองทาง
   */
  getMoveVector(): Vec2 {
    if (this.joystick.x !== 0 || this.joystick.y !== 0) {
      return { x: this.joystick.x, y: this.joystick.y }
    }

    let x = 0
    let y = 0
    for (const code of this.pressedKeys) {
      const vector = KEY_VECTORS[code]
      if (!vector) continue
      x += vector.x
      y += vector.y
    }
    return { x, y }
  }

  reset(): void {
    this.pressedKeys.clear()
    this.joystick = { x: 0, y: 0 }
  }
}
