/**
 * นิยามท่าโจมตีทั้งหมด — แหล่งความจริงจุดเดียว (§13)
 *
 * ค่าจังหวะทุกตัวอยู่ในไฟล์นี้ไฟล์เดียว ห้ามกระจายไปเขียนใน component หรือใน system
 * เพราะการปรับสมดุลการต่อสู้คือการแก้ตัวเลขพวกนี้ ถ้ามันกระจายอยู่ห้าที่ จะปรับไม่ได้จริง
 *
 * ── ทำไม damage ต้องเกิดที่ active frame ─────────────────────
 * สเปกข้อ 13 ห้ามให้ดาเมจเกิดทันทีที่กดปุ่ม ท่าหนึ่งจึงมีสามช่วง:
 *   startup  = เงื้อ (ยังไม่โดน) → ผู้เล่นฝ่ายตรงข้ามมีเวลาหลบ
 *   active   = ช่วงที่ hitbox มีอยู่จริง (โดนได้เฉพาะช่วงนี้)
 *   recovery = ชักท่ากลับ (ยังสั่งท่าใหม่ไม่ได้)
 * ────────────────────────────────────────────────────────────
 */

export interface AttackDefinition {
  id: string
  /** ชุดเฟรมที่จะเล่น (ดู src/game/battleSpriteSequences.ts) */
  animationId: 'attack-1' | 'attack-2' | 'attack-3' | 'skill-1'

  startupMs: number
  activeMs: number
  recoveryMs: number

  /** ช่วงเวลาที่รับอินพุตท่าถัดไปได้ นับจากเริ่มท่า */
  comboWindowStartMs: number
  comboWindowEndMs: number

  damageMultiplier: number
  /** ระยะจากกึ่งกลางตัวผู้โจมตีถึงขอบนอกของ hitbox */
  range: number
  /** ความกว้างของกรวยโจมตี (องศา) — 360 = รอบตัว */
  arcDegrees: number
  knockback: number
}

/**
 * ท่าโจมตีพื้นฐานของผู้เล่น
 *
 * ตอนนี้มีท่าเดียว — คอมโบสามไม้จะเข้ามาในงานถัดไป (สเปกข้อ 33 แยกเป็นคนละ commit)
 * ฟิลด์ comboWindow ถูกใช้แล้วตั้งแต่ตอนนี้เพื่อกำหนดว่า "กดซ้ำได้เมื่อไหร่"
 */
export const PLAYER_ATTACK: AttackDefinition = {
  id: 'monkey-attack-1',
  animationId: 'attack-1',
  startupMs: 110,
  activeMs: 90,
  recoveryMs: 180,
  comboWindowStartMs: 150,
  comboWindowEndMs: 620,
  damageMultiplier: 1,
  range: 120,
  arcDegrees: 110,
  knockback: 60,
}

/** ท่าโจมตีของศัตรู — จังหวะเดียวกับที่ EnemyAISystem ใช้ตัดสินใจ */
export const ENEMY_ATTACK: AttackDefinition = {
  id: 'enemy-melee',
  animationId: 'attack-1',
  startupMs: 320,
  activeMs: 140,
  recoveryMs: 420,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1,
  range: 110,
  arcDegrees: 120,
  knockback: 90,
}

export function totalDurationMs(attack: AttackDefinition): number {
  return attack.startupMs + attack.activeMs + attack.recoveryMs
}

/** อยู่ในช่วงที่ hitbox มีผลจริงหรือยัง */
export function isActiveWindow(attack: AttackDefinition, sinceStartMs: number): boolean {
  return sinceStartMs >= attack.startupMs && sinceStartMs < attack.startupMs + attack.activeMs
}
