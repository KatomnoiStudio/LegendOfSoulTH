import { describe, expect, test } from 'vitest'
import { REALTIME_STAGES } from '../realtimeBattle/stageConfig'

/**
 * P1.10b — build check ของ ECONOMY-DESIGN-LOCK
 *
 * P1.10 ล็อกว่าไอเทมดรอปผูกกับ `(ชุดศัตรู × tier)` และ tier ตัดจาก `difficultyMultiplier`
 * ที่มีอยู่แล้วโดยไม่เพิ่มฟิลด์ต่อด่าน ผลที่ตามมาคือ **สองด่านที่มีชุดศัตรูเดียวกันและตกอยู่ใน
 * tier เดียวกัน จะดรอปของชุดเดียวกันเป๊ะ** — ด่านซ้ำในสายตาผู้เล่น
 *
 * เทสต์นี้เปลี่ยนความกังวลนั้นเป็นตัวเลขที่ build ตรวจได้: นับตัวตนดรอปที่ต่างกันทั้งบท
 * แล้วกันไม่ให้ลดลงเมื่อเพิ่ม content — และตอนพัง ต้องบอกว่าด่านไหนยุบเข้าหากัน ไม่ใช่แค่ว่าเลขตก
 */

/**
 * ขอบเขต tier ตาม P1.10 — `dm < 1.04` → 1 · `1.04 ≤ dm < 1.11` → 2 · `dm ≥ 1.11` → 3
 *
 * **วันนี้นี่คือบ้านเดียวของขอบเขตนี้ในโค้ด** (`grep 1.04|1.11` เจอแค่ที่นี่ กับ `damageScale`
 * ที่ไม่เกี่ยวกันใน `progressionConfig.ts`) เพราะ `drops[ศัตรู][tier]` ยังไม่ถูก implement
 *
 * **ตอน implement ต้องย้ายสองตัวนี้ไปอยู่กับ implementation แล้วให้เทสต์ import กลับ — ห้าม
 * พิมพ์ `1.04/1.11` ซ้ำที่นั่น** P1.1 เขียนไว้ตรง ๆ ว่ามีเลขซ้ำเมื่อไหร่ = มีแหล่งความจริงที่สอง
 * และเคสนี้พังแบบเงียบ: จูนขอบเขตแล้วขยับแค่ก๊อบปี้เดียว build check จะยังเขียวโดยวัดของเก่า
 */
const TIER_CUTS = [1.04, 1.11] as const

/**
 * วัดแล้ว 2026-08-15 และ **7 คือค่าสูงสุดที่เป็นไปได้ของทุกแบบสองขอบเขต** ไม่ใช่แค่ของ 1.04/1.11
 * (เสมอกับ 1.05/1.08, 1.05/1.1, 1.05/1.12 — กวาดครบทุกคู่ที่คั่นระหว่างค่า dm ที่ ship จริง)
 *
 * เพดานสัมบูรณ์คือ 9 ไม่ใช่ 10 แม้ให้ tier ละค่า dm: `trial-04` กับ `trial-09` มีทั้งชุดศัตรู
 * และ `dm` เท่ากันเป๊ะ **ไม่มีระบบ tier ไหนแยกของที่เหมือนกันจริงได้** — ต้นเหตุคือศัตรู 4 ชุด
 * สำหรับ 10 ด่าน ซึ่งเป็นงาน content ไม่ใช่งานระบบดรอป
 */
const CHAPTER_1_REFERENCE = 7

function tierOf(dm: number): 1 | 2 | 3 {
  if (dm < TIER_CUTS[0]) return 1
  if (dm < TIER_CUTS[1]) return 2
  return 3
}

interface DropIdentity {
  key: string
  stageIds: string[]
}

function dropIdentitiesOf(chapterId: string): DropIdentity[] {
  const byKey = new Map<string, string[]>()

  for (const stage of Object.values(REALTIME_STAGES)) {
    if (stage.chapterId !== chapterId) continue
    const enemySet = [...new Set(stage.waves.flatMap((w) => w.enemies.map((e) => e.templateId)))]
      .toSorted()
      .join('+')
    const key = `${enemySet} @ tier ${tierOf(stage.difficultyMultiplier ?? 1)}`
    byKey.set(key, [...(byKey.get(key) ?? []), stage.id])
  }

  return [...byKey.entries()].map(([key, stageIds]) => ({ key, stageIds }))
}

describe('P1.10b — drop identity per chapter', () => {
  test('chapter-1 keeps at least its reference count of distinct drop identities', () => {
    const identities = dropIdentitiesOf('chapter-1')
    const collapsed = identities.filter((i) => i.stageIds.length > 1)

    expect(
      identities.length,
      `ตัวตนดรอปที่ต่างกันลดลงต่ำกว่าค่าอ้างอิง P1.10b\n` +
        `ที่ยุบเข้าหากัน:\n` +
        collapsed.map((i) => `  ${i.stageIds.join(' = ')}  (${i.key})`).join('\n'),
    ).toBeGreaterThanOrEqual(CHAPTER_1_REFERENCE)
  })

  test('the known collapses are the ones P1.10a already names, and no others appeared', () => {
    // ไม่ใช่การยอมรับว่าซ้ำได้ — เป็นการตรึงรายการที่รู้อยู่แล้วไว้ ถ้ามีคู่ใหม่โผล่ เทสต์นี้พัง
    // ก่อนที่จะมีใครสังเกตว่าด่านใหม่ดรอปเหมือนด่านเก่า
    const collapsed = dropIdentitiesOf('chapter-1')
      .filter((i) => i.stageIds.length > 1)
      .map((i) => i.stageIds.join(','))
      .toSorted()

    expect(collapsed).toEqual(['trial-02,trial-04,trial-05,trial-09'])
  })

  test('every chapter-1 stage lands in exactly one identity', () => {
    const identities = dropIdentitiesOf('chapter-1')
    const total = identities.reduce((sum, i) => sum + i.stageIds.length, 0)
    const stageCount = Object.values(REALTIME_STAGES).filter(
      (s) => s.chapterId === 'chapter-1',
    ).length

    expect(total).toBe(stageCount)
    expect(new Set(identities.flatMap((i) => i.stageIds)).size).toBe(stageCount)
  })
})
