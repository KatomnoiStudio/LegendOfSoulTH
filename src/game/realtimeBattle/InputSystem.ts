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

/** ปุ่มโจมตีบนคีย์บอร์ด — เว้นวรรคคือปุ่มที่คนเล่นเกมบนเบราว์เซอร์คาดหวังที่สุด */
const ATTACK_KEYS = new Set(['Space', 'KeyJ'])

export class InputSystem {
  private pressedKeys = new Set<string>()
  private joystick: Vec2 = { x: 0, y: 0 }
  /**
   * จำนวนครั้งที่สั่งโจมตีค้างไว้ รอให้เฟรมจำลองมาหยิบ
   *
   * เก็บเป็น "การกดที่ยังไม่ถูกใช้" ไม่ใช่ "ปุ่มถูกกดอยู่ไหม" เพราะการกดหนึ่งครั้งต้อง
   * แปลว่าโจมตีหนึ่งครั้งเสมอ ไม่ว่าเฟรมจำลองจะมาถี่แค่ไหน และการกดค้างต้องไม่กลายเป็น
   * โจมตีรัวอัตโนมัติ
   */
  private pendingAttacks = 0

  /** เริ่มฟังคีย์บอร์ด คืนฟังก์ชันสำหรับถอด listener (ต้องเรียกตอน unmount — §28) */
  attachKeyboard(target: Window = window): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (ATTACK_KEYS.has(event.code)) {
        event.preventDefault()
        // กดค้างไม่นับซ้ำ — ต้องปล่อยแล้วกดใหม่ถึงจะเป็นการโจมตีครั้งถัดไป
        if (!this.pressedKeys.has(event.code)) this.pendingAttacks += 1
        this.pressedKeys.add(event.code)
        return
      }
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

  /** ปุ่มโจมตีบนจอสัมผัสเรียกตัวนี้ */
  pressAttack(): void {
    this.pendingAttacks += 1
  }

  /**
   * หยิบคำสั่งโจมตีที่ค้างอยู่ไปหนึ่งครั้ง — คืน true ถ้ามี
   *
   * ใช้แบบ "หยิบแล้วหาย" เพื่อให้การกดหนึ่งครั้ง = โจมตีหนึ่งครั้งพอดี
   */
  consumeAttack(): boolean {
    if (this.pendingAttacks <= 0) return false
    this.pendingAttacks -= 1
    return true
  }

  reset(): void {
    this.pressedKeys.clear()
    this.joystick = { x: 0, y: 0 }
    this.pendingAttacks = 0
  }
}
