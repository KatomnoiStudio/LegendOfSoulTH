import type { Combatant } from './types'
import { applyDefense, calcPhysicalDamage } from './formulas'

interface SkillBase {
  id: string
  name: string
  description: string
}

/**
 * discriminated union แทนที่ optional-boolean หลายตัว (power?/hitsAllEnemies?/healPercent?)
 * ของเดิม — เพิ่มท่าแบบใหม่ (debuff, DoT ฯลฯ) ต้องเพิ่ม branch ใน union + resolver ให้ครบ
 * TypeScript บังคับให้ resolveSkill สวิตช์ให้ครบทุก effect เอง (ดู RESOLVERS ด้านล่าง)
 */
export type SkillDefinition =
  | (SkillBase & { effect: 'single-target'; power: number })
  | (SkillBase & { effect: 'hits-all-enemies'; power: number })
  | (SkillBase & { effect: 'heal-lowest-ally'; healPercent: number })

export const CHARACTER_SKILLS: Record<string, SkillDefinition> = {
  'monkey-king': {
    id: 'golden-staff',
    name: 'กระบวนทองคำ',
    description: 'โจมตีรุนแรง 150% พลังโจมตี',
    effect: 'single-target',
    power: 1.5,
  },
  'pig-warrior': {
    id: 'rake-sweep',
    name: 'คราดเก้าซี่',
    description: 'ฟาดศัตรูทุกตัว 70% พลังโจมตี',
    effect: 'hits-all-enemies',
    power: 0.7,
  },
  'pilgrim-monk': {
    id: 'dharma-blessing',
    name: 'ศีลบารมี',
    description: 'ฟื้นฟูพันธมิตรที่บาดเจ็บที่สุด 28% HP สูงสุด',
    effect: 'heal-lowest-ally',
    healPercent: 0.28,
  },
}

export interface SkillOutcome {
  targetId: string
  damage?: number
  healing?: number
  defeated: boolean
}

export interface SkillResolution {
  logLines: string[]
  outcomes: SkillOutcome[]
}

function livingAllies(allies: Combatant[]): Combatant[] {
  return allies.filter((unit) => unit.hp > 0)
}

function livingEnemies(enemies: Combatant[]): Combatant[] {
  return enemies.filter((unit) => unit.hp > 0)
}

type SkillResolver<S extends SkillDefinition = SkillDefinition> = (
  skill: S,
  actor: Combatant,
  target: Combatant,
  allies: Combatant[],
  enemies: Combatant[],
) => SkillResolution

const resolveHealLowestAlly: SkillResolver<Extract<SkillDefinition, { effect: 'heal-lowest-ally' }>> = (
  skill,
  actor,
  _target,
  allies,
) => {
  const healTargets = livingAllies(allies)
  if (healTargets.length === 0) {
    return { logLines: [`${actor.name} ไม่มีพันธมิตรที่จะรักษา`], outcomes: [] }
  }
  const lowest = healTargets.reduce((best, unit) => (unit.hp / unit.maxHp < best.hp / best.maxHp ? unit : best))
  const missing = lowest.maxHp - lowest.hp
  const amount = Math.min(missing, Math.floor(lowest.maxHp * skill.healPercent))
  return {
    logLines: [`${actor.name} ใช้ ${skill.name} ฟื้นฟู ${lowest.name} +${amount} HP`],
    outcomes: [{ targetId: lowest.id, healing: amount, defeated: false }],
  }
}

const resolveHitsAllEnemies: SkillResolver<Extract<SkillDefinition, { effect: 'hits-all-enemies' }>> = (
  skill,
  actor,
  _target,
  _allies,
  enemies,
) => {
  const targets = livingEnemies(enemies)
  const outcomes: SkillOutcome[] = []
  const logLines = [`${actor.name} ใช้ ${skill.name}!`]
  for (const enemy of targets) {
    const raw = calcPhysicalDamage(actor.atk, enemy.def, skill.power)
    const damage = applyDefense(raw, enemy.defending)
    outcomes.push({ targetId: enemy.id, damage, defeated: enemy.hp - damage <= 0 })
    logLines.push(`${enemy.name} รับดาเมจ ${damage}`)
  }
  return { logLines, outcomes }
}

const resolveSingleTarget: SkillResolver<Extract<SkillDefinition, { effect: 'single-target' }>> = (
  skill,
  actor,
  target,
) => {
  const raw = calcPhysicalDamage(actor.atk, target.def, skill.power)
  const damage = applyDefense(raw, target.defending)
  return {
    logLines: [`${actor.name} ใช้ ${skill.name} ใส่ ${target.name} ดาเมจ ${damage}`],
    outcomes: [{ targetId: target.id, damage, defeated: target.hp - damage <= 0 }],
  }
}

/** สวิตช์ตาม skill.effect — เพิ่ม effect ใหม่ใน union ด้านบนแล้ว TypeScript จะบังคับให้เพิ่ม resolver ที่นี่ด้วย */
const RESOLVERS: { [E in SkillDefinition['effect']]: SkillResolver<Extract<SkillDefinition, { effect: E }>> } = {
  'heal-lowest-ally': resolveHealLowestAlly,
  'hits-all-enemies': resolveHitsAllEnemies,
  'single-target': resolveSingleTarget,
}

export function resolveSkill(
  actor: Combatant,
  target: Combatant,
  allies: Combatant[],
  enemies: Combatant[],
): SkillResolution {
  const skill = actor.characterId ? CHARACTER_SKILLS[actor.characterId] : undefined
  if (!skill) {
    return { logLines: [`${actor.name} ไม่มีท่าไม้ตาย`], outcomes: [] }
  }

  const resolve = RESOLVERS[skill.effect] as SkillResolver
  return resolve(skill, actor, target, allies, enemies)
}

export function getSkillForCharacter(characterId: string): SkillDefinition | undefined {
  return CHARACTER_SKILLS[characterId]
}
