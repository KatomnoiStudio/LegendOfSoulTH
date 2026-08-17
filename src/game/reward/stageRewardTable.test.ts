import { describe, expect, it } from 'vitest'

import { getItem } from '../items'
import { REALTIME_STAGES } from '../realtimeBattle/stageConfig'
import { validateRewardDefinition } from './rewardValidator'
import {
  STAGE_REWARD_DEFINITIONS,
  STAGE_WAVE_CLEAR_BONUS,
  getStageRewardDefinition,
} from './stageRewardConfig'
import { resolveLobbyStageReward } from './stageRewardResolver'

/*
  Stryker รอบแรก (2026-08-16) รายงาน stageRewardConfig.ts ที่ 31.86% โดยมี **154 mutant รอด**
  มากที่สุดในโปรเจกต์ สาเหตุตรงไปตรงมา: ไฟล์นั้นเกือบทั้งไฟล์เป็นตารางข้อมูล 10 ด่าน × ~7
  ตัวเลข และ stageRewardConfig.test.ts ที่มีอยู่ยืนยันแค่ trial-01 กับเปรียบเทียบ trial-10

  **ไฟล์นี้จงใจไม่ไล่ยืนยันตัวเลขทีละตัวเพื่อไล่ฆ่า mutant ให้ครบ** — การเขียน
  `expect(trial04.gold).toBe(70)` สิบด่านจะได้คะแนน mutation สวยขึ้นทันที แต่มันคือการตรึง
  magic number ไว้กับที่ ซึ่งสวนกับกฎ base × scale ของ docs/ECONOMY-DESIGN-LOCK.md ตรง ๆ
  และจะทำให้การ migrate ตารางนี้ไปเป็นค่าที่ derive มาในอนาคต ดูเหมือน "ทำเทสต์พัง"
  (เหตุผลเดียวกับที่ gachaConfig.test.ts ไม่ยืนยัน costSingle/costMulti)

  สิ่งที่ยืนยันแทนคือ invariant ที่ผิดแล้วผู้เล่นเจอของเสียจริง ๆ: item id ที่พิมพ์ผิดแล้วเงียบ,
  ด่านที่ไม่มีรางวัล, sourceId ที่ไม่ตรงกับด่าน, และ *กฎ* ของโบนัสต่อเวฟ (ไม่ใช่ตัวเลขในตาราง)
*/

const STAGE_IDS = Object.keys(STAGE_REWARD_DEFINITIONS)

