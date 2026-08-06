import { useCallback, useEffect, useState } from 'react'
import type { BattleResult } from '../game/battle/types'
import {
  appendBattleHistory,
  applyDialogueAction,
  markNpcDefeated,
} from '../game/dialogue/actions'
import { nudgeAwayFrom } from '../game/exploration/movement'
import { getMap } from '../game/exploration/maps'
import {
  beginBattleTransition,
  closeDialogue,
  enterBattle,
  enterExploration,
  exitToLobby,
  openDialogue,
  returnToExploration,
  updateExplorationPosition,
} from '../game/flow/GameFlowController'
import { INITIAL_FLOW_STATE, type GameFlowState } from '../game/flow/types'
import { getNpc } from '../game/npc/npcs'
import type { Player } from '../types/player'
import type { DialogueAction } from '../game/dialogue/types'

interface UseGameFlowOptions {
  player: Player
  onPlayerChange: (next: Player) => Promise<void>
  onExit: () => void
}

export function useGameFlow({ player, onPlayerChange, onExit }: UseGameFlowOptions) {
  const [flow, setFlow] = useState<GameFlowState>(INITIAL_FLOW_STATE)

  const startExploration = useCallback((mapId = 'village-01') => {
    const map = getMap(mapId)
    setFlow(enterExploration(INITIAL_FLOW_STATE, mapId, map?.spawn))
  }, [])

  const handleDialogueAction = useCallback(
    async (
      action: DialogueAction,
      _npcId: string | null,
      returnPosition?: import('../game/exploration/types').PlayerPosition,
    ) => {
      if (action.type === 'close_dialogue') {
        setFlow((state) => closeDialogue(state))
        return
      }

      if (action.type === 'set_flag') {
        const nextPlayer = {
          ...player,
          progress: applyDialogueAction(player.progress, action),
        }
        await onPlayerChange(nextPlayer)
        setFlow((state) => closeDialogue(state))
        return
      }

      if (action.type === 'start_battle') {
        const npc = action.npcId ? getNpc(action.npcId) : null
        setFlow((state) => {
          const withPosition = returnPosition
            ? updateExplorationPosition(state, returnPosition)
            : state
          return beginBattleTransition(
            withPosition,
            {
              source: 'npc',
              stageId: action.stageId,
              npcId: action.npcId,
              opponentName: npc?.name,
              returnPosition,
            },
            npc?.name ?? 'ศัตรู',
          )
        })
      }
    },
    [onPlayerChange, player],
  )

  const onTransitionComplete = useCallback(() => {
    setFlow((state) => enterBattle(state))
  }, [])

  const onBattleComplete = useCallback(
    async (result: BattleResult) => {
      setFlow((state) => {
        const npcId = state.battleContext?.npcId
        const opponent = state.battleContext?.opponentName ?? result.stageName

        let progress = appendBattleHistory(player.progress, {
          id: `battle-${Date.now()}`,
          opponent,
          result: result.outcome === 'victory' ? 'win' : 'lose',
          finishedAt: result.finishedAt,
          turns: result.turns,
        })

        if (npcId) {
          const dialogueId = getNpc(npcId)?.dialogueId
          if (result.outcome === 'victory') {
            progress = markNpcDefeated(progress, npcId)
            progress = {
              ...progress,
              flags: { ...progress.flags, [`trial_cleared_${result.stageId}`]: true },
            }
          } else if (dialogueId) {
            progress = {
              ...progress,
              flags: { ...progress.flags, [`lost_to_${dialogueId}`]: true },
            }
          }
        }

        void onPlayerChange({ ...player, progress })

        /*
          หลังจบการต่อสู้กลับสำรวจทันที — เดิมค้างที่ mode:'battle' ทำให้ห้องไม่ปิด
          ผู้เล่นต้องกด "ออก" เอง (ดูเหมือนเกมค้าง) การเดินต่อหา NPC/ด่านถัดไปทำไม่ได้
        */
        const npc = npcId ? getNpc(npcId) : null
        let position = state.battleContext?.returnPosition ?? state.explorationPosition
        if (position && npc) {
          position = nudgeAwayFrom(position, npc.position, npc.interactionRadius + 24)
        }
        return returnToExploration(
          { ...state, lastBattleResult: result.outcome === 'victory' ? 'win' : 'lose' },
          position ?? undefined,
        )
      })
    },
    [onPlayerChange, player],
  )

  const onBattleExit = useCallback(() => {
    setFlow((state) => {
      const npc = state.battleContext?.npcId ? getNpc(state.battleContext.npcId) : null
      let position = state.battleContext?.returnPosition ?? state.explorationPosition
      if (position && npc) {
        position = nudgeAwayFrom(position, npc.position, npc.interactionRadius + 24)
      }
      return returnToExploration(state, position ?? undefined)
    })
  }, [])

  const openNpcDialogue = useCallback((npcId: string) => {
    setFlow((state) => openDialogue(state, npcId))
  }, [])

  const closeNpcDialogue = useCallback(() => {
    setFlow((state) => closeDialogue(state))
  }, [])

  const syncPosition = useCallback((position: import('../game/exploration/types').PlayerPosition) => {
    setFlow((state) => updateExplorationPosition(state, position))
  }, [])

  const leaveExploration = useCallback(() => {
    setFlow(exitToLobby(INITIAL_FLOW_STATE))
    onExit()
  }, [onExit])

  useEffect(() => {
    if (flow.mode !== 'battle_transition') return
    const timer = window.setTimeout(onTransitionComplete, 1200)
    return () => window.clearTimeout(timer)
  }, [flow.mode, onTransitionComplete])

  return {
    flow,
    startExploration,
    handleDialogueAction,
    onBattleComplete,
    onBattleExit,
    openNpcDialogue,
    closeNpcDialogue,
    leaveExploration,
    syncPosition,
  }
}
