import { getItem } from '../items'
import type { RewardDefinition, RewardEntry } from './rewardSchema'
import { REWARD_POOLS } from './rewardConfig'

const KNOWN_CURRENCIES = new Set(['gold', 'gem'])

export function validateRewardEntry(entry: RewardEntry): string | null {
  if ('amount' in entry) {
    const amount = entry.amount
    if (!Number.isFinite(amount) || amount < 0) return `invalid amount for ${entry.type}`
  }
  if ('quantity' in entry) {
    const qty = entry.quantity
    if (!Number.isFinite(qty) || qty < 1) return `invalid quantity for ${entry.type}`
  }
  switch (entry.type) {
    case 'currency':
      if (!KNOWN_CURRENCIES.has(entry.currencyId)) return `unknown currency: ${entry.currencyId}`
      break
    case 'item':
      if (!getItem(entry.itemId)) return `unknown item: ${entry.itemId}`
      break
    case 'resource':
      if (!entry.resourceId) return 'missing resourceId'
      break
    default:
      break
  }
  return null
}

export function validateRewardDefinition(def: RewardDefinition): string[] {
  const errors: string[] = []
  for (const entry of def.guaranteed ?? []) {
    const err = validateRewardEntry(entry)
    if (err) errors.push(err)
  }
  for (const cond of def.conditional ?? []) {
    for (const entry of cond.entries) {
      const err = validateRewardEntry(entry)
      if (err) errors.push(`${cond.condition.kind}: ${err}`)
    }
  }
  for (const pool of def.randomPools ?? []) {
    if (!REWARD_POOLS[pool.poolId]) errors.push(`unknown pool: ${pool.poolId}`)
    if (pool.rolls < 1) errors.push(`invalid rolls for pool ${pool.poolId}`)
  }
  return errors
}