describe('ตารางรางวัลรายด่าน — invariant ที่ผิดแล้วผู้เล่นเจอของเสีย', () => {
  it('ทุกด่านในตารางผ่าน validateRewardDefinition', () => {
    for (const [stageId, def] of Object.entries(STAGE_REWARD_DEFINITIONS)) {
      expect(
        validateRewardDefinition(def),
        `${stageId} มีรายการรางวัลที่ไม่ผ่าน validator`,
      ).toEqual([])
    }
  })

  it('ทุก itemId ที่แจกมีอยู่จริงใน ITEMS', () => {
    // itemId ที่พิมพ์ผิดไม่ทำให้อะไรพัง — ผู้เล่นแค่ไม่ได้ของ และไม่มี error ให้ใครเห็น
    for (const [stageId, def] of Object.entries(STAGE_REWARD_DEFINITIONS)) {
      const items = [
        ...(def.guaranteed ?? []),
        ...(def.conditional ?? []).flatMap((c) => c.entries),
      ].filter((entry) => entry.type === 'item')

      for (const entry of items) {
        expect(
          getItem(entry.itemId),
          `${stageId} แจก item ที่ไม่มีในแคตตาล็อก: ${entry.itemId}`,
        ).not.toBeNull()
      }
    }
  })

  it('sourceId ของทุกด่านเป็น <stageId>-clear', () => {
    // sourceId คือกุญแจกันแจกซ้ำในบัญชีแยกประเภท — ชนกันหรือผิดด่าน = แจกซ้ำหรือไม่แจกเลย
    for (const stageId of STAGE_IDS) {
      expect(STAGE_REWARD_DEFINITIONS[stageId]?.sourceId).toBe(`${stageId}-clear`)
    }
  })

  it('sourceId ไม่ซ้ำกันข้ามด่าน', () => {
    const ids = STAGE_IDS.map((id) => STAGE_REWARD_DEFINITIONS[id]?.sourceId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ทุกด่านที่ตารางนี้มีรางวัลให้ มีอยู่จริงใน REALTIME_STAGES', () => {
    // รายการรางวัลของด่านที่ไม่มีอยู่ = โค้ดตายที่ไม่มีใครสังเกต
    for (const stageId of STAGE_IDS) {
      expect(REALTIME_STAGES[stageId], `${stageId} มีรางวัลแต่ไม่มีด่าน`).toBeDefined()
    }
  })

  it('ทุกด่าน trial ใน REALTIME_STAGES มีรางวัลในตารางนี้', () => {
    // ด่านที่ไม่มีรางวัล = เล่นจบแล้วได้ศูนย์ ไม่มี error ให้เห็นเหมือนกัน
    const trialStages = Object.keys(REALTIME_STAGES).filter((id) => id.startsWith('trial-'))
    expect(trialStages.length).toBeGreaterThan(0)
    for (const stageId of trialStages) {
      expect(STAGE_REWARD_DEFINITIONS[stageId], `${stageId} เป็นด่านแต่ไม่มีรางวัล`).toBeDefined()
    }
  })

  it('ทุกด่านแจกทั้ง gold และ heroExp เป็นจำนวนเต็มบวก', () => {
    for (const stageId of STAGE_IDS) {
      const guaranteed = STAGE_REWARD_DEFINITIONS[stageId]?.guaranteed ?? []
      const gold = guaranteed.find((e) => e.type === 'currency' && e.currencyId === 'gold')
      const exp = guaranteed.find((e) => e.type === 'heroExp')

      expect(gold, `${stageId} ไม่แจก gold`).toBeDefined()
      expect(exp, `${stageId} ไม่แจก heroExp`).toBeDefined()
      // เศษทศนิยมของ gold ไหลเข้ายอดคงเหลือแล้วโผล่เป็น 40.000000001 บนหน้าจอ
      expect(Number.isInteger(gold && 'amount' in gold ? gold.amount : NaN)).toBe(true)
      expect(Number.isInteger(exp && 'amount' in exp ? exp.amount : NaN)).toBe(true)
      expect(gold && 'amount' in gold ? gold.amount : 0).toBeGreaterThan(0)
      expect(exp && 'amount' in exp ? exp.amount : 0).toBeGreaterThan(0)
    }
  })

  it('ทุกด่านมีโบนัสเคลียร์ครั้งแรกที่แจก gold เพิ่ม', () => {
    for (const stageId of STAGE_IDS) {
      const firstClear = (STAGE_REWARD_DEFINITIONS[stageId]?.conditional ?? []).find(
        (c) => c.condition.kind === 'firstClear',
      )
      expect(firstClear, `${stageId} ไม่มีโบนัสเคลียร์ครั้งแรก`).toBeDefined()

      const bonusGold = firstClear?.entries.find(
        (e) => e.type === 'currency' && e.currencyId === 'gold',
      )
      expect(bonusGold, `${stageId} โบนัสครั้งแรกไม่มี gold`).toBeDefined()
    }
  })
})

describe('STAGE_WAVE_CLEAR_BONUS — ยืนยันกฎ ไม่ใช่ตัวเลขในตาราง', () => {
  it('โบนัสคูณตามจำนวนเวฟที่เคลียร์ ไม่ใช่ก้อนเดียวคงที่', () => {
    const one = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: false,
    })
    const three = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 3,
      isFirstClear: false,
    })

    expect(three!.earnedGold - one!.earnedGold).toBe(STAGE_WAVE_CLEAR_BONUS.gold * 2)
    expect(three!.earnedExp - one!.earnedExp).toBe(STAGE_WAVE_CLEAR_BONUS.exp * 2)
  })

  it('เคลียร์ศูนย์เวฟ = ได้แต่รางวัลฐาน ไม่มีโบนัส', () => {
    const zero = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 0,
      isFirstClear: false,
    })
    const one = resolveLobbyStageReward({
      stageId: 'trial-01',
      wavesCleared: 1,
      isFirstClear: false,
    })

    expect(one!.earnedGold - zero!.earnedGold).toBe(STAGE_WAVE_CLEAR_BONUS.gold)
    expect(one!.earnedExp - zero!.earnedExp).toBe(STAGE_WAVE_CLEAR_BONUS.exp)
  })

  it('โบนัสต่อเวฟเป็นจำนวนเต็มบวกทั้งสองช่อง', () => {
    expect(Number.isInteger(STAGE_WAVE_CLEAR_BONUS.gold)).toBe(true)
    expect(Number.isInteger(STAGE_WAVE_CLEAR_BONUS.exp)).toBe(true)
    expect(STAGE_WAVE_CLEAR_BONUS.gold).toBeGreaterThan(0)
    expect(STAGE_WAVE_CLEAR_BONUS.exp).toBeGreaterThan(0)
  })
})

describe('getStageRewardDefinition', () => {
  it('คืนตารางของด่านที่มีอยู่', () => {
    expect(getStageRewardDefinition('trial-01')).toBe(STAGE_REWARD_DEFINITIONS['trial-01'])
  })

  it('คืน null สำหรับด่านที่ไม่มี ไม่ใช่ undefined', () => {
    // ผู้เรียกเช็คด้วย `=== null` — undefined จะเล็ดลอดไปเป็น TypeError ที่ปลายทาง
    expect(getStageRewardDefinition('ด่านที่ไม่มีอยู่')).toBeNull()
  })

  /*
    ข้อสังเกตที่วัดแล้ว ไม่ได้ทำเป็นเทสต์ และไม่ได้ใส่ guard

    STAGE_REWARD_DEFINITIONS เป็น object literal ธรรมดา `??` จับแค่ null/undefined —
    `getStageRewardDefinition('constructor')` จึงคืน Object constructor ออกมาเป็น
    RewardDefinition จริง ๆ (ลองแล้ว ได้ [Function Object])

    **ไม่ใส่ guard เพราะยังไม่มีทางไปถึง**: ผู้เรียกมีที่เดียวคือ RewardSystem.ts:75 ที่ส่ง
    `state.stage.id` ซึ่ง resolve มาจาก REALTIME_STAGES เสมอ ไม่เคยเป็นสตริงอิสระจากผู้ใช้
    การใส่ Object.hasOwn ตอนนี้คือกันเงื่อนไขที่ยังไม่มีใคร reproduce ได้

    เปิดใหม่เมื่อ: มีทางที่ stageId มาจากภายนอก (payload ของ edge function, deep link, save
    ที่ผู้เล่นแก้เองได้) ตอนนั้นค่อยใส่ Object.hasOwn แล้วเปลี่ยนคอมเมนต์นี้เป็นเทสต์
  */
})
