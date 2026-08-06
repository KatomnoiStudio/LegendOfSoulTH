import { Suspense, lazy, useCallback, useRef } from 'react'
import { appendBattleHistory } from '../../game/dialogue/actions'
import { toLegacyBattleResult } from '../../game/realtimeBattle/BattleResultAdapter'
import type { RealtimeBattleResult } from '../../game/realtimeBattle/types'
import type { Player } from '../../types/player'

/**
 * ทางเข้าห้องต่อสู้จากล็อบบี้ — กดปุ่มแล้วเข้าห้องเลย ไม่ผ่านโหมดสำรวจ
 *
 * เดิมปุ่ม "ต่อสู้" กับ "เริ่มการผจญภัย" เปิด GameExplorationSession ผู้เล่นต้องเดินไปหา NPC
 * แล้วคุยก่อนถึงจะได้ต่อสู้ ซึ่งเป็นทางอ้อมที่ยาวเกินไปสำหรับปุ่มที่เขียนว่า "ต่อสู้"
 *
 * ไฟล์นี้ตั้งใจให้บางที่สุด: เตรียมด่าน → เปิดห้อง → บันทึกผล → ปิด
 * ไม่มีสถานะของโหมดสำรวจ (แผนที่ ตำแหน่ง NPC บทสนทนา) เข้ามาเกี่ยวเลย
 */

/*
  โหลดห้องต่อสู้แบบ lazy — เหตุผลเดียวกับที่ LobbyPage ทำกับ LobbyScene

  ห้องต่อสู้ใช้ three.js/R3F ถ้า import ตรง ๆ three จะถูกรวมเข้า chunk หลัก ทำให้ bundle
  แรกที่ผู้เล่นต้องโหลดตอนเปิดเกมโตขึ้นมาก ทั้งที่ยังไม่ได้เข้าห้องต่อสู้เลย
*/
const BattleScene = lazy(() =>
  import('../BattleScene/BattleScene').then((m) => ({ default: m.BattleScene })),
)

/** ด่านที่ปุ่มในล็อบบี้พาเข้า — ด่านแรกของเกม */
export const LOBBY_BATTLE_STAGE_ID = 'trial-01'

export function LobbyBattleSession({
  player,
  onPlayerChange,
  onExit,
}: {
  player: Player
  onPlayerChange: (next: Player) => Promise<void>
  onExit: () => void
}) {
  /*
    กันบันทึกผลซ้ำ

    BattleScene เรียก onComplete ครั้งเดียวอยู่แล้ว (useRealtimeBattle มี guard ของตัวเอง)
    แต่ตัวนี้เขียนลงข้อมูลผู้เล่นจริง จึงกันไว้อีกชั้นไม่ให้ประวัติซ้ำถ้าเงื่อนไขเปลี่ยนวันหลัง
  */
  const savedRef = useRef(false)

  const handleComplete = useCallback(
    (result: RealtimeBattleResult) => {
      if (savedRef.current) return
      savedRef.current = true

      /*
        แปลงผ่าน toLegacyBattleResult ตัวเดิม ไม่แปลงเอง

        BattleRecord ยังต้องการ `turns` อยู่ (§25 ของแผน migration จะเปลี่ยนเป็น durationMs
        ทีหลัง) adapter เป็นที่เดียวที่รู้เรื่องนี้ — ถ้าแปลงเองตรงนี้ พอ adapter เปลี่ยน
        จะมีจุดที่ลืมแก้
      */
      const legacy = toLegacyBattleResult(result)
      const won = legacy.outcome === 'victory'

      let progress = appendBattleHistory(player.progress, {
        id: `battle-${Date.now()}`,
        opponent: legacy.stageName,
        result: won ? 'win' : 'lose',
        finishedAt: legacy.finishedAt,
        turns: legacy.turns,
      })

      // ตั้ง flag เดียวกับที่ทางเข้าผ่าน NPC เคยตั้ง เพื่อให้ความคืบหน้าของด่านนับตรงกัน
      if (won) {
        progress = {
          ...progress,
          flags: { ...progress.flags, [`trial_cleared_${legacy.stageId}`]: true },
        }
      }

      void onPlayerChange({ ...player, progress })
      // บันทึกแล้วปิดห้องกลับล็อบบี้ — ไม่งั้นค้างในห้องต่อสู้จนผู้เล่นกด "ออก" เอง
      onExit()
    },
    [onExit, onPlayerChange, player],
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
