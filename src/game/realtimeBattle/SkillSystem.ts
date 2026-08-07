import { isActiveWindow, totalDurationMs, type AttackDefinition } from './attacks'
import type { RealtimeSkillDefinition } from './skills'
import type { RealtimeBattleEntity } from './types'
import { isUltimateReady } from './ultimateGauge'

/**
 * ระบบสกิลของผู้เล่น (Blueprint v3 P3)
 *
 * 3 skills + 1 ultimate ต่อฮีโร่ — ท่าเดียวต่อการกด: startup → active → recovery
 * ดาเมจเกิดเฉพาะช่วง active ศัตรูแต่ละตัวโดนได้ครั้งเดียวต่อการร่าย
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
  definition: RealtimeSkillDefinition,
  isAttacking: boolean,
): boolean {
  if (player.state === 'dead') return false
  if (player.hitStunRemainingMs > 0) return false
  if (skill.definition !== null) return false
  if (isAttacking) return false

  if (definition.slot === 'ultimate') {
    return isUltimateReady(player.ultimateGauge)
  }

  if (
    definition.slot === 'skill1' ||
    definition.slot === 'skill2' ||
    definition.slot === 'skill3'
  ) {
    return player.skillCooldownsMs[definition.slot] <= 0
  }

  return false
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
  player.velocity = { x: 0, y: 0 }

  if (definition.slot === 'ultimate') {
    player.ultimateGauge = 0
  } else if (
    definition.slot === 'skill1' ||
    definition.slot === 'skill2' ||
    definition.slot === 'skill3'
  ) {
    player.skillCooldownsMs[definition.slot] = definition.cooldownMs
  }

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
    return { hitboxActive: false, attack: null }
  }

  skill.sinceStartMs += deltaMs
  const attack = skill.definition.attack

  if (skill.sinceStartMs >= totalDurationMs(attack)) {
    skill.definition = null
    skill.hitTargets.clear()
    skill.sinceStartMs = 0
    if (player.state === 'skill') player.state = 'idle'
    return { hitboxActive: false, attack: null }
  }

  player.state = 'skill'
  return {
    hitboxActive: isActiveWindow(attack, skill.sinceStartMs),
    attack,
  }
}
