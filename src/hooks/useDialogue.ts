import { useCallback, useMemo, useState } from 'react'
import { applyDialogueAction } from '../game/dialogue/actions'
import {
  advanceDialogue,
  chooseDialogue,
  getCurrentNode,
  getVisibleChoices,
  startDialogue,
} from '../game/dialogue/engine'
import { resolveStartNode, getDialogue } from '../game/dialogue/dialogues'
import type { DialogueAction, DialogueSession } from '../game/dialogue/types'
import { getNpc } from '../game/npc/npcs'
import type { PlayerProgress } from '../types/player'

export function useDialogue(progress: PlayerProgress) {
  const [session, setSession] = useState<DialogueSession | null>(null)

  const openDialogue = useCallback((dialogueId: string) => {
    const dialogue = getDialogue(dialogueId)
    if (!dialogue) return
    const nodeId = resolveStartNode(dialogue, progress.flags)
    setSession(startDialogue(dialogueId, progress, nodeId))
  }, [progress.flags])

  const closeDialogue = useCallback(() => setSession(null), [])

  const currentNode = useMemo(
    () => (session ? getCurrentNode(session, progress) : null),
    [session, progress],
  )

  const choices = useMemo(
    () => (session ? getVisibleChoices(session, progress) : []),
    [session, progress],
  )

  const speaker = currentNode ? getNpc(currentNode.speakerId) : null

  const handleAdvance = useCallback((): DialogueAction | null => {
    if (!session) return null
    const result = advanceDialogue(session, progress)
    setSession(result.session)
    return result.action ?? null
  }, [session, progress])

  const handleChoice = useCallback((choiceId: string): DialogueAction | null => {
    if (!session) return null
    const result = chooseDialogue(session, choiceId, progress)
    setSession(result.session)
    return result.action ?? null
  }, [session, progress])

  return {
    session,
    currentNode,
    choices,
    speaker,
    openDialogue,
    closeDialogue,
    handleAdvance,
    handleChoice,
    applyActionLocally: applyDialogueAction,
  }
}
