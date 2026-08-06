import type { AttackDefinition } from './attacks'
import type { Direction8, RealtimeBattleEntity, Vec2 } from './types'

/**
 * ตรวจว่าใครโดน hitbox ของท่าโจมตีบ้าง (§15)
 *
 * รูปทรงเป็นกรวย: ระยะ + มุมรอบทิศที่ผู้โจมตีหันอยู่ ส่วนเป้าหมายเป็นวงกลม (`hurtboxRadius`)
 *
 * ── สองข้อห้ามของสเปกที่ไฟล์นี้เคารพ ────────────────────────
 * 1. ห้ามใช้ DOM bounding box ตัดสินการต่อสู้ — ทุกอย่างที่นี่เป็นเลขในระบบพิกัดของ runtime
 * 2. ห้ามอิงขนาดภาพ PNG เป็น hurtbox — ใช้ `hurtboxRadius` ที่ตั้งไว้ในข้อมูลหน่วยเท่านั้น
 *    (ภาพตัวละครมีพื้นที่ว่างรอบตัวไม่เท่ากันในแต่ละเฟรม ถ้าอิงภาพ ระยะโดนจะเปลี่ยนไปมา)
 * ────────────────────────────────────────────────────────────
 */

/** เวกเตอร์หนึ่งหน่วยของแต่ละทิศ — y ชี้ลงล่างของจอตามระบบพิกัด runtime */
const DIRECTION_VECTORS: Record<Direction8, Vec2> = {
  up: { x: 0, y: -1 },
  'up-right': { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  right: { x: 1, y: 0 },
  'down-right': { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  down: { x: 0, y: 1 },
  'down-left': { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  left: { x: -1, y: 0 },
  'up-left': { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
}

export function directionVector(facing: Direction8): Vec2 {
  return DIRECTION_VECTORS[facing]
}

export interface HitboxQuery {
  attacker: RealtimeBattleEntity
  attack: AttackDefinition
  /** หน่วยที่โดนไปแล้วในท่านี้ — กันโดนซ้ำจาก hitbox เดียวกัน (§15) */
  alreadyHit: ReadonlySet<string>
  /** เวลาปัจจุบันของ runtime ใช้ตรวจ invulnerability */
  elapsedMs: number
}

/**
 * คืนรายชื่อหน่วยที่โดนท่านี้ในเฟรมนี้
 *
 * ผู้เรียกมีหน้าที่บันทึก id ที่คืนกลับไปลงใน `alreadyHit` เอง — ฟังก์ชันนี้เป็น pure
 */
export function findHitTargets(
  targets: RealtimeBattleEntity[],
  { attacker, attack, alreadyHit, elapsedMs }: HitboxQuery,
): RealtimeBattleEntity[] {
  const facing = directionVector(attacker.facing)
  const halfArcCos = Math.cos((Math.min(360, attack.arcDegrees) / 2) * (Math.PI / 180))
  const isFullCircle = attack.arcDegrees >= 360

  return targets.filter((target) => {
    if (target.id === attacker.id) return false
    if (target.state === 'dead' || target.hp <= 0) return false
    if (alreadyHit.has(target.id)) return false
    if (target.invulnerableUntilMs > elapsedMs) return false

    const dx = target.position.x - attacker.position.x
    const dy = target.position.y - attacker.position.y
    const distance = Math.hypot(dx, dy)

    // เผื่อรัศมีตัวเป้าหมาย — ขอบตัวเข้ามาในระยะก็ถือว่าโดน
    if (distance > attack.range + target.hurtboxRadius) return false
    if (isFullCircle) return true

    // ยืนซ้อนกันสนิท ไม่มีทิศให้วัดมุม ถือว่าโดน
    if (distance === 0) return true

    const cosAngle = (dx * facing.x + dy * facing.y) / distance
    return cosAngle >= halfArcCos
  })
}
