import type { BattleResult } from '../battle/types'
import type { RealtimeBattleState } from './createRealtimeBattle'
import { calculateBattleReward, type BattleRewardOptions } from './RewardSystem'
import type { RealtimeBattleResult } from './types'

/**
 * รหัสรายการของการต่อสู้ครั้งนี้ — ผูกทุก idempotency guard ของรางวัลชุดนี้เข้าด้วยกัน
 *
 * Minted ONCE, here, at battle end — never derived from the clock and never re-minted downstream.
 * The id used to come from `stageId + finishedAt`, which made the client's wall clock decide
 * whether two battles were the same battle: a backwards jump (NTP correction, manual change,
 * timezone edit) reproduced an earlier `finishedAt` and the reward pipeline read a genuinely new
 * battle as already processed — no grant, success reported, the whole battle's rewards voided.
 *
 * Two battles can no longer collide because nothing about the id depends on time or on the
 * battle's contents. One battle keeps ONE id across every retry because the id rides on the
 * result object, which is created exactly once per battle and handed to each attempt by
 * reference — minting inside the reward pipeline instead would produce a fresh id per attempt
 * and defeat the very flags that stop a double grant.
 *
 * `randomUUID` needs a secure context and is missing in some runtimes (old jsdom, plain http);
 * the fallback keeps the same property that matters here — no clock input — and is not required
 * to be cryptographically strong, only to not collide across a player's battles.
 */
function mintBattleTransactionId(stageId: string): string {
  const webCrypto = globalThis.crypto
  const unique =
    typeof webCrypto?.randomUUID === 'function'
      ? webCrypto.randomUUID()
      : `${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`
  return `lobby:${stageId}:${unique}`
}

/**
 * แปลงสถานะจบของห้อง real-time เป็นผลการต่อสู้ที่ระบบนอกห้องเข้าใจ
 *
 * รางวัล (EXP/ทอง/ไอเทม) คำนวณใน RewardSystem — ไฟล์นี้แค่ประกอบผล
 * ห้าม hardcode 0 เมื่อชนะ (แพ้ยังเป็นศูนย์ตามกติกา RewardSystem)
 */
export function toRealtimeBattleResult(
  state: RealtimeBattleState,
  outcome: 'victory' | 'defeat',
  options: BattleRewardOptions = {},
): RealtimeBattleResult {
  const reward = calculateBattleReward(state, outcome, options)
  return {
    transactionId: mintBattleTransactionId(state.stage.id),
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
