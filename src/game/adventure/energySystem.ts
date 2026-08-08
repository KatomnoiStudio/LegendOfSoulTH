import type { RealtimeBattleStage } from '../realtimeBattle/stageConfig'
import type { PlayerEnergy } from '../../types/player'

/**
 * Energy/stamina — §5.1 locked numerics (Ring 0 / P11, HetCreep 2026-08-09).
 * Pool size, regen rate, and per-stage cost are production values; tune via this file only.
 */
export const ENERGY_CONFIG = {
  max: 120,
  /** Energy restored per hour of real time */
  regenPerHour: 60,
  /** Base cost per normal stage attempt */
  costPerStage: 10,
  /** Boss-tagged stages multiply base cost by this factor */
  bossCostMultiplier: 2,
} as const

/** Gem refill skeleton — §5.1 premium refill source (UI wiring deferred). */
export const ENERGY_REFILL_CONFIG = {
  /** Gems spent to refill the pool to max in one action */
  gemCostFullRefill: 50,
} as const

export function createDefaultEnergy(now = new Date()): PlayerEnergy {
  return {
    current: ENERGY_CONFIG.max,
    max: ENERGY_CONFIG.max,
    lastRegenAt: now.toISOString(),
  }
}

/** Backfill accounts created before the energy field existed */
export function normalizeEnergy(energy: PlayerEnergy | undefined, now = new Date()): PlayerEnergy {
  if (!energy || typeof energy.current !== 'number' || typeof energy.max !== 'number') {
    return createDefaultEnergy(now)
  }
  return {
    current: Math.min(energy.max, Math.max(0, energy.current)),
    max: energy.max > 0 ? energy.max : ENERGY_CONFIG.max,
    lastRegenAt: energy.lastRegenAt ?? now.toISOString(),
  }
}

/** Apply passive regen since lastRegenAt — pure, deterministic given `now` */
export function tickEnergyRegen(energy: PlayerEnergy, now = new Date()): PlayerEnergy {
  const normalized = normalizeEnergy(energy, now)
  const lastMs = Date.parse(normalized.lastRegenAt)
  if (Number.isNaN(lastMs)) {
    return { ...normalized, lastRegenAt: now.toISOString() }
  }

  const elapsedMs = Math.max(0, now.getTime() - lastMs)
  const regenAmount = (ENERGY_CONFIG.regenPerHour * elapsedMs) / 3_600_000
  if (regenAmount <= 0) return normalized

  return {
    ...normalized,
    current: Math.min(normalized.max, normalized.current + regenAmount),
    lastRegenAt: now.toISOString(),
  }
}

export function getStageEnergyCost(stage: RealtimeBattleStage): number {
  const base = stage.energyCost ?? ENERGY_CONFIG.costPerStage
  return stage.isBoss ? base * ENERGY_CONFIG.bossCostMultiplier : base
}

export function canAffordStageEnergy(energy: PlayerEnergy, stage: RealtimeBattleStage): boolean {
  const ticked = tickEnergyRegen(energy)
  return ticked.current >= getStageEnergyCost(stage)
}

export function consumeStageEnergy(energy: PlayerEnergy, stage: RealtimeBattleStage): PlayerEnergy {
  const ticked = tickEnergyRegen(energy)
  const cost = getStageEnergyCost(stage)
  return {
    ...ticked,
    current: Math.max(0, ticked.current - cost),
  }
}

export type EnergyGemRefillResult =
  | { ok: true; energy: PlayerEnergy; gemsSpent: number }
  | { ok: false; reason: 'insufficient_gems' | 'already_full' }

/**
 * Refill energy to max using gems — pure predicate; caller debits gems via earnGold/grant ledger.
 */
export function refillEnergyToMaxWithGems(
  energy: PlayerEnergy,
  gemBalance: number,
  now = new Date(),
): EnergyGemRefillResult {
  const ticked = tickEnergyRegen(energy, now)
  if (ticked.current >= ticked.max) {
    return { ok: false, reason: 'already_full' }
  }
  if (gemBalance < ENERGY_REFILL_CONFIG.gemCostFullRefill) {
    return { ok: false, reason: 'insufficient_gems' }
  }
  return {
    ok: true,
    energy: { ...ticked, current: ticked.max, lastRegenAt: now.toISOString() },
    gemsSpent: ENERGY_REFILL_CONFIG.gemCostFullRefill,
  }
}
