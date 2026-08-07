import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  collectCriticalTextureUrls,
  collectDeferredTextureUrls,
} from '../game/battleSpriteSequences'
import type { CharacterModelKind } from '../game/characters'
import { getCharacter } from '../game/characters'
import { reportError } from '../lib/errors/reportError'
import { preloadBattleTextures } from '../game/realtimeBattle/battleAssets'
import { InputSystem } from '../game/realtimeBattle/InputSystem'
import { startBattleLoop, type BattleLoopHandle } from '../game/realtimeBattle/RealtimeBattleLoop'
import { getEnemyTemplate, getRealtimeStage } from '../game/realtimeBattle/stageConfig'
import type { MovementInput } from '../game/realtimeBattle/playerInput'
import type { RealtimeBattleSnapshot } from '../game/realtimeBattle/types'
import type { SkillSlot } from '../game/realtimeBattle/skills'
import type { Player } from '../types/player'
import type { DungeonDefinition, DungeonResult } from '../game/dungeon/dungeonSchema'
import { DungeonOrchestrator } from '../game/dungeon/dungeonOrchestrator'

export type DungeonBattlePhase = 'loading' | 'error' | 'active' | 'stage_transition' | 'complete'

function collectArenaSpriteKinds(arenaId: string, player: Player): CharacterModelKind[] {
  const kinds = new Set<CharacterModelKind>()
  const leadId = player.teamSlots.find((id): id is string => id !== null) ?? null
  const lead = getCharacter(leadId)
  if (lead) kinds.add(lead.model.kind)
  const stage = getRealtimeStage(arenaId)
  for (const wave of stage?.waves ?? []) {
    for (const entry of wave.enemies) {
      const template = getEnemyTemplate(entry.templateId)
      if (template) kinds.add(template.spriteKind)
    }
  }
  return [...kinds]
}

export function useDungeonStageBattle({
  dungeon,
  player,
  onDungeonComplete,
}: {
  dungeon: DungeonDefinition
  player: Player
  onDungeonComplete: (result: DungeonResult) => void
}) {
  const [orchestrator, setOrchestrator] = useState<DungeonOrchestrator | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [phase, setPhase] = useState<DungeonBattlePhase>('loading')
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onDungeonComplete)
  onCompleteRef.current = onDungeonComplete
  const inputRef = useRef<InputSystem | null>(null)
  inputRef.current ??= new InputSystem()

  useEffect(() => {
    let cancelled = false
    let loop: BattleLoopHandle | null = null
    let detachKeyboard: (() => void) | null = null
    let orch: DungeonOrchestrator | null = null
    const input = inputRef.current ?? new InputSystem()

    const init = async () => {
      orch = new DungeonOrchestrator(dungeon, player)
      const stage = orch.getSnapshot().currentStage
      if (!stage) {
        setErrorMessage('ดันเจี้ยนไม่มีด่าน')
        setPhase('error')
        return
      }

      const kinds = collectArenaSpriteKinds(stage.arenaId, player)
      const arena = getRealtimeStage(stage.arenaId)
      const criticalUrls = collectCriticalTextureUrls(kinds)
      if (arena?.backgroundAsset) criticalUrls.push(arena.backgroundAsset)

      try {
        await preloadBattleTextures(criticalUrls)
        if (cancelled) return
        if (!orch.start()) {
          setErrorMessage('เริ่มด่านไม่ได้')
          setPhase('error')
          return
        }
        setOrchestrator(orch)
        setPhase('active')
        detachKeyboard = input.attachKeyboard()
        loop = startBattleLoop({
          step: (deltaMs) => {
            const rt = orch?.getRuntime()
            if (!rt) return
            rt.setMoveInput(input.getMoveVector())
            if (input.consumeAttack()) rt.requestAttack()
            const skillSlot = input.consumeSkill()
            if (skillSlot) rt.requestSkill(skillSlot)
            orch?.tick(deltaMs)
            const snap = orch?.getSnapshot()
            if (snap?.phase === 'dungeon_complete' || snap?.phase === 'dungeon_failed') {
              if (!completedRef.current && snap.result) {
                completedRef.current = true
                onCompleteRef.current(snap.result)
                setPhase('complete')
              }
            }
          },
        })
        preloadBattleTextures(collectDeferredTextureUrls(kinds)).catch((cause: unknown) => {
          reportError('BATTLE_DEFERRED_ASSET_FAIL', 'silent', cause)
        })
      } catch (cause: unknown) {
        if (cancelled) return
        reportError('BATTLE_INIT_FAIL', 'silent', cause)
        setErrorMessage('เตรียมดันเจี้ยนไม่สำเร็จ')
        setPhase('error')
      }
    }

    void init()

    return () => {
      cancelled = true
      loop?.stop()
      detachKeyboard?.()
      input.reset()
      orch?.dispose()
      setOrchestrator(null)
    }
  }, [dungeon, player])

  const subscribe = useCallback(
    (listener: () => void) => orchestrator?.getRuntime()?.subscribe(listener) ?? (() => {}),
    [orchestrator],
  )
  const getSnapshot = useCallback(
    (): RealtimeBattleSnapshot | null => orchestrator?.getRuntime()?.getSnapshot() ?? null,
    [orchestrator],
  )
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const stageSnapshot = orchestrator?.getSnapshot().stageSnapshot ?? null

  const requestExit = useCallback(() => {
    orchestrator?.getRuntime()?.requestExit()
  }, [orchestrator])

  const setJoystick = useCallback((input: MovementInput) => {
    inputRef.current?.setMovementInput(input)
  }, [])

  const pressAttack = useCallback(() => {
    inputRef.current?.pressAttack()
  }, [])

  const pressSkill = useCallback((slot: SkillSlot) => {
    inputRef.current?.pressSkill(slot)
  }, [])

  return {
    phase,
    errorMessage,
    runtime: orchestrator?.getRuntime() ?? null,
    snapshot,
    stageSnapshot,
    dungeonSnapshot: orchestrator?.getSnapshot() ?? null,
    requestExit,
    setJoystick,
    pressAttack,
    pressSkill,
  }
}
