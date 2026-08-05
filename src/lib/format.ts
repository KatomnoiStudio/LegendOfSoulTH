const numberFormatter = new Intl.NumberFormat('en-US')

/** 12450 -> "12,450" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** จำกัดตัวเลข badge ไม่ให้ล้นปุ่ม: 132 -> "99+" */
export function formatBadge(value: number): string {
  return value > 99 ? '99+' : String(value)
}

/** คืนค่า 0..1 สำหรับความคืบหน้าของแถบ EXP */
export function clampRatio(current: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.min(1, Math.max(0, current / total))
}
