import type { RealtimeSkillKit } from '../../realtimeBattle/skills'
import { CELESTIAL_ARCHER_KIT } from './celestialArcher'
import { ERLANG_SHEN_KIT } from './erlangShen'
import { HANUMAN_KIT } from './hanuman'
import { MONKEY_KING_KIT } from './monkeyKing'
import { NEZHA_WARDEN_KIT } from './nezhaWarden'
import { PIG_WARRIOR_KIT } from './pigWarrior'
import { SAND_SAGE_KIT } from './sandSage'
import { BATCH_01_CHARACTER_IDS } from '../heroProductionBatch'

/** ทะเบียน kit ของ Production Batch 01 + ฮีโร่อื่นที่มี kit */
export const HERO_SKILL_KITS: Record<string, RealtimeSkillKit> = {
  'monkey-king': MONKEY_KING_KIT,
  'pig-warrior': PIG_WARRIOR_KIT,
  'celestial-archer': CELESTIAL_ARCHER_KIT,
  'nezha-warden': NEZHA_WARDEN_KIT,
  'sand-sage': SAND_SAGE_KIT,
  'spear-warrior': ERLANG_SHEN_KIT,
  hanuman: HANUMAN_KIT,
}

export function getHeroSkillKit(characterId: string | undefined): RealtimeSkillKit | undefined {
  if (!characterId) return undefined
  return HERO_SKILL_KITS[characterId]
}

export function getBatch01Kits(): RealtimeSkillKit[] {
  return BATCH_01_CHARACTER_IDS.map((id) => HERO_SKILL_KITS[id]).filter(
    (kit): kit is RealtimeSkillKit => kit !== undefined,
  )
}

export {
  MONKEY_KING_KIT,
  PIG_WARRIOR_KIT,
  CELESTIAL_ARCHER_KIT,
  NEZHA_WARDEN_KIT,
  SAND_SAGE_KIT,
  ERLANG_SHEN_KIT,
  HANUMAN_KIT,
}
