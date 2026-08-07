import type { Vec2 } from './types'
import type { SkillSlot } from './skills'

/**
 * รวบรวมอินพุตทุกทางให้เหลือ "เวกเตอร์เดินหนึ่งตัว" ที่ runtime อ่าน
 *
 * Blueprint v3 P3: 3 skills + ultimate (ไม่มีปุ่ม dash)
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

const ATTACK_KEYS = new Set(['Space', 'KeyJ'])

/** ปุ่มสกิล — PC: 1–4 หรือ E/R/F/Q */
const SKILL_SLOT_KEYS: Record<string, SkillSlot> = {
  Digit1: 'skill1',
  KeyE: 'skill1',
  Digit2: 'skill2',
  KeyR: 'skill2',
  Digit3: 'skill3',
  KeyF: 'skill3',
  Digit4: 'ultimate',
  KeyQ: 'ultimate',
}

export class InputSystem {
  private pressedKeys = new Set<string>()
  private joystick: Vec2 = { x: 0, y: 0 }
  private pendingAttacks = 0
  private pendingSkillSlots: SkillSlot[] = []

  attachKeyboard(target: Window = window): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (ATTACK_KEYS.has(event.code)) {
        event.preventDefault()
        if (!this.pressedKeys.has(event.code)) this.pendingAttacks += 1
        this.pressedKeys.add(event.code)
        return
      }
      const skillSlot = SKILL_SLOT_KEYS[event.code]
      if (skillSlot) {
        event.preventDefault()
        if (!this.pressedKeys.has(event.code)) this.pendingSkillSlots.push(skillSlot)
        this.pressedKeys.add(event.code)
        return
      }
      if (!(event.code in KEY_VECTORS)) return
      event.preventDefault()
      this.pressedKeys.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      this.pressedKeys.delete(event.code)
    }
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

  setJoystick(vector: Vec2): void {
    this.joystick = vector
  }

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

  pressAttack(): void {
    this.pendingAttacks += 1
  }

  pressSkill(slot: SkillSlot): void {
    this.pendingSkillSlots.push(slot)
  }

  consumeAttack(): boolean {
    if (this.pendingAttacks <= 0) return false
    this.pendingAttacks -= 1
    return true
  }

  consumeSkill(): SkillSlot | null {
    if (this.pendingSkillSlots.length <= 0) return null
    return this.pendingSkillSlots.shift() ?? null
  }

  reset(): void {
    this.pressedKeys.clear()
    this.joystick = { x: 0, y: 0 }
    this.pendingAttacks = 0
    this.pendingSkillSlots = []
  }
}
