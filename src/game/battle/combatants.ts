import { getCharacter, type Character } from '../characters'
import type { OwnedCharacter } from '../../types/player'
import type { TeamSlots } from '../team'
import { calcMaxHp } from './formulas'
import { getEnemyTemplate, getStage } from './stages'
import type { Combatant } from './types'

let combatantCounter = 0

function nextId(prefix: string): string {
  combatantCounter += 1
  return `${prefix}-${combatantCounter}`
}

function characterToCombatant(
  character: Character,
  owned: OwnedCharacter,
  slot: number,
  isAlly: boolean,
): Combatant {
  const maxHp = calcMaxHp(owned.level, character.stats.def)
  return {
    id: nextId(isAlly ? 'ally' : 'enemy'),
    name: character.name,
    spriteUrl: character.model.spriteUrl,
    accent: character.model.accent,
    isAlly,
    slot,
    atk: character.stats.atk,
    def: character.stats.def,
    spd: character.stats.spd,
    hp: maxHp,
    maxHp,
    defending: false,
    characterId: character.id,
  }
}

export function createAlliesFromTeam(
  teamSlots: TeamSlots,
  ownedCharacters: OwnedCharacter[],
): Combatant[] {
  const ownedMap = new Map(ownedCharacters.map((entry) => [entry.characterId, entry]))
  const allies: Combatant[] = []

  teamSlots.forEach((characterId, slot) => {
    if (!characterId) return
    const owned = ownedMap.get(characterId)
    const character = getCharacter(characterId)
    if (!owned || !character) return
    allies.push(characterToCombatant(character, owned, slot, true))
  })

  return allies
}

export function createEnemiesFromStage(stageId: string): Combatant[] {
  const stage = getStage(stageId)
  if (!stage) return []

  return stage.enemies.flatMap(({ templateId, slot }) => {
    const template = getEnemyTemplate(templateId)
    if (!template) return []
    return [
      {
        id: nextId('enemy'),
        name: template.name,
        spriteUrl: template.spriteUrl,
        accent: template.accent,
        isAlly: false,
        slot,
        atk: template.atk,
        def: template.def,
        spd: template.spd,
        hp: template.hp,
        maxHp: template.hp,
        defending: false,
        enemyId: template.id,
      },
    ]
  })
}

export function getLivingUnits(snapshot: { allies: Combatant[]; enemies: Combatant[] }): Combatant[] {
  return [...snapshot.allies, ...snapshot.enemies].filter((unit) => unit.hp > 0)
}

export function findCombatant(
  snapshot: { allies: Combatant[]; enemies: Combatant[] },
  id: string,
): Combatant | undefined {
  return getLivingUnits(snapshot).find((unit) => unit.id === id)
    ?? [...snapshot.allies, ...snapshot.enemies].find((unit) => unit.id === id)
}
