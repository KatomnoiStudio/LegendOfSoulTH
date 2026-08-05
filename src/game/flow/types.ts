import type { PlayerPosition } from '../exploration/types'

export type GameMode =
  | 'lobby'
  | 'exploration'
  | 'dialogue'
  | 'battle_transition'
  | 'battle'
  | 'battle_result'

export interface BattleContext {
  source: 'npc' | 'stage_select'
  stageId: string
  npcId?: string
  returnMapId?: string
  returnPosition?: PlayerPosition
  opponentName?: string
}

export interface GameFlowState {
  mode: GameMode
  mapId: string | null
  explorationPosition: PlayerPosition | null
  dialogueNpcId: string | null
  battleContext: BattleContext | null
  transitionLabel: string | null
  lastBattleResult: 'win' | 'lose' | null
}

export const INITIAL_FLOW_STATE: GameFlowState = {
  mode: 'lobby',
  mapId: null,
  explorationPosition: null,
  dialogueNpcId: null,
  battleContext: null,
  transitionLabel: null,
  lastBattleResult: null,
}
