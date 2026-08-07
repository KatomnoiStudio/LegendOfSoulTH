import { Suspense, lazy, useCallback, useRef } from 'react'
import type { CurrencyResult, GoldSource, ItemResult } from '../../data/accountRepository'
import { appendBattleHistory } from '../../game/dialogue/actions'
import { applyBattleExp } from '../../game/realtimeBattle/RewardSystem'
import { toLegacyBattleResult } from '../../game/realtimeBattle/BattleResultAdapter'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import type { Player } from '../../types/player'

/**
 * ทางเข้าห้องต่อสู้จากล็อบบี้ — กดปุ่มแล้วเข้าห้องเลย ไม่ผ่านโหมดสำรวจ
 *
 * ไฟล์นี้ตั้งใจให้บางที่สุด: เตรียมด่าน → เปิดห้อง → แสดงผล → บันทึกรางวัล/ประวัติ → ปิด
 */

const BattleScene = lazy(() =>
  import('../BattleScene/BattleScene').then((m) => ({ default: m.BattleScene })),
)

/** ด่านที่ปุ่มในล็อบบี้พาเข้า — ด่านแรกของเกม */
export const LOBBY_BATTLE_STAGE_ID = 'trial-01'

export function LobbyBattleSession({
  player,
  onPlayerChange,
  onEarnGold,
  onGrantItem,
  onExit,
}: {
  player: Player
  /** คืน true เมื่อบันทึกลงที่เก็บข้อมูลจริง — false แปลว่าหน้าจอถูกย้อนกลับแล้ว */
  onPlayerChange: (next: Player) => Promise<boolean>
  /** ทองจากการเล่น — ต้องผ่าน ledger (earnGold) ไม่ใช่เซตตรง */
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  /** ไอเทมดรอป — ต้องผ่าน grantItem */
  onGrantItem: (itemId: string, quantity: number, source: GoldSource) => Promise<ItemResult>
  onExit: () => void
}) {
  /*
    กันบันทึกผลซ้ำ

    BattleScene เรียก onComplete ครั้งเดียวตอนผู้เล่นกด "กลับล็อบบี้" จากแผงผล
    แต่ตัวนี้เขียนลงข้อมูลผู้เล่นจริง จึงกันไว้อีกชั้น
  */
  const savedRef = useRef(false)

  const handleComplete = useCallback(
    (result: RealtimeBattleResult) => {
      if (savedRef.current) return
      savedRef.current = true

      void (async () => {
        /*
          ลำดับ: ทอง → ไอเทม → EXP/ประวัติ
          ทอง/ไอเทมผ่าน repository (ledger) แล้วเอา player ล่าสุดมาต่อ EXP+history
          ด้วย onPlayerChange ครั้งเดียว — ห้ามเซตทองตรงบน object แล้ว savePlayer
        */
        let next: Player = player

        if (result.earnedGold > 0) {
          const gold = await onEarnGold('drop', result.earnedGold, result.stageId)
          if (gold.ok) next = gold.player
        }

        for (const drop of result.droppedItems) {
          const granted = await onGrantItem(drop.itemId, drop.quantity, 'drop')
          if (granted.ok) next = granted.player
        }

        next = applyBattleExp(next, result.earnedExp)

        const legacy = toLegacyBattleResult(result)
        const won = legacy.outcome === 'victory'

        let progress = appendBattleHistory(next.progress, {
          id: `battle-${Date.now()}`,
          opponent: legacy.stageName,
          result: won ? 'win' : 'lose',
          finishedAt: legacy.finishedAt,
          durationMs: legacy.durationMs,
        })

        if (won) {
          progress = {
            ...progress,
            flags: { ...progress.flags, [`trial_cleared_${legacy.stageId}`]: true },
          }
        }

        await onPlayerChange({ ...next, progress })
        // แผงผลกดแล้วต้องกลับล็อบบี้เสมอ — ไม่งั้นค้างในห้องต่อสู้
        onExit()
      })()
    },
    [onEarnGold, onExit, onGrantItem, onPlayerChange, player],
  )

  return (
    <Suspense fallback={null}>
      <BattleScene
        player={player}
        stageId={LOBBY_BATTLE_STAGE_ID}
        onComplete={handleComplete}
        onExit={onExit}
      />
    </Suspense>
  )
}
