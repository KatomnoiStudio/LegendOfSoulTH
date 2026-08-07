import { useCallback, useRef, useState } from 'react'
import type { CurrencyResult, GoldSource } from '../../data/accountRepository'
import { appendBattleHistory } from '../../game/dialogue/actions'
import { P5_TEST_DUNGEON } from '../../game/dungeon/dungeonConfig'
import type { DungeonResult } from '../../game/dungeon/dungeonSchema'
import { applyBattleExp } from '../../game/realtimeBattle/RewardSystem'
import { useDungeonStageBattle } from '../../hooks/useDungeonStageBattle'
import type { Player } from '../../types/player'
import { RealtimeBattleRoom } from '../BattleScene/RealtimeBattleRoom'
import { DungeonResultPanel } from './DungeonResultPanel'
import { StageObjectiveHud } from './StageObjectiveHud'
import styles from '../BattleScene/BattleScene.module.css'

const LOADING = (
  <div className={styles.scene}>
    <div className={styles.fallback} aria-live="polite">
      <p>กำลังเข้าดันเจี้ยน…</p>
    </div>
  </div>
)

export const P5_DUNGEON_ID = P5_TEST_DUNGEON.id

export function DungeonSession({
  player,
  onPlayerChange,
  onEarnGold,
  onExit,
}: {
  player: Player
  onPlayerChange: (next: Player) => Promise<boolean>
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  onExit: () => void
}) {
  const [pendingResult, setPendingResult] = useState<DungeonResult | null>(null)
  const savedRef = useRef(false)

  const handleDungeonComplete = useCallback((result: DungeonResult) => {
    setPendingResult(result)
  }, [])

  const {
    phase,
    errorMessage,
    runtime,
    snapshot,
    stageSnapshot,
    requestExit,
    setJoystick,
    pressAttack,
    pressSkill,
  } = useDungeonStageBattle({
    dungeon: P5_TEST_DUNGEON,
    player,
    onDungeonComplete: handleDungeonComplete,
  })

  const handleExit = useCallback(() => {
    requestExit()
    onExit()
  }, [onExit, requestExit])

  const handleContinue = useCallback(() => {
    if (!pendingResult || savedRef.current) return
    savedRef.current = true

    void (async () => {
      let next: Player = player
      const reward = pendingResult.rewardPlaceholder
      if (reward && pendingResult.success && reward.gold > 0) {
        const gold = await onEarnGold('drop', reward.gold, pendingResult.dungeonId)
        if (gold.ok) next = gold.player
      }
      if (reward && pendingResult.success) {
        next = applyBattleExp(next, reward.exp)
      }

      const won = pendingResult.success
      const progress = appendBattleHistory(next.progress, {
        id: `dungeon-${Date.now()}`,
        opponent: P5_TEST_DUNGEON.metadata?.name ?? pendingResult.dungeonId,
        result: won ? 'win' : 'lose',
        finishedAt: new Date().toISOString(),
        durationMs: pendingResult.clearTimeMs,
      })

      const flags = { ...progress.flags }
      if (won) flags[`dungeon_cleared_${pendingResult.dungeonId}`] = true

      await onPlayerChange({ ...next, progress: { ...progress, flags } })
      onExit()
    })()
  }, [onEarnGold, onExit, onPlayerChange, pendingResult, player])

  if (phase === 'error') {
    return (
      <div className={styles.scene}>
        <div className={styles.fallback} role="alert">
          <p>{errorMessage}</p>
          <button type="button" className={styles.exitBtn} onClick={handleExit}>
            กลับล็อบบี้
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading' || !runtime || !snapshot) {
    return LOADING
  }

  return (
    <>
      <RealtimeBattleRoom
        runtime={runtime}
        snapshot={snapshot}
        onExit={handleExit}
        onMove={setJoystick}
        onAttack={pressAttack}
        onSkill={pressSkill}
        overlay={<StageObjectiveHud snapshot={stageSnapshot} />}
      />
      {pendingResult ? (
        <DungeonResultPanel
          result={pendingResult}
          dungeonName={P5_TEST_DUNGEON.metadata?.name ?? 'ดันเจี้ยน'}
          onContinue={handleContinue}
        />
      ) : null}
    </>
  )
}
