import { describe, expect, it } from 'vitest'
import {
  ENEMY_ATTACK,
  MONKEY_GOLDEN_FURY,
  MONKEY_SPINNING_STAFF,
  MONKEY_STAFF_SWEEP,
  MONKEY_STAFF_THRUST,
  PLAYER_ATTACK_CHAIN,
  type AttackDefinition,
} from './attacks'

/**
 * เทสต์ชุดนี้ pin ไว้ตาม Done-criteria ของ
 * docs/agent-blueprint/05-per-move-property-schema.md — งานนี้เป็น compile-time
 * data contract ไม่ใช่ runtime system จึงเทสต์ "รูปทรงของสัญญา" ไม่ใช่ behavior
 *
 * ใช้ `import.meta.glob` ของ Vite อ่านซอร์สเป็นข้อความ ไม่ใช้ `node:fs` เพราะ
 * tsconfig.app.json ตั้งใจไม่ให้ชนิดข้อมูลของ Node เข้ามาในโค้ดฝั่งแอป
 * (แพทเทิร์นเดียวกับ battleAssets.test.ts)
 */

// ไฟล์ .ts อื่นทั้งหมดใน realtimeBattle/ (ไม่รวม attacks.ts เอง และไม่รวมเทสต์)
const OTHER_REALTIME_BATTLE_SOURCES = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// ไฟล์ .ts/.tsx ทั้ง repo (ไม่รวมเทสต์) — สโคปกว้างกว่าเพื่อเช็ค done-criterion #5
const ALL_SRC_SOURCES = import.meta.glob('../../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function nonTestNonAttacksFiles(sources: Record<string, string>): [string, string][] {
  return Object.entries(sources).filter(
    ([path]) =>
      !path.endsWith('.test.ts') && !path.endsWith('.test.tsx') && !path.endsWith('/attacks.ts'),
  )
}

// Done-criterion #2 anchor: ฟิลด์ที่ "shipped" วันนี้ (required เสมอ + optional ที่มี
// consumer จริงแล้ว — เช่น targetLock ของระบบ #8 Skill-Targeting, ดู HitboxSystem.ts/
// SkillSystem.ts). ฟิลด์ใหม่จาก §3.6.7 ที่ยังไม่มี consumer (castDelayMs, interruptible,
// movementDuringCast, lungeDistance, hitstunMs, knockdown, multiTarget, effects[]) ต้องมากับ
// PR ของ consumer ที่อ่านมัน — ถ้าเทสต์นี้ fail เพราะมีฟิลด์ใหม่โผล่ ให้เช็คว่ามี consumer
// มาด้วยจริงไหมก่อนอัปเดตรายการนี้
const REQUIRED_FIELDS = [
  'id',
  'animationId',
  'startupMs',
  'activeMs',
  'recoveryMs',
  'comboWindowStartMs',
  'comboWindowEndMs',
  'damageMultiplier',
  'range',
  'hitShape',
  'arcDegrees',
  'depthTolerance',
  'knockback',
] as const

