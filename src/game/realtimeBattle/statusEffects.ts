import type { RealtimeBattleEntity } from './types'

/** ลด duration ของ CC/buff ที่ค้างอยู่บนหน่วย */
export function tickStatusEffects(entity: RealtimeBattleEntity, deltaMs: number): void {
  if (entity.activeCc?.length) {
    entity.activeCc = entity.activeCc
      .map((cc) => ({ ...cc, remainingMs: cc.remainingMs - deltaMs }))
      .filter((cc) => cc.remainingMs > 0)
  }
  if (entity.activeBuffs?.length) {
    entity.activeBuffs = entity.activeBuffs
      .map((buff) => ({ ...buff, remainingMs: buff.remainingMs - deltaMs }))
      .filter((buff) => buff.remainingMs > 0)
  }
}

/** stun/root ล็อกการควบคุม — แยกจาก knockdown ตาม §3.8.6 */
export function isCcLocked(entity: RealtimeBattleEntity): boolean {
  return (entity.activeCc ?? []).some(
    (cc) => cc.remainingMs > 0 && (cc.ccType === 'stun' || cc.ccType === 'root'),
  )
}
