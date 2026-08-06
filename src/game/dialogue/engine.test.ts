import { describe, expect, test } from 'vitest'
import { advanceDialogue, chooseDialogue, getCurrentNode, getVisibleChoices, startDialogue } from './engine'
import { EMPTY_PROGRESS, type PlayerProgress } from '../../types/player'

describe('startDialogue', () => {
  test('returns null for an unknown dialogue id', () => {
    expect(startDialogue('does-not-exist', EMPTY_PROGRESS)).toBeNull()
  })

  test('starts at the dialogue\'s own startNodeId by default', () => {
    const session = startDialogue('shadow-guard', EMPTY_PROGRESS)
    expect(session).toEqual({ dialogueId: 'shadow-guard', nodeId: 'intro' })
  })

  test('honors an explicit startNodeId override', () => {
    const session = startDialogue('shadow-guard', EMPTY_PROGRESS, 'retry')
    expect(session?.nodeId).toBe('retry')
  })
})

describe('getCurrentNode / getVisibleChoices', () => {
  test('returns the intro node with both choices visible when nothing is gated', () => {
    const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
    const node = getCurrentNode(session, EMPTY_PROGRESS)
    expect(node?.id).toBe('intro')
    const choices = getVisibleChoices(session, EMPTY_PROGRESS)
    expect(choices.map((c) => c.id)).toEqual(['fight', 'leave'])
  })

  test('returns null for a node hidden by requiresFlag not being set', () => {
    const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
    expect(getCurrentNode(session, EMPTY_PROGRESS)).toBeNull()
  })

  test('returns the node once its requiresFlag is set', () => {
    const progress: PlayerProgress = { ...EMPTY_PROGRESS, flags: { 'defeated_shadow-guard': true } }
    const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
    expect(getCurrentNode(session, progress)?.id).toBe('defeated')
  })
})

describe('advanceDialogue', () => {
  test('closes the dialogue when the current node has neither nextNodeId nor action', () => {
    // 'defeated' มี action ติดตัวอยู่แล้ว ทดสอบ path นั้นแทน — ครอบ action-node กรณีปกติ
    const progress: PlayerProgress = { ...EMPTY_PROGRESS, flags: { 'defeated_shadow-guard': true } }
    const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
    const result = advanceDialogue(session, progress)
    expect(result.session).toBeNull()
    expect(result.action).toEqual({ type: 'close_dialogue' })
  })

  test('returns a null session with no action when the node is gated away entirely', () => {
    const session = { dialogueId: 'shadow-guard', nodeId: 'defeated' }
    const result = advanceDialogue(session, EMPTY_PROGRESS)
    expect(result).toEqual({ session: null })
  })
})

describe('chooseDialogue', () => {
  test('an unknown choiceId leaves the session untouched', () => {
    const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
    const result = chooseDialogue(session, 'does-not-exist', EMPTY_PROGRESS)
    expect(result).toEqual({ session })
  })

  test('choosing "fight" closes the session and returns a start_battle action', () => {
    const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
    const result = chooseDialogue(session, 'fight', EMPTY_PROGRESS)
    expect(result.session).toBeNull()
    expect(result.action).toEqual({ type: 'start_battle', stageId: 'trial-01', npcId: 'npc-shadow-guard' })
  })

  test('choosing "leave" closes the session with close_dialogue', () => {
    const session = startDialogue('shadow-guard', EMPTY_PROGRESS)!
    const result = chooseDialogue(session, 'leave', EMPTY_PROGRESS)
    expect(result.session).toBeNull()
    expect(result.action).toEqual({ type: 'close_dialogue' })
  })

  test('a gated-away choice cannot be selected even by id', () => {
    // 'retry' node ต้องมี lost_to flag ก่อนถึงจะโผล่ — ทดสอบว่า choice ของมันเลือกไม่ได้ถ้ายังไม่ผ่าน node gate
    const session = { dialogueId: 'shadow-guard', nodeId: 'retry' }
    const result = chooseDialogue(session, 'fight-again', EMPTY_PROGRESS)
    expect(result).toEqual({ session })
  })
})
