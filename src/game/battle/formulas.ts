/** สัดส่วนลดดาเมจจากเกราะ (armor mitigation coefficient) */
export const ARMOR_MITIGATION = 0.42

/** ความแปรปรวนของดาเมจ ±12% */
export const DAMAGE_VARIANCE = 0.12

/** ดาเมจขั้นต่ำ — ต่อให้เกราะหนากว่าพลังโจมตีมาก ก็ต้องเข้าอย่างน้อย 1 */
export const MINIMUM_DAMAGE = 1

/** สุ่มจำนวนเต็มระหว่าง min–max รวมปลายทาง */
export function rollInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** ดาเมจพื้นฐานจาก atk/def พร้อม variance ±12% */
export function calcPhysicalDamage(atk: number, def: number, multiplier = 1): number {
  const variance = 1 - DAMAGE_VARIANCE + Math.random() * (DAMAGE_VARIANCE * 2)
  const raw = atk * multiplier * variance - def * ARMOR_MITIGATION
  return Math.max(MINIMUM_DAMAGE, Math.floor(raw))
}

/** ดาเมจหลังหักโหมดป้องกัน */
export function applyDefense(damage: number, defending: boolean): number {
  if (!defending) return damage
  return Math.max(1, Math.floor(damage * 0.5))
}

/** คำนวณ HP สูงสุดจากเลเวลและ def */
export function calcMaxHp(level: number, def: number): number {
  return Math.floor(180 + level * 14 + def * 1.8)
}
