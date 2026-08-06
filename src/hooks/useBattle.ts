import { useCallback, useEffect, useRef, useState } from 'react'
import { pickEnemyAction } from '../game/battle/ai'
import {
  advanceTurn,
  beginBattle,
  createBattle,
  getActiveUnit,
  getValidTargets,
  submitAction,
  toBattleResult,
} from '../game/battle/engine'
import { getSkillForCharacter } from '../game/battle/skills'
import { playSfx } from '../lib/audio/AudioEngine'
import type { ActionKind, BattleAction, BattleSnapshot, BattleResult } from '../game/battle/types'
import type { Player } from '../types/player'

const ENEMY_DELAY_MS = 700

/**
 * ห่อ submitAction ไว้เล่นเสียงกระทบตอนมีการโจมตีจริง (ไม่เล่นตอน defend)
 * ตั้งใจไม่ใส่ side effect นี้ใน game/battle/engine.ts เอง เพราะไฟล์นั้นเป็น pure logic
 * ที่ unit test มัน mock Math.random ตรง ๆ (ดู formulas.test.ts/engine.test.ts) — เสียงเป็นเรื่อง
 * ของ presentation layer เท่านั้น
 */
function submitActionWithSfx(snapshot: BattleSnapshot, action: BattleAction): BattleSnapshot {
  if (action.kind !== 'defend') void playSfx('battleHit')
  return submitAction(snapshot, action)
}

interface UseBattleOptions {
  player: Player
  stageId: string
  onComplete: (result: BattleResult) => void
}

export function useBattle({ player, stageId, onComplete }: UseBattleOptions) {
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(() =>
    createBattle(stageId, player.teamSlots, player.ownedCharacters),
  )
  const [pendingKind, setPendingKind] = useState<ActionKind | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!snapshot || snapshot.phase !== 'intro') return
    const timer = window.setTimeout(() => {
      setSnapshot((current) => (current ? beginBattle(current) : current))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [snapshot])

  useEffect(() => {
    if (!snapshot) return
    const result = toBattleResult(snapshot)
    if (!result || completedRef.current) return
    completedRef.current = true
    onComplete(result)
  }, [snapshot, onComplete])

  useEffect(() => {
    if (!snapshot || snapshot.phase !== 'resolving') return
    const actor = getActiveUnit(snapshot)
    if (!actor || actor.isAlly) return

    const timer = window.setTimeout(() => {
      setSnapshot((current) => {
        if (!current) return current
        const action = pickEnemyAction(current)
        if (!action) return advanceTurn(current)
        return submitActionWithSfx(current, action)
      })
    }, ENEMY_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [snapshot])

  const selectAction = useCallback((kind: ActionKind) => {
    setSnapshot((current) => {
      if (!current) return current
      const actor = getActiveUnit(current)
      if (!actor?.isAlly || current.phase !== 'awaiting_input') return current

      if (kind === 'defend') {
        return submitAction(current, {
          kind: 'defend',
          actorId: actor.id,
          targetId: actor.id,
        })
      }

      if (kind === 'skill' && actor.characterId) {
        const skillDef = getSkillForCharacter(actor.characterId)
        if (skillDef?.effect === 'heal-lowest-ally' || skillDef?.effect === 'hits-all-enemies') {
          const targets = getValidTargets(current, actor.id, kind)
          const targetId = skillDef.effect === 'heal-lowest-ally' ? actor.id : targets[0]?.id
          if (targetId) {
            return submitActionWithSfx(current, { kind, actorId: actor.id, targetId })
          }
        }
      }

      const targets = getValidTargets(current, actor.id, kind)
      if (targets.length === 1) {
        return submitActionWithSfx(current, {
          kind,
          actorId: actor.id,
          targetId: targets[0].id,
        })
      }

      setPendingKind(kind)
      return current
    })
  }, [])

  const selectTarget = useCallback(
    (targetId: string) => {
      if (!pendingKind) return
      setSnapshot((current) => {
        if (!current) return current
        const actor = getActiveUnit(current)
        if (!actor) return current
        const action: BattleAction = {
          kind: pendingKind,
          actorId: actor.id,
          targetId,
        }
        return submitActionWithSfx(current, action)
      })
      setPendingKind(null)
    },
    [pendingKind],
  )

  const cancelTarget = useCallback(() => setPendingKind(null), [])

  const activeUnit = snapshot ? getActiveUnit(snapshot) : null
  const skill =
    activeUnit?.characterId ? getSkillForCharacter(activeUnit.characterId) : undefined

  const validTargetIds = snapshot && activeUnit && pendingKind
    ? getValidTargets(snapshot, activeUnit.id, pendingKind).map((unit) => unit.id)
    : []

  return {
    snapshot,
    activeUnit,
    pendingKind,
    skill,
    validTargetIds,
    selectAction,
    selectTarget,
    cancelTarget,
  }
}
