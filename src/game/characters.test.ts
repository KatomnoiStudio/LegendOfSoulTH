import { describe, expect, it } from 'vitest'
import { ROSTER, SPEAR_WARRIOR_CHARACTER_ID } from './characters'
import { ENEMY_TEMPLATES } from './realtimeBattle/stageConfig'

describe('Erlang-only character roster', () => {
  it('exposes Erlang Shen as the only playable model', () => {
    expect(ROSTER.map((character) => character.id)).toEqual([SPEAR_WARRIOR_CHARACTER_ID])
    expect(ROSTER.every((character) => character.model.kind === 'spear-warrior')).toBe(true)
  })

  it('does not request deleted character models for battle enemies', () => {
    expect(
      Object.values(ENEMY_TEMPLATES).every(({ spriteKind }) => spriteKind === 'spear-warrior'),
    ).toBe(true)
  })
})
