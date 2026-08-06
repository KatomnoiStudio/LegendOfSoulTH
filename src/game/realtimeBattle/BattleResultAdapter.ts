import type { BattleResult } from '../battle/types'
import type { RealtimeBattleState } from './createRealtimeBattle'
import type { RealtimeBattleResult } from './types'

/**
 * แปลงสถานะจบของห้อง real-time เป็นผลการต่อสู้ที่ระบบนอกห้องเข้าใจ
 *
 * เหตุผลที่ต้องมีตัวแปลงแยก: contract เดิม (useGameFlow → appendBattleHistory) ถูกออกแบบ
 * ไว้กับระบบเทิร์น ถ้าให้ runtime สร้างผลลัพธ์ในรูปแบบนั้นตรง ๆ ระบบใหม่จะถูกความคิด
 * แบบเทิร์นล็อกไว้ (เช่นต้องนับ "จำนวนเทิร์น") การมี adapter ทำให้ runtime พูดภาษาของ
 * ตัวเอง (elapsedMs, damageDealt, ...) แล้วค่อย map ให้ระบบเดิมที่ชั้นเดียว
 *
 * หมายเหตุ: การคิดรางวัลจริง (EXP/ทอง/ไอเทม) ยังไม่อยู่ในไฟล์นี้ — จะเข้ามาพร้อม
 * RewardSystem ในงาน Reward Integration (§26) ตอนนี้ส่งค่าศูนย์ไว้อย่างซื่อสัตย์
 * ดีกว่าใส่ตัวเลขปลอมที่ยังไม่มีระบบรองรับ
 */
export function toRealtimeBattleResult(
  state: RealtimeBattleState,
  outcome: 'victory' | 'defeat',
): RealtimeBattleResult {
  return {
    outcome,
    stageId: state.stage.id,
    stageName: state.stage.name,
    elapsedMs: Math.round(state.elapsedMs),
    defeatedEnemyIds: [...state.defeatedEnemyIds],
    damageDealt: Math.round(state.damageDealt),
    damageTaken: Math.round(state.damageTaken),
    earnedExp: 0,
    earnedGold: 0,
    droppedItems: [],
    finishedAt: new Date().toISOString(),
  }
}

/**
 * แปลงผลของระบบใหม่ให้เข้ากับ contract เดิมที่ useGameFlow รับอยู่
 *
 * ตอนนี้ยังต้องส่ง `turns` เพราะ BattleRecord ของบัญชีเก่ากำหนดให้เป็น field บังคับ
 * การต่อสู้เรียลไทม์ไม่มี "เทิร์น" จึงส่ง 0 ไปตรง ๆ แทนที่จะแปลงเวลาเป็นเทิร์นปลอม ๆ
 *
 * งาน Reward Integration (§25) จะเปลี่ยน BattleRecord ให้ `turns` เป็น optional และ
 * เพิ่ม `durationMs` พร้อม backfill บัญชีเก่า — ตอนนั้นฟังก์ชันนี้จะส่งเวลาจริงแทน
 */
export function toLegacyBattleResult(result: RealtimeBattleResult): BattleResult {
  return {
    outcome: result.outcome,
    stageId: result.stageId,
    stageName: result.stageName,
    turns: 0,
    finishedAt: result.finishedAt,
  }
}
