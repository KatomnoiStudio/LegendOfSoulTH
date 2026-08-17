import { describe, expect, it } from 'vitest'

import { BANNERS, STANDARD_BANNER, validateBannerConfig, type BannerConfig } from './gachaConfig'

/*
  ไฟล์นี้ไม่เคยมีเทสต์เลย — Stryker รอบแรก (2026-08-16) ให้ gachaConfig.ts ที่ 28.40%
  โดยมี 51 บรรทัดที่ไม่มีเทสต์ไหนวิ่งผ่าน ทั้งที่ validateBannerConfig คือด่านเดียวที่กันไม่ให้
  แบนเนอร์ที่อัตราไม่รวมเป็น 100% หลุดขึ้นโปรดักชัน

  ⚠️ เทสต์นี้ **ไม่ยืนยันราคา** ของ STANDARD_BANNER โดยตั้งใจ
  costSingle: 100 / costMulti: 900 ที่ชิปอยู่คือ "อดีตที่ยังไม่ migrate" ไม่ใช่ค่าที่ใครตัดสิน —
  docs/GACHA-RATE-DESIGN-LOCK.md §11.8/§11.9 ล็อก c = 16 / cost_multi = 160 ไว้ตั้งแต่
  2026-08-12 จาก wage-burden comparison เก้าเกม การเขียนเทสต์ยืนยัน 100/900 จะกลายเป็นการ
  ตรึงค่าที่ lock บอกว่าผิด แล้วทำให้การ migrate ในอนาคตดูเหมือนการทำเทสต์พัง
  (ดู .agents/rules/master-blueprint-law.md — "A value in code is not a decision")

  สิ่งที่ยืนยันได้คือ *กฎ* ที่ validator บังคับ กับ invariant ที่ lock รับรองแล้ว เช่น
  ผลรวมอัตรา = 1.0
*/

function banner(overrides: Partial<BannerConfig> = {}): BannerConfig {
  return { ...STANDARD_BANNER, ...overrides }
}

describe('STANDARD_BANNER', () => {
  it('ผ่าน validator ของตัวเอง', () => {
    expect(validateBannerConfig(STANDARD_BANNER)).toEqual({ valid: true })
  })

  it('อัตราออกรวมกันได้ 1.0 พอดี', () => {
    const total = STANDARD_BANNER.rates.reduce((sum, entry) => sum + entry.rate, 0)
    expect(total).toBeCloseTo(1.0, 10)
  })

  it('มีตัวละครในพูลตรงกับ rarity ที่การันตีตอน hard pity', () => {
    // ถ้าไม่มี pity จะการันตีสิ่งที่หยิบไม่ได้ — validator ไม่ได้เช็คข้อนี้ (ช่องว่างที่รู้อยู่)
    const guaranteed = STANDARD_BANNER.pool.filter(
      (entry) => entry.rarity === STANDARD_BANNER.pityGuaranteedRarity,
    )
    expect(guaranteed.length).toBeGreaterThan(0)
  })

  it('ทุก rarity ที่ประกาศอัตราไว้ มีตัวละครรองรับในพูล', () => {
    const inPool = new Set(STANDARD_BANNER.pool.map((entry) => entry.rarity))
    for (const entry of STANDARD_BANNER.rates) {
      expect(inPool.has(entry.rarity), `rarity ${entry.rarity} มีอัตราแต่ไม่มีตัวละคร`).toBe(true)
    }
  })

  it('BANNERS ลงทะเบียนไว้ด้วย id ของตัวเอง', () => {
    expect(BANNERS[STANDARD_BANNER.id]).toBe(STANDARD_BANNER)
  })
})

