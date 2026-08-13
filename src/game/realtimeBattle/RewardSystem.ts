import { resolveLobbyStageReward } from '../reward/stageRewardResolver'
import type { Player } from '../../types/player'
import type { RealtimeBattleState } from './createRealtimeBattle'
import { getEnemyTemplate } from './stageConfig'
import { applyHeroExpToLeadHero } from '../progression/progressionService'

/**
 * คำนวณรางวัลจากการต่อสู้ real-time
 *
 * แพ้ = ไม่ได้รางวัล (ศูนย์อย่างซื่อสัตย์)
 * ชนะ = ทอง/EXP ตามศัตรูที่ฆ่าได้ + โบนัสคลื่น — ไม่มี RNG (เทสต์ต้อง deterministic)
 *
 * ไฟล์นี้ pure: ไม่แตะ localStorage / Player — แค่ตัวเลขให้ adapter และชั้นบันทึกใช้
 */

export interface BattleReward {
  earnedExp: number
  earnedGold: number
  droppedItems: Array<{ itemId: string; quantity: number }>
}

/** ทอง/EXP ต่อศัตรูเมื่อไม่รู้จัก template */
const DEFAULT_GOLD_PER_ENEMY = 20
const DEFAULT_EXP_PER_ENEMY = 35

/** โบนัสต่อคลื่นที่เคลียร์ (ชนะเท่านั้น) */
const WAVE_CLEAR_GOLD = 15
const WAVE_CLEAR_EXP = 25

const TEMPLATE_REWARD: Record<string, { gold: number; exp: number }> = {
  'shadow-soldier': { gold: 22, exp: 40 },
  'demon-captain': { gold: 35, exp: 55 },
  'spirit-guardian': { gold: 28, exp: 48 },
}

function rewardForTemplate(templateId: string | undefined): { gold: number; exp: number } {
  if (!templateId) {
    return { gold: DEFAULT_GOLD_PER_ENEMY, exp: DEFAULT_EXP_PER_ENEMY }
  }
  const table = TEMPLATE_REWARD[templateId]
  if (table) return table

  const template = getEnemyTemplate(templateId)
  if (!template) {
    return { gold: DEFAULT_GOLD_PER_ENEMY, exp: DEFAULT_EXP_PER_ENEMY }
  }
  return {
    gold: Math.max(DEFAULT_GOLD_PER_ENEMY, Math.round(template.maxHp / 8)),
    exp: Math.max(DEFAULT_EXP_PER_ENEMY, Math.round(template.maxHp / 5)),
  }
}

export interface BattleRewardOptions {
  /** True when `trial_cleared_<stageId>` is not yet set — first-clear table rows apply. */
  isFirstClear?: boolean
}

export function calculateBattleReward(
  state: RealtimeBattleState,
  outcome: 'victory' | 'defeat',
  options: BattleRewardOptions = {},
): BattleReward {
  if (outcome === 'defeat') {
    return { earnedExp: 0, earnedGold: 0, droppedItems: [] }
  }

  const wavesCleared = state.currentWaveIndex + 1
  const tableReward = resolveLobbyStageReward({
    stageId: state.stage.id,
    wavesCleared,
    isFirstClear: options.isFirstClear === true,
  })
  if (tableReward) return tableReward

  let earnedGold = 0
  let earnedExp = 0

  for (const defeatedId of state.defeatedEnemyIds) {
    const entity = state.enemies.find((enemy) => enemy.id === defeatedId)
    const part = rewardForTemplate(entity?.enemyId)
    earnedGold += part.gold
    earnedExp += part.exp
  }

  earnedGold += wavesCleared * WAVE_CLEAR_GOLD
  earnedExp += wavesCleared * WAVE_CLEAR_EXP

  const droppedItems: BattleReward['droppedItems'] = []
  if (state.defeatedEnemyIds.length >= 1) {
    droppedItems.push({ itemId: 'iron-essence', quantity: 1 })
  }
  if (state.defeatedEnemyIds.length >= 3) {
    droppedItems.push({ itemId: 'spirit-incense', quantity: 1 })
  }
  if (wavesCleared >= 2) {
    droppedItems.push({ itemId: 'healing-peach', quantity: 1 })
  }

  return {
    earnedExp: Math.max(0, Math.round(earnedExp)),
    earnedGold: Math.max(0, Math.round(earnedGold)),
    droppedItems,
  }
}

