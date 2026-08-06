import { describe, expect, test } from 'vitest'
import { canShowChoice, canShowNode, hasFlag, isNpcDefeated } from './conditions'
import { EMPTY_PROGRESS, type PlayerProgress } from '../../types/player'

function withFlags(...keys: string[]): PlayerProgress {
  return { ...EMPTY_PROGRESS, flags: Object.fromEntries(keys.map((key) => [key, true])) }
}

describe('hasFlag', () => {
  test('false when the flag was never set', () => {
    expect(hasFlag(EMPTY_PROGRESS, 'met-npc')).toBe(false)
  })

  test('true only for a flag explicitly set truthy', () => {
    expect(hasFlag(withFlags('met-npc'), 'met-npc')).toBe(true)
    expect(hasFlag(withFlags('met-npc'), 'other-flag')).toBe(false)
  })
})

describe('isNpcDefeated', () => {
  test('checks membership in defeatedNpcIds', () => {
    const progress = { ...EMPTY_PROGRESS, defeatedNpcIds: ['demon-captain'] }
    expect(isNpcDefeated(progress, 'demon-captain')).toBe(true)
    expect(isNpcDefeated(progress, 'shadow-soldier')).toBe(false)
  })
})

describe('canShowNode', () => {
  test('shows a node with no gate at all', () => {
    expect(canShowNode(EMPTY_PROGRESS, {})).toBe(true)
  })

  test('requiresFlag hides the node until the flag is set', () => {
    const node = { requiresFlag: 'act-2-started' }
    expect(canShowNode(EMPTY_PROGRESS, node)).toBe(false)
    expect(canShowNode(withFlags('act-2-started'), node)).toBe(true)
  })

  test('hideIfFlag hides the node once the flag is set, regardless of requiresFlag', () => {
    const node = { hideIfFlag: 'quest-done' }
    expect(canShowNode(EMPTY_PROGRESS, node)).toBe(true)
    expect(canShowNode(withFlags('quest-done'), node)).toBe(false)
  })

  test('hideIfFlag wins over requiresFlag when both flags are set', () => {
    const node = { requiresFlag: 'act-2-started', hideIfFlag: 'quest-done' }
    expect(canShowNode(withFlags('act-2-started', 'quest-done'), node)).toBe(false)
  })
})

describe('canShowChoice', () => {
  test('same gating rules as canShowNode', () => {
    const choice = { requiresFlag: 'has-item' }
    expect(canShowChoice(EMPTY_PROGRESS, choice)).toBe(false)
    expect(canShowChoice(withFlags('has-item'), choice)).toBe(true)
  })
})