describe('validateBannerConfig', () => {
  it('ผ่านเมื่อทุกอย่างถูกต้อง', () => {
    expect(validateBannerConfig(banner())).toEqual({ valid: true })
  })

  // สองครึ่งของ `!banner.id || !banner.name` แยกกันคนละข้อ — ตัดครึ่งใดครึ่งหนึ่งทิ้งต้องมีข้อแดง
  it('ปฏิเสธเมื่อ id ว่าง', () => {
    expect(validateBannerConfig(banner({ id: '' }))).toEqual({
      valid: false,
      error: 'แบนเนอร์ต้องมี id และ name',
    })
  })

  it('ปฏิเสธเมื่อ name ว่าง', () => {
    expect(validateBannerConfig(banner({ name: '' }))).toEqual({
      valid: false,
      error: 'แบนเนอร์ต้องมี id และ name',
    })
  })

  // เช่นเดียวกับ `costSingle <= 0 || costMulti <= 0`
  it('ปฏิเสธเมื่อ costSingle เป็นศูนย์', () => {
    expect(validateBannerConfig(banner({ costSingle: 0 }))).toEqual({
      valid: false,
      error: 'ราคาเปิดกาชาต้องมากกว่า 0',
    })
  })

  it('ปฏิเสธเมื่อ costMulti ติดลบ', () => {
    expect(validateBannerConfig(banner({ costMulti: -1 }))).toEqual({
      valid: false,
      error: 'ราคาเปิดกาชาต้องมากกว่า 0',
    })
  })

  it('ยอมรับราคาที่มากกว่า 0 แม้จะน้อยมาก — เกตนี้กันแค่ศูนย์กับติดลบ', () => {
    // สำคัญ: ตัวนี้ทำให้ `<= 0` กลายเป็น `< 0` แล้วแดงไม่ได้ แต่ทำให้ `<= 0` -> `<= 1` แดง
    expect(validateBannerConfig(banner({ costSingle: 1, costMulti: 1 }))).toEqual({ valid: true })
  })

  it('ปฏิเสธเมื่อ pityThreshold เป็นศูนย์', () => {
    expect(validateBannerConfig(banner({ pityThreshold: 0 }))).toEqual({
      valid: false,
      error: 'เพดานการันตี (pityThreshold) ต้องมากกว่า 0',
    })
  })

  it('ยอมรับ pityThreshold = 1', () => {
    expect(validateBannerConfig(banner({ pityThreshold: 1 }))).toEqual({ valid: true })
  })

  it('ปฏิเสธเมื่ออัตรารวมไม่ถึง 1.0 และบอกยอดที่ได้จริงในข้อความ', () => {
    const result = validateBannerConfig(
      banner({
        rates: [
          { rarity: 'legendary', rate: 0.05 },
          { rarity: 'epic', rate: 0.25 },
        ],
      }),
    )
    expect(result.valid).toBe(false)
    // ตัวเลขในข้อความคือสิ่งที่ทำให้ debug ได้ ไม่ใช่แค่ "ไม่ผ่าน"
    expect(result.error).toContain('0.3')
  })

  it('ปฏิเสธเมื่ออัตรารวมเกิน 1.0', () => {
    const result = validateBannerConfig(
      banner({
        rates: [
          { rarity: 'legendary', rate: 0.5 },
          { rarity: 'epic', rate: 0.7 },
        ],
      }),
    )
    expect(result.valid).toBe(false)
  })

  /*
    ขอบของ tolerance 0.0001 — สองข้อนี้คร่อมเส้น ถ้าใครเปลี่ยนตัวเลข tolerance จะมีข้อหนึ่งแดง

    ⚠️ ที่จับไม่ได้และไม่ต้องไปไล่: การเปลี่ยน `> 0.0001` เป็น `>= 0.0001` เป็น equivalent
    mutant — ต้องมี totalRate ที่ทำให้ Math.abs(totalRate - 1.0) เท่ากับ 0.0001 **เป๊ะ** ถึงจะ
    แยกสองตัวนี้ออกจากกัน และไม่มีค่า float64 ไหนใกล้ 1 ที่ทำได้ (ไล่ ±40 ULP ทั้งสองฝั่งของ
    1±0.0001 แล้วไม่เจอสักตัว; (1+0.0001)-1 ได้ 9.9999999999988987e-5 ไม่ใช่ 1e-4)
    Stryker จะรายงานว่ามันรอดตลอดไป นั่นคือข้อจำกัดของเลขทศนิยม ไม่ใช่ช่องว่างของเทสต์
  */
  it('ยอมรับความคลาดเคลื่อน floating point ที่อยู่ในขอบ tolerance', () => {
    // 1.0001 ให้ Math.abs(total - 1.0) = 9.9999999999988987e-5 — อยู่ "ข้างใน" 0.0001
    // ไม่ใช่บนเส้นพอดี (บนเส้นพอดีแตะไม่ได้ ดูหมายเหตุ equivalent mutant ด้านบน)
    expect(validateBannerConfig(banner({ rates: [{ rarity: 'rare', rate: 1.0001 }] }))).toEqual({
      valid: true,
    })
  })

  it('ปฏิเสธเมื่อคลาดเคลื่อนเกิน tolerance', () => {
    const result = validateBannerConfig(banner({ rates: [{ rarity: 'rare', rate: 1.001 }] }))
    expect(result.valid).toBe(false)
  })

  it('ปฏิเสธเมื่อพูลว่างเปล่า', () => {
    expect(validateBannerConfig(banner({ pool: [] }))).toEqual({
      valid: false,
      error: 'รายการตัวละครในตู้สุ่มต้องไม่ว่างเปล่า',
    })
  })

  it('ยอมรับพูลที่มีตัวเดียว', () => {
    expect(
      validateBannerConfig(
        banner({ pool: [{ characterId: 'monkey-king', rarity: 'legendary', weight: 1 }] }),
      ),
    ).toEqual({ valid: true })
  })

  it('ตรวจ id/name ก่อนราคา — ข้อความที่คืนมาต้องเป็นข้อแรกที่ผิด ไม่ใช่ข้อสุดท้าย', () => {
    const result = validateBannerConfig(banner({ id: '', costSingle: 0, pool: [] }))
    expect(result.error).toBe('แบนเนอร์ต้องมี id และ name')
  })
})