/** บวก EXP ให้เลเวลบัญชีผู้เล่นเท่านั้น — hero EXP ผ่าน progression service */
export function applyAccountExp(player: Player, earnedExp: number): Player {
  if (earnedExp <= 0) return player

  let { level, exp, expToNext } = player
  exp += earnedExp
  let guard = 0
  while (exp >= expToNext && expToNext > 0 && guard < 20) {
    exp -= expToNext
    level += 1
    expToNext = Math.max(1, Math.round(expToNext * 1.2))
    guard += 1
  }

  return { ...player, level, exp, expToNext }
}

/**
 * บวก EXP ให้บัญชีผู้เล่น (และขุนพลตัวนำถ้ามี) — path สำหรับ LobbyBattleSession
 *
 * design-lock item 12 (2026-08-13, HetCreep ตัดสิน ก.): เดิมเลเวลขุนพลด้วยลูป `*1.2` ที่เขียนซ้ำ
 * ในไฟล์นี้เอง คนละสูตรกับที่ Dungeon reward ใช้ (`progressionService.applyHeroExp`, ตาราง
 * Ring-0-locked P8 balance) — ตัวละครเดียวกันเลเวลไม่เท่ากันจริงถ้าเปลี่ยนโหมดเล่น วัดได้ต่างกัน
 * 51.5% สะสมถึง level 11 (2,605 ปะทะ 5,370 EXP) ค้นทั่วโลกไม่พบเกม shipped เกมไหนแยกโค้งเลเวลตาม
 * แหล่งที่มาของ EXP แบบนี้ (Genshin Impact เป็นตัวอย่าง: ทุกแหล่ง EXP เทลง pool เดียว อ่านตาราง
 * เดียว) เพราะ "เลเวล" ต้องตอบคำถาม "ตัวละครนี้เลเวลเท่าไหร่" ได้คำตอบเดียวเสมอ
 *
 * แก้โดยเรียก `applyHeroExpToLeadHero` ตัวเดียวกับที่ `rewardGrantService.ts` (Dungeon) ใช้อยู่แล้ว
 * แทนเขียนสูตรเอง — ผลข้างเคียงที่ตั้งใจ: ตอนนี้ threshold คำนวณจาก level เสมอ (ตาราง Ring-0)
 * ไม่อ่านค่า expToNext ที่เก็บไว้บนตัวละครอีกต่อไป ถ้าค่านั้นเพี้ยนไปจากที่ควรเป็นด้วยเหตุใดก็ตาม
 * โค้งใหม่จะแก้ตัวเองกลับมาถูกทุกครั้งที่มีการเลเวลอัพครั้งถัดไป ไม่สะสมความเพี้ยนต่อไปเรื่อย ๆ
 * แบบที่ลูปเดิมทำ
 */
export function applyBattleExp(player: Player, earnedExp: number): Player {
  if (earnedExp <= 0) return player
  const withAccount = applyAccountExp(player, earnedExp)

  /*
    `applyHeroExp` โยน `Unknown hero: <id>` ถ้า teamSlots ชี้ตัวที่ไม่มีใน ownedCharacters — ซึ่ง
    เกิดได้จริงเมื่อข้อมูลไม่ตรงกัน (grant สำเร็จครึ่งทาง, migration ทำตัวละครหาย) ลูปเดิมที่ถูก
    แทนที่ไปไม่โยน มันแค่ `.map` ไม่เจอแล้วผ่านไปเงียบ ๆ

    ปล่อยให้โยนไม่ได้: จุดเรียกที่ `lobbyBattleRewardPipeline.ts` ไม่มี try/catch และ effect ที่
    เรียกต่อใน `LobbyBattleSession.tsx` ก็ไม่มี — exception จะกิน **รางวัลทั้งก้อน รวมทองกับไอเทม**
    ไม่ใช่แค่ส่วน hero EXP ที่ทำไม่ได้จริง ๆ

    เช็คก่อนเรียกแทนการ catch เพราะกรณีนี้ไม่ใช่ error: hero EXP ไม่มีปลายทางจะลง ก็แค่ไม่ลง —
    เหมือนพฤติกรรมเดิมเป๊ะ ส่วน error จริงจาก progression (amount ไม่ใช่ตัวเลข ฯลฯ) ยังโยนผ่านตาม
    เดิม ไม่ถูกกลบ
  */
  const leadId = withAccount.teamSlots.find((id): id is string => id !== null) ?? null
  const ownsLead =
    leadId !== null && withAccount.ownedCharacters.some((c) => c.characterId === leadId)
  if (!ownsLead) return withAccount

  return applyHeroExpToLeadHero(withAccount, earnedExp).player
}
