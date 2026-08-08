import { describe, expect, it } from 'vitest'
import {
  ENERGY_CONFIG,
  ENERGY_REFILL_CONFIG,
  canAffordStageEnergy,
  consumeStageEnergy,
  createDefaultEnergy,
  getStageEnergyCost,
  normalizeEnergy,
  refillEnergyToMaxWithGems,
  tickEnergyRegen,
} from './energySystem'
import { getRealtimeStage } from '../realtimeBattle/stageConfig'

describe('energySystem — §5.1 skeleton', () => {
  it('normalizeEnergy backfills legacy saves with full pool', () => {
    expect(normalizeEnergy(undefined).current).toBe(ENERGY_CONFIG.max)
  })

  it('tickEnergyRegen restores energy over elapsed real time', () => {
    const start = new Date('2026-08-08T00:00:00.000Z')
    const later = new Date('2026-08-08T02:00:00.000Z')
    const energy = createDefaultEnergy(start)
    energy.current = 0
    energy.lastRegenAt = start.toISOString()

    const ticked = tickEnergyRegen(energy, later)
    expect(ticked.current).toBe(ENERGY_CONFIG.regenPerHour * 2)
  })

  it('boss stages cost more than normal stages', () => {
    const normal = getRealtimeStage('trial-01')
    const boss = getRealtimeStage('trial-10')
    if (!normal || !boss) throw new Error('fixture missing')

    expect(getStageEnergyCost(boss)).toBeGreaterThan(getStageEnergyCost(normal))
  })

  it('consumeStageEnergy deducts cost after regen tick', () => {
    const stage = getRealtimeStage('trial-01')
    if (!stage) throw new Error('fixture missing')

    const before = createDefaultEnergy()
    const after = consumeStageEnergy(before, stage)
    expect(after.current).toBe(before.current - getStageEnergyCost(stage))
  })

  it('canAffordStageEnergy is false when pool is empty', () => {
    const stage = getRealtimeStage('trial-01')
    if (!stage) throw new Error('fixture missing')

    const empty = { ...createDefaultEnergy(), current: 0 }
    expect(canAffordStageEnergy(empty, stage)).toBe(false)
  })

  it('locked P11 pool: max 120, regen 60/hr, cost 10, boss 2×', () => {
    expect(ENERGY_CONFIG.max).toBe(120)
    expect(ENERGY_CONFIG.regenPerHour).toBe(60)
    expect(ENERGY_CONFIG.costPerStage).toBe(10)
    expect(ENERGY_CONFIG.bossCostMultiplier).toBe(2)

    const boss = getRealtimeStage('trial-10')
    if (!boss) throw new Error('fixture missing')
    expect(getStageEnergyCost(boss)).toBe(20)
  })

  it('refillEnergyToMaxWithGems spends gems and fills pool', () => {
    const low = { ...createDefaultEnergy(), current: 10 }
    const result = refillEnergyToMaxWithGems(low, ENERGY_REFILL_CONFIG.gemCostFullRefill)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.energy.current).toBe(ENERGY_CONFIG.max)
      expect(result.gemsSpent).toBe(ENERGY_REFILL_CONFIG.gemCostFullRefill)
    }
  })

  it('refillEnergyToMaxWithGems rejects when gems insufficient or pool full', () => {
    const full = createDefaultEnergy()
    expect(refillEnergyToMaxWithGems(full, 999).ok).toBe(false)

    const low = { ...createDefaultEnergy(), current: 5 }
    expect(refillEnergyToMaxWithGems(low, 0).ok).toBe(false)
  })
})