// 'effects' added by system #7 (Effects System) — real consumer is EffectsSystem.ts,
// per this file's own note above requiring a consumer before a new optional field lands here.
// 'knockdown' added by system #10 (Elite/Mini-boss Tier System) — real consumer is
// DamageSystem.ts's applyDamage (knockdown gate) + EnemyAISystem.ts (knockdown/getup states).
const OPTIONAL_FIELDS = [
  'targetLock',
  'effects',
  'knockdown',
  'lungeDistance',
  // P4 combat core (upstream PR #29, reconciled into this repo's Tier-1 systems merge)
  'telegraphMs',
  'hitstunMs',
  'knockdownMs',
  'getUpMs',
  'interruptible',
  'phaseOverrides',
  'strikeCount',
] as const
const KNOWN_FIELDS: readonly string[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

const ALL_SHIPPED_ATTACKS: AttackDefinition[] = [
  ...PLAYER_ATTACK_CHAIN,
  MONKEY_SPINNING_STAFF,
  MONKEY_STAFF_THRUST,
  MONKEY_STAFF_SWEEP,
  MONKEY_GOLDEN_FURY,
  ENEMY_ATTACK,
]

describe('AttackDefinition — schema shape (done-criteria #1, #2)', () => {
  it('ทุกท่าที่ shipped มีฟิลด์ required ครบ และไม่มีฟิลด์ที่ไม่รู้จัก (ไม่ใช่ required หรือ optional ที่ประกาศไว้)', () => {
    for (const attack of ALL_SHIPPED_ATTACKS) {
      const keys = Object.keys(attack)
      for (const required of REQUIRED_FIELDS) {
        expect(keys).toContain(required)
      }
      const unknown = keys.filter((key) => !KNOWN_FIELDS.includes(key))
      expect(unknown).toEqual([])
    }
  })

  it('ไม่มี interface/type ขนานที่นิยามฟิลด์จังหวะเดียวกันซ้ำในไฟล์อื่นของ realtimeBattle/', () => {
    // AttackDefinition ต้องเป็นแหล่งความจริงจุดเดียว — ไฟล์อื่นห้าม declare
    // interface/type ที่มีทั้ง startupMs และ damageMultiplier (ลายเซ็นเฉพาะของ move data)
    const offenders: string[] = []
    for (const [path, text] of nonTestNonAttacksFiles(OTHER_REALTIME_BATTLE_SOURCES)) {
      const declarations =
        text.match(
          /(?:interface|type)\s+\w+[\s\S]*?(?=\n(?:export\s+)?(?:interface|type|function|const)\s|\n\})/g,
        ) ?? []
      for (const decl of declarations) {
        if (/startupMs/.test(decl) && /damageMultiplier/.test(decl)) {
          offenders.push(path)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('AttackDefinition — hitShape union stays additive (done-criterion #4)', () => {
  it('ทุกท่าที่ shipped ใช้ hitShape ที่เป็นสมาชิกของ union ปัจจุบันเท่านั้น', () => {
    const knownShapes = new Set(['horizontal', 'radial'])
    for (const attack of ALL_SHIPPED_ATTACKS) {
      expect(knownShapes.has(attack.hitShape)).toBe(true)
    }
  })

  it('มีทั้งท่า horizontal และ radial อยู่จริง — ยืนยันว่า union ทั้งสองสมาชิกยังถูกใช้งาน', () => {
    const shapes = new Set(ALL_SHIPPED_ATTACKS.map((a) => a.hitShape))
    expect(shapes.has('horizontal')).toBe(true)
    expect(shapes.has('radial')).toBe(true)
  })
})

describe('Move data lives only in attacks.ts (done-criterion #5)', () => {
  it('ไม่มี timing/damage literal ของท่าโจมตีนอกไฟล์ attacks.ts ทั้ง repo', () => {
    // ตาม docstring ของไฟล์ attacks.ts เอง (บรรทัด 4-5): ค่าจังหวะทุกตัวต้องอยู่ไฟล์เดียว
    // pattern anchor ด้วยตัวเลขจริง ไม่ใช่แค่ bare key — ผ่าน re-export ที่ถูกกฎแบบ
    // EnemyAISystem.ts's `startupMs: ENEMY_ATTACK.startupMs` (อ่านจากแหล่งเดียว ไม่ hard-code)
    const dataFieldPattern =
      /\b(startupMs|activeMs|recoveryMs|comboWindowStartMs|comboWindowEndMs|damageMultiplier|knockback|arcDegrees|depthTolerance)\s*:\s*\d/

    const offenders = nonTestNonAttacksFiles(ALL_SRC_SOURCES)
      .filter(([, text]) => dataFieldPattern.test(text))
      .map(([path]) => path)

    expect(offenders).toEqual([])
  })
})
