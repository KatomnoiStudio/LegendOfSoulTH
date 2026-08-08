import { describe, expect, it } from 'vitest'
import {
  COMBAT_BUTTON_SIZES,
  COMBAT_CLUSTER_POLAR,
  DEFAULT_COMBAT_UI_LAYOUT,
  MIN_BUTTON_GAP_PX,
  buttonPolarPosition,
  clusterButtonsCollide,
  layoutCssVars,
  resolveClusterOffsets,
  type CombatClusterSlot,
} from './combatUILayout'

function polarDistance(offset: { right: number; bottom: number }): number {
  return Math.hypot(offset.right, offset.bottom)
}

function pairCollides(
  offsets: Record<CombatClusterSlot, { right: number; bottom: number }>,
  sizes: Record<CombatClusterSlot, number>,
  a: CombatClusterSlot,
  b: CombatClusterSlot,
  minGap = MIN_BUTTON_GAP_PX,
): boolean {
  return clusterButtonsCollide(
    { [a]: offsets[a], [b]: offsets[b] } as Record<
      CombatClusterSlot,
      { right: number; bottom: number }
    >,
    { [a]: sizes[a], [b]: sizes[b] } as Record<CombatClusterSlot, number>,
    minGap,
  )
}

describe('combatUILayout polar cluster', () => {
  it('ULT uses a larger radius than S3', () => {
    const ult = COMBAT_CLUSTER_POLAR.find((slot) => slot.slot === 'ultimate')
    const s3 = COMBAT_CLUSTER_POLAR.find((slot) => slot.slot === 'skill3')
    expect(ult?.radiusMul).toBeGreaterThan(s3?.radiusMul ?? 0)
  })

  it('ULT sits farther from ATK than S3 (Euclidean distance)', () => {
    const attackSize = COMBAT_BUTTON_SIZES.attack
    const gap = attackSize * DEFAULT_COMBAT_UI_LAYOUT.clusterGapRatio
    const offsets = resolveClusterOffsets(attackSize, gap)
    expect(polarDistance(offsets.ultimate)).toBeGreaterThan(polarDistance(offsets.skill3))
    expect(offsets.ultimate.bottom).toBeGreaterThan(offsets.skill3.bottom)
  })

  it('default layout keeps ULT separated from S3 and ATK', () => {
    const attackSize = COMBAT_BUTTON_SIZES.attack * DEFAULT_COMBAT_UI_LAYOUT.attackScale
    const gap = attackSize * DEFAULT_COMBAT_UI_LAYOUT.clusterGapRatio
    const offsets = resolveClusterOffsets(attackSize, gap)
    const sizes = {
      attack: attackSize,
      skill1: COMBAT_BUTTON_SIZES.skill * DEFAULT_COMBAT_UI_LAYOUT.skillScale,
      skill2: COMBAT_BUTTON_SIZES.skill * DEFAULT_COMBAT_UI_LAYOUT.skillScale,
      skill3: COMBAT_BUTTON_SIZES.skill * DEFAULT_COMBAT_UI_LAYOUT.skillScale,
      ultimate: COMBAT_BUTTON_SIZES.ultimate * DEFAULT_COMBAT_UI_LAYOUT.ultimateScale,
    }

    expect(pairCollides(offsets, sizes, 'ultimate', 'skill3')).toBe(false)
    expect(pairCollides(offsets, sizes, 'ultimate', 'attack')).toBe(false)
  })

  it('layoutCssVars emits polar offsets for every slot', () => {
    const vars = layoutCssVars()
    for (const slot of COMBAT_CLUSTER_POLAR) {
      expect(vars[`--combat-polar-${slot.slot}-right`]).toMatch(/px$/)
      expect(vars[`--combat-polar-${slot.slot}-bottom`]).toMatch(/px$/)
    }
  })

  it('buttonPolarPosition returns anchor at zero radius', () => {
    expect(buttonPolarPosition(92, 32, 0)).toEqual({ right: 0, bottom: 0 })
  })
})
