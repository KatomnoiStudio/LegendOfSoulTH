import { applyDefense, calcPhysicalDamage } from './formulas'
import { resolveSkill, type SkillOutcome } from './skills'
import type { BattleAction, BattleSnapshot, Combatant } from './types'

export interface ActionResolution {
  logLines: Array<{ text: string; tone: 'normal' | 'damage' | 'heal' | 'buff' | 'system' }>
  outcomes: SkillOutcome[]
  actorDefending?: boolean
}

export function resolveAttack(actor: Combatant, target: Combatant): ActionResolution {
  const raw = calcPhysicalDamage(actor.atk, target.def)
  const damage = applyDefense(raw, target.defending)
  return {
    logLines: [{ text: `${actor.name} โจมตี ${target.name} ดาเมจ ${damage}`, tone: 'damage' }],
    outcomes: [{ targetId: target.id, damage, defeated: target.hp - damage <= 0 }],
  }
}

export function resolveDefend(actor: Combatant): ActionResolution {
  return {
    logLines: [{ text: `${actor.name} ตั้งท่าป้องกัน`, tone: 'buff' }],
    outcomes: [],
    actorDefending: true,
  }
}

export function resolveAction(
  snapshot: BattleSnapshot,
  action: BattleAction,
): ActionResolution {
  const actor = findUnit(snapshot, action.actorId)
  const target = findUnit(snapshot, action.targetId)
  if (!actor) {
    return { logLines: [{ text: 'ไม่พบผู้กระทำ', tone: 'system' }], outcomes: [] }
  }

  if (action.kind === 'defend') {
    return resolveDefend(actor)
  }

  if (action.kind === 'attack') {
    if (!target) {
      return { logLines: [{ text: 'ไม่พบเป้าหมาย', tone: 'system' }], outcomes: [] }
    }
    return resolveAttack(actor, target)
  }

  if (!target && !actor.characterId) {
    return { logLines: [{ text: 'ไม่พบเป้าหมาย', tone: 'system' }], outcomes: [] }
  }

  const skill = resolveSkill(actor, target ?? actor, snapshot.allies, snapshot.enemies)
  return {
    logLines: skill.logLines.map((text) => ({ text, tone: 'damage' as const })),
    outcomes: skill.outcomes,
  }
}

function findUnit(snapshot: BattleSnapshot, id: string): Combatant | undefined {
  return [...snapshot.allies, ...snapshot.enemies].find((unit) => unit.id === id)
}

export function applyOutcomes(
  snapshot: BattleSnapshot,
  actorId: string,
  resolution: ActionResolution,
): BattleSnapshot {
  const patchUnit = (unit: Combatant): Combatant => {
    const outcome = resolution.outcomes.find((entry) => entry.targetId === unit.id)
    if (!outcome) {
      if (unit.id === actorId && resolution.actorDefending) {
        return { ...unit, defending: true }
      }
      return unit
    }

    let hp = unit.hp
    if (outcome.damage) hp = Math.max(0, hp - outcome.damage)
    if (outcome.healing) hp = Math.min(unit.maxHp, hp + outcome.healing)
    return { ...unit, hp, defending: unit.id === actorId ? false : unit.defending }
  }

  return {
    ...snapshot,
    allies: snapshot.allies.map(patchUnit),
    enemies: snapshot.enemies.map(patchUnit),
  }
}
