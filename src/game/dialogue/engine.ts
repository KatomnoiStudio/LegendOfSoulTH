import { canShowChoice, canShowNode } from './conditions'
import { getDialogue } from './dialogues'
import type { DialogueAction, DialogueChoice, DialogueNode, DialogueSession } from './types'
import type { PlayerProgress } from '../../types/player'

export function startDialogue(
  dialogueId: string,
  _progress: PlayerProgress,
  startNodeId?: string,
): DialogueSession | null {
  const dialogue = getDialogue(dialogueId)
  if (!dialogue) return null
  const nodeId = startNodeId ?? dialogue.startNodeId
  return { dialogueId, nodeId }
}

export function getCurrentNode(
  session: DialogueSession,
  progress: PlayerProgress,
): DialogueNode | null {
  const dialogue = getDialogue(session.dialogueId)
  if (!dialogue) return null
  const node = dialogue.nodes[session.nodeId]
  if (!node || !canShowNode(progress, node)) return null
  return node
}

export function getVisibleChoices(
  session: DialogueSession,
  progress: PlayerProgress,
): DialogueChoice[] {
  const node = getCurrentNode(session, progress)
  if (!node?.choices) return []
  return node.choices.filter((choice) => canShowChoice(progress, choice))
}

export function advanceDialogue(
  session: DialogueSession,
  progress: PlayerProgress,
): { session: DialogueSession | null; action?: DialogueAction } {
  const node = getCurrentNode(session, progress)
  if (!node) return { session: null }

  if (node.nextNodeId) {
    return { session: { ...session, nodeId: node.nextNodeId } }
  }

  if (node.action) {
    return { session: null, action: node.action }
  }

  return { session: null, action: { type: 'close_dialogue' } }
}

export function chooseDialogue(
  session: DialogueSession,
  choiceId: string,
  progress: PlayerProgress,
): { session: DialogueSession | null; action?: DialogueAction } {
  const choices = getVisibleChoices(session, progress)
  const choice = choices.find((entry) => entry.id === choiceId)
  if (!choice) return { session }

  if (choice.nextNodeId) {
    return { session: { ...session, nodeId: choice.nextNodeId }, action: choice.action }
  }

  return { session: null, action: choice.action ?? { type: 'close_dialogue' } }
}
