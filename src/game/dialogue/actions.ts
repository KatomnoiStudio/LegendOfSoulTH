import type { DialogueAction } from './types'
import type { PlayerProgress } from '../../types/player'

export function applyDialogueAction(
  progress: PlayerProgress,
  action: DialogueAction,
): PlayerProgress {
  if (action.type === 'set_flag') {
    return {
      ...progress,
      flags: { ...progress.flags, [action.key]: action.value },
    }
  }
  return progress
}

export function markNpcDefeated(progress: PlayerProgress, npcId: string): PlayerProgress {
  if (progress.defeatedNpcIds.includes(npcId)) return progress
  return {
    ...progress,
    defeatedNpcIds: [...progress.defeatedNpcIds, npcId],
    flags: {
      ...progress.flags,
      [`defeated_${npcId.replace(/^npc-/, '')}`]: true,
    },
  }
}

export function appendBattleHistory(
  progress: PlayerProgress,
  record: PlayerProgress['battleHistory'][number],
): PlayerProgress {
  return {
    ...progress,
    battleHistory: [record, ...progress.battleHistory].slice(0, 50),
  }
}
