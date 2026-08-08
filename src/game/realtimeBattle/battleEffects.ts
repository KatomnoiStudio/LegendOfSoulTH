import type { AttackDefinition } from './attacks'
import { resolveEffect, type EffectContext } from './EffectsSystem'
import type { RealtimeBattleEntity } from './types'

/**
 * ใช้ effects[] ของท่าโจมตี/สกิลในห้องต่อสู้ — คืนหน่วย summon ที่เกิดใหม่
 */
export function applyAttackEffects(
  attack: AttackDefinition,
  ctx: EffectContext,
  uniqueSuffix: string,
): RealtimeBattleEntity[] {
  if (!attack.effects?.length) return []

  const spawned: RealtimeBattleEntity[] = []
  for (const [index, effect] of attack.effects.entries()) {
    const summon = resolveEffect(effect, ctx, `${uniqueSuffix}-${index}`)
    if (summon) spawned.push(summon)
  }
  return spawned
}
