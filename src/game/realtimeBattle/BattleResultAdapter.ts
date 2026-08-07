import type { BattleResult } from '../battle/types'
import type { RealtimeBattleState } from './createRealtimeBattle'
import { calculateBattleReward } from './RewardSystem'
import type { RealtimeBattleResult } from './types'

/**
 * แปลงสถานะจบของห้อง real-time เป็นผลการต่อสู้ที่ระบบนอกห้องเข้าใจ
 *
 * รางวัล (EXP/ทอง/ไอเทม) คำนวณใน RewardSystem — ไฟล์นี้แค่ประกอบผล
 * ห้าม hardcode 0 เมื่อชนะ (แพ้ยังเป็นศูนย์ตามกติกา RewardSystem)
 */
export function toRealtimeBattleResult(
  state: RealtimeBattleState,
  outcome: 'victory' | 'defeat',
): RealtimeBattleResult {
  const reward = calculateBattleReward(state, outcome)
  return {
    outcome,
    stageId: state.stage.id,
    stageName: state.stage.name,
    elapsedMs: Math.round(state.elapsedMs),
    defeatedEnemyIds: [...state.defeatedEnemyIds],
    damageDealt: Math.round(state.damageDealt),
    damageTaken: Math.round(state.damageTaken),
    earnedExp: reward.earnedExp,
    earnedGold: reward.earnedGold,
    droppedItems: reward.droppedItems.map((item) => ({ ...item })),
    finishedAt: new Date().toISOString(),
  }
}

/**
 * แปลงผลของระบบใหม่ให้เข้ากับ contract เดิมที่ LobbyBattleSession / ประวัติบัญชีรับอยู่
 *
 * Realtime ไม่มี "เทิร์น" — ส่ง `durationMs` จาก elapsedMs
 * `turns` เป็น optional สำหรับบัญชีเก่าที่ยังมีค่าใน localStorage
 */
export function toLegacyBattleResult(result: RealtimeBattleResult): BattleResult {
  return {
    outcome: result.outcome,
    stageId: result.stageId,
    stageName: result.stageName,
    durationMs: result.elapsedMs,
    finishedAt: result.finishedAt,
  }
}
