import type { PlayerProgress } from '../../types/player'

export function hasFlag(progress: PlayerProgress, key: string): boolean {
  return Boolean(progress.flags[key])
}

export function isNpcDefeated(progress: PlayerProgress, npcId: string): boolean {
  return progress.defeatedNpcIds.includes(npcId)
}

export function canShowNode(
  progress: PlayerProgress,
  node: { requiresFlag?: string; hideIfFlag?: string },
): boolean {
  if (node.hideIfFlag && hasFlag(progress, node.hideIfFlag)) return false
  if (!node.requiresFlag) return true
  return hasFlag(progress, node.requiresFlag)
}

export function canShowChoice(
  progress: PlayerProgress,
  choice: { requiresFlag?: string; hideIfFlag?: string },
): boolean {
  if (choice.hideIfFlag && hasFlag(progress, choice.hideIfFlag)) return false
  if (choice.requiresFlag && !hasFlag(progress, choice.requiresFlag)) return false
  return true
}
