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
 * คอมโบสามไม้ของผู้เล่น (§14)
 *
 * ไม้ที่สามแรงและกระเด็นไกลกว่าสองไม้แรกชัดเจน เพื่อให้การต่อคอมโบจนจบมีรางวัลจริง
 * ไม่ใช่แค่ตีเร็วขึ้น และ recovery ของไม้สามยาวกว่าเพื่อไม่ให้วนคอมโบไม่รู้จบ
 */
export const PLAYER_ATTACK_CHAIN: AttackDefinition[] = [
  {
    id: 'monkey-attack-1',
    animationId: 'attack-1',
    startupMs: 110,
    activeMs: 90,
    recoveryMs: 180,
    comboWindowStartMs: 110,
    comboWindowEndMs: 700,
    damageMultiplier: 1,
    range: 120,
    arcDegrees: 110,
    knockback: 60,
  },
  {
    id: 'monkey-attack-2',
    animationId: 'attack-2',
    startupMs: 100,
    activeMs: 90,
    recoveryMs: 190,
    comboWindowStartMs: 100,
    comboWindowEndMs: 700,
    damageMultiplier: 1.15,
    range: 128,
    arcDegrees: 120,
    knockback: 80,
  },
  {
    id: 'monkey-attack-3',
    animationId: 'attack-3',
    startupMs: 150,
    activeMs: 120,
    recoveryMs: 320,
    // ไม้สุดท้ายไม่มีหน้าต่างต่อคอมโบ — จบคอมโบแล้วต้องเริ่มใหม่
    comboWindowStartMs: 0,
    comboWindowEndMs: 0,
    damageMultiplier: 1.55,
    range: 150,
    arcDegrees: 150,
    knockback: 210,
  },
]

/**
 * ค่าจังหวะของระบบคอมโบ — อยู่ที่เดียว ห้าม hard-code กระจายหลายไฟล์ (§14)
 *
 * comboResetMs  : ปล่อยนานเกินนี้หลังจบท่า คอมโบรีเซ็ตกลับไม้แรก (สเปกแนะนำ 650–800)
 * inputBufferMs : กดก่อนท่าปัจจุบันจบได้เท่านี้ แล้วระบบจะจำไว้ยิงต่อให้ (แนะนำ 120–180)
 * hitStopMs     : หยุดเวลาแวบหนึ่งตอนโดน ให้รู้สึกว่าหมัดมีน้ำหนัก (แนะนำ 40–70)
 */
export const COMBO_CONFIG = {
  comboResetMs: 700,
  inputBufferMs: 160,
  hitStopMs: 55,
} as const

/** ค่าจังหวะของ dash (§17) */
export const DASH_CONFIG = {
  durationMs: 220,
  invulnerableMs: 170,
  cooldownMs: 1300,
  /** ระยะทางรวมของการพุ่งหนึ่งครั้ง (หน่วย runtime) */
  distance: 300,
} as const

/**
 * สกิลหมุนกระบวนทองคำของหงอคง (§18)
 *
 * โจมตีรอบตัว 360° ช่วง active ยาวกว่าคอมโบไม้เดียว — ศัตรูแต่ละตัวโดนได้ครั้งเดียวต่อการร่าย
 * damageMultiplier สูงกว่าไม้สามของคอมโบเล็กน้อย เพื่อให้คูลดาวน์ 8 วินาทีคุ้มค่า
 */
export const MONKEY_SPINNING_STAFF: AttackDefinition = {
  id: 'monkey-spinning-staff',
  animationId: 'skill-1',
  startupMs: 180,
  activeMs: 420,
  recoveryMs: 520,
  comboWindowStartMs: 0,
  comboWindowEndMs: 0,
  damageMultiplier: 1.65,
  range: 158,
  arcDegrees: 360,
  knockback: 140,
}

/** ค่าจังหวะของสกิล (§18) — อยู่ที่เดียว ห้าม hard-code กระจายหลายไฟล์ */
export const SKILL_CONFIG = {
  cooldownMs: 8000,
  /** i-frame ช่วงเปิดท่า — สั้นกว่าเวลาร่ายทั้งหมด ไม่ให้รอดฟรีตลอดท่า */
  invulnerableMs: 280,
} as const

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
