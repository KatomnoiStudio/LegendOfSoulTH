import type { BattleResult } from '../battle/types'
import type { PlayerPosition } from '../exploration/types'
import { INITIAL_FLOW_STATE, type BattleContext, type GameFlowState, type GameMode } from './types'

export function enterExploration(
  state: GameFlowState,
  mapId: string,
  position?: PlayerPosition,
): GameFlowState {
  return {
    ...state,
    mode: 'exploration',
    mapId,
    explorationPosition: position ?? state.explorationPosition,
    dialogueNpcId: null,
    battleContext: null,
    transitionLabel: null,
    lastBattleResult: null,
  }
}

export function updateExplorationPosition(
  state: GameFlowState,
  position: PlayerPosition,
): GameFlowState {
  return { ...state, explorationPosition: position }
}

export function openDialogue(state: GameFlowState, npcId: string): GameFlowState {
  if (state.mode !== 'exploration') return state
  return { ...state, mode: 'dialogue', dialogueNpcId: npcId }
}

export function closeDialogue(state: GameFlowState): GameFlowState {
  return { ...state, mode: 'exploration', dialogueNpcId: null }
}

export function beginBattleTransition(
  state: GameFlowState,
  context: BattleContext,
  label: string,
): GameFlowState {
  return {
    ...state,
    mode: 'battle_transition',
    battleContext: {
      ...context,
      returnMapId: context.returnMapId ?? state.mapId ?? undefined,
      returnPosition: context.returnPosition ?? state.explorationPosition ?? undefined,
    },
    transitionLabel: label,
    dialogueNpcId: null,
  }
}

export function enterBattle(state: GameFlowState): GameFlowState {
  if (!state.battleContext) return state
  return { ...state, mode: 'battle', transitionLabel: null }
}

export function finishBattle(
  state: GameFlowState,
  result: BattleResult,
): GameFlowState {
  return {
    ...state,
    mode: 'battle_result',
    lastBattleResult: result.outcome === 'victory' ? 'win' : 'lose',
  }
}

export function returnToExploration(
  state: GameFlowState,
  position?: PlayerPosition,
): GameFlowState {
  const nudged = position ?? state.battleContext?.returnPosition ?? state.explorationPosition
  return {
    ...state,
    mode: 'exploration',
    mapId: state.battleContext?.returnMapId ?? state.mapId,
    explorationPosition: nudged,
    battleContext: null,
    transitionLabel: null,
    dialogueNpcId: null,
  }
}

export function exitToLobby(_state: GameFlowState): GameFlowState {
  return { ...INITIAL_FLOW_STATE }
}

export function canMove(state: GameFlowState): boolean {
  return state.mode === 'exploration'
}

export function isInputLocked(state: GameFlowState): boolean {
  return state.mode === 'battle_transition' || state.mode === 'battle' || state.mode === 'battle_result'
}

export function getMode(state: GameFlowState): GameMode {
  return state.mode
}
