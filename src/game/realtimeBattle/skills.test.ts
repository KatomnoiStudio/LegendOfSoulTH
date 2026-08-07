import { describe, expect, it } from 'vitest'
import { PLAYER_ATTACK_CHAIN, SKILL_CONFIG, type AttackDefinition } from './attacks'
import { applyDamage } from './DamageSystem'
import { resolveTargets } from './EffectsSystem'
import { findHitTargets } from './HitboxSystem'
import {
  getRealtimeSkillKit,
  getSkillFromKit,
  REALTIME_CHARACTER_KITS,
  type RealtimeSkillKit,
  type SkillSlot,
} from './skills'
import { canStartSkill, createSkillState, startSkill, stepSkill } from './SkillSystem'
import type { RealtimeBattleEntity } from './types'

/**
 * เทสต์ระดับ "การประกอบ kit ทั้งชุด" ของ Hero Kit / Archetype System
 * (docs/agent-blueprint/12-hero-kit-archetype-system.md) — แยกจาก:
 *   - SkillSystem.test.ts   เทสต์กลไกต่อสกิลเดียว (รวม targetLock ของระบบ #8)
 *   - EffectsSystem.test.ts เทสต์ resolver เอฟเฟกต์ของระบบ #7
 * ไฟล์นี้เทสต์เฉพาะสิ่งที่เป็นของ Hero Kit เอง: kit ครบช่อง, targetLock เฉพาะที่ประกาศไว้,
 * ต้นทุนเพิ่มฮีโร่ตัวที่สอง (§3.8.2), และเอฟเฟกต์เล็ง ally ตกกลับ self (§3.8.1)
 *
 * ไม่มี production code เปลี่ยนแปลงมาคู่กับไฟล์นี้ — ทุก Done-criterion พิสูจน์ได้ด้วยข้อมูล +
 * SkillSystem.ts/HitboxSystem.ts/DamageSystem.ts/EffectsSystem.ts ตัวเดิมทั้งหมด ตรงตามที่
 * Done-criterion #4 อ้างว่า "data difference, not architecture gap"
 */

const SLOTS: SkillSlot[] = ['skill1', 'skill2', 'skill3', 'ultimate']

function entity(overrides: Partial<RealtimeBattleEntity> = {}): RealtimeBattleEntity {
  return {
    id: 'unit',
    entityType: 'enemy',
    name: 'หน่วย',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    combatFacing: 'right',
    state: 'idle',
    hp: 200,
    maxHp: 200,
    atk: 100,
    def: 20,
    speed: 200,
    collisionRadius: 30,
    hurtboxRadius: 36,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    ...overrides,
  }
}

