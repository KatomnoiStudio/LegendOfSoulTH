import type { Player } from '../../types/player'
import type { SkillSlotId } from './progressionSchema'
import { getSkillSlotLevel, sanitizeOwnedCharacter } from './progressionMigration'
import {
  AWAKENING_TIER_FIXTURE_COSTS,
  TALENT_NODE_FIXTURES,
  type SkillUpgradeCost,
} from './progressionConfig'
import { getSkillProgressionDefinition, getSkillUpgradeCost } from './skillProgressionResolver'

/**
 * ประกอบคำขออัปเกรดที่จะส่งไป RPC `spend_progression_upgrade`
 *
 * ── ทำไมเป็นแค่ "ประกอบคำขอ" ไม่ใช่ "ตัดสินว่าอัปได้ไหม" ──────────────────────────────────
 * กติกาจริงบังคับที่ฝั่งเซิร์ฟเวอร์ ไม่ใช่ที่นี่ — ฝั่งนี้เหลือหน้าที่เดียวคือบอกว่า "จะอัปอะไร
 * จากระดับไหน" ให้ตรงกับที่เซิร์ฟเวอร์จะอ่านเจอ ส่วนราคา **ไม่ส่งไปเลย** เซิร์ฟเวอร์อ่านจาก
 * `progression_cost_catalog` ของตัวเอง (`goldCost` ที่คืนกลับมาที่นี่มีไว้โชว์บนจอเท่านั้น
 * ไม่ได้เดินทางไปกับคำขอ)
 *
 * รายการที่เซิร์ฟเวอร์บังคับจริง ๆ ณ 20260810180000 — ตรวจกับตัว RPC ก่อนแก้ประโยคนี้:
 * ครอบครองฮีโร่ · ระดับปัจจุบันตรงกับที่อ้าง (compare-and-swap) · มีราคาในตาราง (= ยังไม่ถึง
 * max เพราะไม่มีแถวให้) · ทองพอ · พรสวรรค์ยังไม่เคยปลด · **prerequisite ของพรสวรรค์**
 *
 * ⚠️ ประโยคเดิมตรงนี้เคยเขียนว่า prerequisite "ถูกบังคับที่ฝั่งเซิร์ฟเวอร์ทั้งหมด" ตั้งแต่ก่อนที่
 * เซิร์ฟเวอร์จะมีเช็คนั้นจริง ๆ — ตอนนั้นไม่มีฝั่งไหนบังคับเลยสักฝั่ง เพราะ progressionService
 * ที่เคยเช็คกลายเป็น dead path ไปแล้ว ปลด mk-talent-2 ได้ทั้งที่ยังไม่มี mk-talent-1
 * (QC จับได้) ถ้าเพิ่มกติกาใหม่ให้ไปเพิ่มใน RPC ก่อน แล้วค่อยมาแก้รายการข้างบน
 *
 * `fromLevel` ที่ประกอบตรงนี้เป็น "คำอ้าง" ที่เซิร์ฟเวอร์เอาไปเทียบกับสถานะจริงแบบ
 * compare-and-swap — ส่งผิดคือถูกปฏิเสธ ไม่ใช่ถูกเชื่อ
 */
export type UpgradeTarget =
  { kind: 'skill'; slot: SkillSlotId } | { kind: 'talent'; nodeId: string } | { kind: 'awakening' }

export type UpgradePlan =
  | {
      ok: true
      kind: 'skill' | 'talent' | 'awakening'
      characterId: string
      upgradeKey: string
      fromLevel: number
      /** ไว้โชว์บนจอ — ไม่ได้ส่งไปกับคำขอ */
      goldCost: number
    }
  | { ok: false; error: string }

/**
 * ราคาที่มี materials ยังส่งไม่ได้ — ปฏิเสธ ไม่ใช่ปล่อยผ่านแล้วเก็บแต่ทอง
 *
 * ตาราง `progression_cost_catalog` คิดราคาเป็นทองอย่างเดียว (ทุก fixture วันนี้เป็นทองล้วน)
 * ถ้ามีใครเพิ่ม material cost ในอนาคตแล้วโค้ดนี้เงียบ ๆ ส่งไปตามปกติ ผู้เล่นจะได้อัปเกรดโดย
 * ไม่เสีย material เลย — บั๊กตัวเดียวกับที่ทั้งงานนี้กำลังปิดอยู่ กลับมาในรูปใหม่
 * (src/data/progressionCostParity.test.ts ยืนยันว่ายังไม่มี fixture ไหนมี materials)
 */
function rejectMaterialCost(cost: SkillUpgradeCost): string | null {
  if ((cost.materials ?? []).length === 0) return null
  return 'การอัปเกรดที่ใช้วัสดุยังไม่รองรับ'
}

export function planUpgrade(player: Player, heroId: string, target: UpgradeTarget): UpgradePlan {
  const owned = player.ownedCharacters.find((entry) => entry.characterId === heroId)
  if (!owned) return { ok: false, error: 'ยังไม่ได้ครอบครองฮีโร่นี้' }
  const sanitized = sanitizeOwnedCharacter(owned)

  if (target.kind === 'skill') {
    const definition = getSkillProgressionDefinition(heroId, target.slot)
    if (!definition) return { ok: false, error: 'สกิลนี้ยังไม่มีตารางอัปเกรด' }

    const fromLevel = getSkillSlotLevel(sanitized, target.slot)
    const cost = getSkillUpgradeCost(definition, fromLevel)
    if (!cost) return { ok: false, error: 'สกิลอยู่ที่ระดับสูงสุดแล้ว' }

    const materialError = rejectMaterialCost(cost)
    if (materialError) return { ok: false, error: materialError }

    return {
      ok: true,
      kind: 'skill',
      characterId: heroId,
      upgradeKey: target.slot,
      fromLevel,
      goldCost: cost.gold ?? 0,
    }
  }

  if (target.kind === 'talent') {
    const node = TALENT_NODE_FIXTURES.find(
      (entry) => entry.id === target.nodeId && entry.heroId === heroId,
    )
    if (!node) return { ok: false, error: 'ไม่พบพรสวรรค์นี้' }

    const cost = node.cost ?? {}
    const materialError = rejectMaterialCost(cost)
    if (materialError) return { ok: false, error: materialError }

    return {
      ok: true,
      kind: 'talent',
      characterId: heroId,
      upgradeKey: node.id,
      // พรสวรรค์ปลดครั้งเดียวจบ ไม่มีระดับ — เซิร์ฟเวอร์ใช้ "ปลดไปแล้วหรือยัง" เป็นตัวเทียบแทน
      fromLevel: 0,
      goldCost: cost.gold ?? 0,
    }
  }

  const fromTier = sanitized.awakeningState?.tier ?? 0
  const cost = AWAKENING_TIER_FIXTURE_COSTS[fromTier + 1]
  if (!cost) return { ok: false, error: 'ปลุกพลังถึงขั้นสูงสุดแล้ว' }

  const materialError = rejectMaterialCost(cost)
  if (materialError) return { ok: false, error: materialError }

  return {
    ok: true,
    kind: 'awakening',
    characterId: heroId,
    upgradeKey: '',
    fromLevel: fromTier,
    goldCost: cost.gold ?? 0,
  }
}
