/** สุ่มจำนวนเต็มระหว่าง min–max รวมปลายทาง */
export function rollInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** ดาเมจพื้นฐานจาก atk/def พร้อม variance ±12% */
export function calcPhysicalDamage(atk: number, def: number, multiplier = 1): number {
  const variance = 0.88 + Math.random() * 0.24
  const raw = atk * multiplier * variance - def * 0.42
  return Math.max(1, Math.floor(raw))
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
