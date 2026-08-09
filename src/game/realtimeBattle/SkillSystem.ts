import { isActiveWindow, totalDurationMs, type AttackDefinition } from './attacks'
import type { RealtimeSkillDefinition } from './skills'
import type { RealtimeBattleEntity } from './types'

/**
 * ระบบสกิลของผู้เล่น (§18)
 *
 * ทำงานคล้ายคอมโบท่าเดียว: กดแล้วเล่นท่า startup → active → recovery
 * ดาเมจเกิดเฉพาะช่วง active เท่านั้น ศัตรูแต่ละตัวโดนได้ครั้งเดียวต่อการร่าย
 *
 * ระหว่างร่ายสกิลผู้เล่นหยุดนิ่ง — hitbox หมุนรอบตัวจึงไม่ลากตามการเดิน
 */

export interface SkillState {
  definition: RealtimeSkillDefinition | null
  sinceStartMs: number
  hitTargets: Set<string>
}

export function createSkillState(): SkillState {
  return {
    definition: null,
    sinceStartMs: 0,
    hitTargets: new Set(),
  }
}

export function isCastingSkill(skill: SkillState): boolean {
  return skill.definition !== null
}

export function canStartSkill(
  player: RealtimeBattleEntity,
  skill: SkillState,
  isAttacking: boolean,
  isDashing: boolean,
): boolean {
  if (player.state === 'dead') return false
  if (player.hitStunRemainingMs > 0) return false
  if (skill.definition !== null) return false
  if (isDashing) return false
  if (isAttacking) return false
  if (player.skillCooldownRemainingMs > 0) return false
  return true
}

/** เริ่มร่ายสกิล — คืน true ถ้าเริ่มได้จริง */
export function startSkill(
  player: RealtimeBattleEntity,
  skill: SkillState,
  definition: RealtimeSkillDefinition,
  elapsedMs: number,
): boolean {
  skill.definition = definition
  skill.sinceStartMs = 0
  skill.hitTargets.clear()

  player.state = 'skill'
  player.attackAnimationId = definition.attack.animationId
  player.velocity = { x: 0, y: 0 }
  player.skillCooldownRemainingMs = definition.cooldownMs
  player.invulnerableUntilMs = elapsedMs + definition.invulnerableMs
  return true
}

export interface SkillTick {
  hitboxActive: boolean
  attack: AttackDefinition | null
}

/** เดินท่าสกิลไปหนึ่ง tick */
export function stepSkill(
  player: RealtimeBattleEntity,
  skill: SkillState,
  deltaMs: number,
): SkillTick {
  if (!skill.definition) {
    return { hitboxActive: false, attack: null }
  }

  if (player.hitStunRemainingMs > 0 || player.state === 'dead') {
    skill.definition = null
    skill.hitTargets.clear()
    skill.sinceStartMs = 0
    player.attackAnimationId = undefined
    return { hitboxActive: false, attack: null }
  }

  skill.sinceStartMs += deltaMs
  const attack = skill.definition.attack

  if (skill.sinceStartMs >= totalDurationMs(attack)) {
    skill.definition = null
    skill.hitTargets.clear()
    skill.sinceStartMs = 0
    if (player.state === 'skill') player.state = 'idle'
    player.attackAnimationId = undefined
    return { hitboxActive: false, attack: null }
  }

  player.state = 'skill'
  return {
    hitboxActive: isActiveWindow(attack, skill.sinceStartMs),
    attack,
  }
}