describe('REALTIME_CHARACTER_KITS — ทุก kit มีครบ 4 ช่อง (done-criterion #2, §4.3 "★1 fully playable")', () => {
  it('ทุกฮีโร่ที่ shipped มี skill1/skill2/skill3/ultimate จริง ไม่ใช่แค่ type บังคับตอนคอมไพล์', () => {
    const kits = Object.values(REALTIME_CHARACTER_KITS)
    expect(kits.length).toBeGreaterThan(0)

    for (const kit of kits) {
      for (const slot of SLOTS) {
        const definition = getSkillFromKit(kit, slot)
        expect(definition).toBeTruthy()
        expect(definition.slot).toBe(slot)
        expect(definition.characterId).toBe(kit.characterId)
        expect(definition.attack).toBeTruthy()
        expect(definition.cooldownMs).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('targetLock — เฉพาะสกิลที่ประกาศไว้ชัดเจนเท่านั้นที่ล็อกเป้าอัตโนมัติ (done-criterion #3, §3.7)', () => {
  const kit = getRealtimeSkillKit('monkey-king')
  if (!kit) throw new Error('ไม่พบ kit หงอคง')

  it('อัลติเมทหงอคง (แยก 4 ร่าง → พุ่งโจมตี) ล็อกเป้าที่ใกล้สุด', () => {
    expect(kit.ultimate.attack.targetLock).toBe('nearest')
  })

  it('S1/S2/S3 ไม่ล็อกเป้าอัตโนมัติ — ไม่ใช่ global assist (§3.6.1)', () => {
    expect(kit.skill1.attack.targetLock).toBeUndefined()
    expect(kit.skill2.attack.targetLock).toBeUndefined()
    expect(kit.skill3.attack.targetLock).toBeUndefined()
  })

  it('คอมโบพื้นฐานทั้งสามไม้ไม่ล็อกเป้าอัตโนมัติ', () => {
    for (const attack of PLAYER_ATTACK_CHAIN) {
      expect(attack.targetLock).toBeUndefined()
    }
  })
})

describe('เพิ่มฮีโร่ระยะไกลตัวที่สองได้ด้วยข้อมูลล้วน ๆ (done-criterion #4, §3.8.2)', () => {
  // ฮีโร่สมมติ "นักธนู" — ใช้ hitShape เดิม ('horizontal') ระยะไกลกว่าหงอคงมาก (480 vs 120)
  // เป็นจุดต่างเดียวของ archetype นี้ พิสูจน์ระดับสถาปัตยกรรมด้วยฟิลด์ที่มีอยู่แล้วจริงวันนี้
  // (lungeDistance ยังไม่มี field — รอ Basic Attack System #3 / Per-Move-Property-Schema #5
  // เพิ่มมาพร้อม consumer จริงตาม Done-criterion #2 ของ work contract ของระบบ #5 เอง)
  const rangedBasic: AttackDefinition = {
    id: 'archer-basic',
    animationId: 'attack-1',
    startupMs: 90,
    activeMs: 60,
    recoveryMs: 200,
    comboWindowStartMs: 90,
    comboWindowEndMs: 600,
    damageMultiplier: 0.9,
    range: 480,
    hitShape: 'horizontal',
    arcDegrees: 0,
    depthTolerance: 60,
    knockback: 20,
  }

  function rangedSkill(slot: SkillSlot, id: string, overrides: Partial<AttackDefinition> = {}) {
    return {
      id,
      name: id,
      slot,
      characterId: 'archer-general',
      attack: { ...rangedBasic, id, ...overrides },
      cooldownMs: SKILL_CONFIG.skill1CooldownMs,
      invulnerableMs: SKILL_CONFIG.invulnerableMs,
    }
  }

  const rangedKit: RealtimeSkillKit = {
    characterId: 'archer-general',
    skill1: rangedSkill('skill1', 'archer-volley', { damageMultiplier: 1.4 }),
    skill2: rangedSkill('skill2', 'archer-pin-shot', { damageMultiplier: 1.2 }),
    skill3: rangedSkill('skill3', 'archer-rain', { damageMultiplier: 1.3 }),
    ultimate: rangedSkill('ultimate', 'archer-execute', {
      damageMultiplier: 2.2,
      targetLock: 'nearest',
    }),
  }

  it('ยิงโดนศัตรูไกลเกิน melee range เดิม (120) โดยไม่แก้ HitboxSystem.ts เลย', () => {
    const archer = entity({ id: 'archer', entityType: 'player', position: { x: 0, y: 0 } })
    const target = entity({ id: 'target', position: { x: 400, y: 0 } })

    const hits = findHitTargets([target], {
      attacker: archer,
      attack: rangedBasic,
      alreadyHit: new Set(),
      elapsedMs: 0,
    })
    expect(hits.map((t) => t.id)).toEqual(['target'])
  })

  it('ดาเมจคำนวณผ่าน DamageSystem ตัวเดิมได้ปกติ ไม่มี branch พิเศษต่อ archetype', () => {
    const archer = entity({
      id: 'archer',
      entityType: 'player',
      atk: 80,
      facing: 'right',
      position: { x: 0, y: 0 },
    })
    const target = entity({ id: 'target', def: 20, position: { x: 400, y: 0 } })

    const outcome = applyDamage({
      attacker: archer,
      target,
      attack: rangedBasic,
      elapsedMs: 0,
      random: () => 0.5,
    })
    expect(outcome.amount).toBeGreaterThan(0)
    expect(target.hitStunRemainingMs).toBeGreaterThan(0)
  })

  it('ร่ายสกิล 1 ของอาร์เชอร์ผ่าน SkillSystem ตัวเดิมได้ปกติ', () => {
    const archer = entity({ id: 'archer', entityType: 'player', characterId: 'archer-general' })
    const skill = createSkillState()

    expect(canStartSkill(archer, skill, rangedKit.skill1, false)).toBe(true)
    expect(startSkill(archer, skill, rangedKit.skill1, 0)).toBe(true)
    expect(stepSkill(archer, skill, rangedKit.skill1.attack.startupMs + 1).hitboxActive).toBe(true)
  })

  it('อัลติเมทของอาร์เชอร์ (targetLock: nearest) ทำงานผ่าน HitboxSystem ตัวเดิม', () => {
    const archer = entity({ id: 'archer', entityType: 'player' })
    const near = entity({ id: 'near', position: { x: 100, y: 0 } })

    const hits = findHitTargets([near], {
      attacker: archer,
      attack: rangedKit.ultimate.attack,
      alreadyHit: new Set(),
      elapsedMs: 0,
      lockedTargetId: 'near',
    })
    expect(hits.map((t) => t.id)).toEqual(['near'])
  })
})

describe('เอฟเฟกต์เล็ง ally ของ kit ตกกลับมาที่ตัวเองเมื่อโซโล่ (done-criterion #5, §3.8.1)', () => {
  it('singleAlly/allAllies เล็งตัวเองเมื่อไม่มี ally อื่นบนสนาม', () => {
    const owner = entity({ id: 'hero', entityType: 'player' })
    const ctx = { owner, allies: [], enemies: [] }

    expect(resolveTargets('singleAlly', ctx).map((u) => u.id)).toEqual(['hero'])
    expect(resolveTargets('allAllies', ctx).map((u) => u.id)).toEqual(['hero'])
  })

  it('มี summon (ally) ออกสนามอยู่ → เล็งกลุ่มพวกพ้องจริง ไม่ fallback (Summoner archetype, §3.8.1)', () => {
    const owner = entity({ id: 'hero', entityType: 'player' })
    const summon = entity({ id: 'summon-1', entityType: 'ally' })
    const ctx = { owner, allies: [summon], enemies: [] }

    expect(resolveTargets('allAllies', ctx).map((u) => u.id)).toEqual(['summon-1'])
  })
})
