import { useCallback, useEffect } from 'react'
import { BattleScene } from '../BattleScene/BattleScene'
import { BattleTransition } from '../BattleTransition/BattleTransition'
import { DialogueBox } from '../DialogueBox/DialogueBox'
import { ExplorationControls } from '../ExplorationControls/ExplorationControls'
import { ExplorationScene, getPlayerSpriteUrl } from '../ExplorationScene/ExplorationScene'
import { getNpc } from '../../game/npc/npcs'
import { resolveStartNode, getDialogue } from '../../game/dialogue/dialogues'
import {
  advanceDialogue,
  chooseDialogue,
  getCurrentNode,
  getVisibleChoices,
  startDialogue,
} from '../../game/dialogue/engine'
import { useExploration } from '../../hooks/useExploration'
import { useGameFlow } from '../../hooks/useGameFlow'
import { useBattle } from '../../hooks/useBattle'
import type { Player } from '../../types/player'
import { useMemo, useState } from 'react'
import type { DialogueSession } from '../../game/dialogue/types'
import type { DialogueAction } from '../../game/dialogue/types'

interface GameExplorationSessionProps {
  player: Player
  onPlayerChange: (next: Player) => Promise<void>
  onExit: () => void
}

function BattleLayer({
  player,
  stageId,
  onComplete,
  onExit,
}: {
  player: Player
  stageId: string
  onComplete: (result: import('../../game/battle/types').BattleResult) => void
  onExit: () => void
}) {
  const battle = useBattle({ player, stageId, onComplete })
  if (!battle.snapshot) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 600, display: 'grid', placeItems: 'center', color: '#fff' }}>
        ไม่สามารถเริ่มการต่อสู้ได้
        <button type="button" onClick={onExit}>กลับ</button>
      </div>
    )
  }

  return (
    <BattleScene
      snapshot={battle.snapshot}
      activeUnit={battle.activeUnit}
      pendingKind={battle.pendingKind}
      validTargetIds={battle.validTargetIds}
      skill={battle.skill}
      onAttack={() => battle.selectAction('attack')}
      onDefend={() => battle.selectAction('defend')}
      onSkill={() => battle.selectAction('skill')}
      onSelectTarget={battle.selectTarget}
      onCancelTarget={battle.cancelTarget}
      onExit={onExit}
    />
  )
}

export function GameExplorationSession({
  player,
  onPlayerChange,
  onExit,
}: GameExplorationSessionProps) {
  const gameFlow = useGameFlow({ player, onPlayerChange, onExit })
  const mapId = gameFlow.flow.mapId ?? 'village-01'
  const movementLocked = gameFlow.flow.mode !== 'exploration'

  const { map, npcs, state, setMovementVector } = useExploration({
    mapId,
    initialPosition: gameFlow.flow.explorationPosition ?? undefined,
    movementLocked,
  })

  const [dialogueSession, setDialogueSession] = useState<DialogueSession | null>(null)

  useEffect(() => {
    gameFlow.startExploration(mapId)
  }, [gameFlow.startExploration, mapId])

  useEffect(() => {
    if (gameFlow.flow.mode === 'dialogue' && gameFlow.flow.dialogueNpcId) {
      const npc = getNpc(gameFlow.flow.dialogueNpcId)
      if (!npc) return
      const dialogue = getDialogue(npc.dialogueId)
      if (!dialogue) return
      const nodeId = resolveStartNode(dialogue, player.progress.flags)
      setDialogueSession(startDialogue(npc.dialogueId, player.progress, nodeId))
      return
    }
    setDialogueSession(null)
  }, [gameFlow.flow.dialogueNpcId, gameFlow.flow.mode, player.progress.flags])

  const currentNode = useMemo(
    () => (dialogueSession ? getCurrentNode(dialogueSession, player.progress) : null),
    [dialogueSession, player.progress],
  )

  const choices = useMemo(
    () => (dialogueSession ? getVisibleChoices(dialogueSession, player.progress) : []),
    [dialogueSession, player.progress],
  )

  const speaker = currentNode ? getNpc(currentNode.speakerId) : null

  const dispatchAction = useCallback(
    (action: DialogueAction | null | undefined) => {
      if (!action) return
      if (action.type === 'start_battle') {
        void gameFlow.handleDialogueAction(action, gameFlow.flow.dialogueNpcId, state.playerPosition)
        return
      }
      void gameFlow.handleDialogueAction(action, gameFlow.flow.dialogueNpcId)
    },
    [gameFlow, state.playerPosition],
  )

  const onAdvanceDialogue = useCallback(() => {
    if (!dialogueSession) return
    const result = advanceDialogue(dialogueSession, player.progress)
    setDialogueSession(result.session)
    dispatchAction(result.action)
  }, [dialogueSession, dispatchAction, player.progress])

  const onChoose = useCallback(
    (choiceId: string) => {
      if (!dialogueSession) return
      const result = chooseDialogue(dialogueSession, choiceId, player.progress)
      setDialogueSession(result.session)
      dispatchAction(result.action)
    },
    [dialogueSession, dispatchAction, player.progress],
  )

  const onTalk = useCallback(() => {
    if (!state.nearbyNpcId) return
    gameFlow.openNpcDialogue(state.nearbyNpcId)
  }, [gameFlow, state.nearbyNpcId])

  if (!map) return null

  return (
    <>
      <ExplorationScene
        map={map}
        state={state}
        npcs={npcs}
        playerSpriteUrl={getPlayerSpriteUrl(player.teamSlots)}
        onExit={gameFlow.leaveExploration}
      />

      <ExplorationControls
        nearbyNpcId={state.nearbyNpcId}
        disabled={movementLocked}
        onMove={setMovementVector}
        onTalk={onTalk}
      />

      {gameFlow.flow.mode === 'dialogue' && currentNode ? (
        <DialogueBox
          speaker={speaker ?? null}
          text={currentNode.text}
          choices={choices}
          onAdvance={onAdvanceDialogue}
          onChoice={onChoose}
        />
      ) : null}

      {gameFlow.flow.mode === 'battle_transition' && gameFlow.flow.transitionLabel ? (
        <BattleTransition opponentName={gameFlow.flow.transitionLabel} />
      ) : null}

      {gameFlow.flow.mode === 'battle' && gameFlow.flow.battleContext ? (
        <BattleLayer
          player={player}
          stageId={gameFlow.flow.battleContext.stageId}
          onComplete={gameFlow.onBattleComplete}
          onExit={gameFlow.onBattleExit}
        />
      ) : null}
    </>
  )
}
