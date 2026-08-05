import { getCharacter } from '../../game/characters'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import { EntitySprite } from './EntitySprite'

/**
 * ตัวละครของผู้เล่นในห้องต่อสู้
 *
 * แยกไฟล์จากศัตรูเพราะทั้งสองฝ่ายจะมีของประดับคนละแบบในงานถัดไป
 * (ผู้เล่นมีวงคูลดาวน์/เอฟเฟกต์ dash, ศัตรูมีหลอดเลือดเหนือหัว)
 * ตอนนี้ทั้งคู่ยังใช้ตัววาดร่วมกันคือ EntitySprite
 */
export function PlayerBattleSprite({ runtime }: { runtime: RealtimeBattleRuntime }) {
  const state = runtime.getState()
  const character = getCharacter(state.player.characterId ?? null)
  if (!character) return null

  return (
    <EntitySprite
      runtime={runtime}
      entityId={state.player.id}
      kind={character.model.kind}
      accent={character.model.accent}
    />
  )
}
