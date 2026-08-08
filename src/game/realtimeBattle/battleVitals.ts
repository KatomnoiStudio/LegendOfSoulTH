/**
 * Battle vitals helpers — derive HUD ratios from authoritative runtime HP only.
 * Presentation layer; never duplicate HP state in React.
 */

export function deriveHpRatio(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0
  const ratio = currentHp / maxHp
  if (ratio <= 0) return 0
  if (ratio >= 1) return 1
  return ratio
}

/** Primary living enemy for top-right HUD vitals (stable order = spawn order). */
export function selectPrimaryEnemyHpTarget<T extends { id: string; hp: number; state: string }>(
  enemies: readonly T[],
): T | null {
  return enemies.find((enemy) => enemy.hp > 0 && enemy.state !== 'dead') ?? null
}
