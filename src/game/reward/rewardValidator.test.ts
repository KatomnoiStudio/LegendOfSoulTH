import { describe, expect, test } from 'vitest'
import { validateRewardDefinition, validateRewardEntry } from './rewardValidator'
import type { RewardDefinition, RewardEntry } from './rewardSchema'

/**
 * Guards on a money path, tested from the side that REJECTS.
 *
 * Written 2026-08-16 after a gold-standard audit ran the mutation check this file had never
 * been subjected to: `rewardValidator.ts` had **zero tests anywhere in the repo**, and a
 * mutant disabling its negative/NaN rejection survived all 1185 tests. Nothing that computes
 * a value survived mutation; everything that refuses one did — the suite drove happy paths
 * and named regressions thoroughly and never drove a guard's refusal, so guards were free to
 * decay into decoration while staying green.
 *
 * Per `.agents/rules/mutation-verified-fix-law.md`: a guard clause on a currency, item or
 * gacha path ships with a test that drives its rejecting branch — the branch that returns
 * the error, not the one that returns the value.
 */

const validCurrency: RewardEntry = { type: 'currency', currencyId: 'gold', amount: 100 }

describe('validateRewardEntry — the rejecting branch of every guard', () => {
  test('a negative amount is rejected', () => {
    // Kills the mutant that flips `amount < 0` to `amount <= 0`, or drops the check entirely.
    expect(validateRewardEntry({ ...validCurrency, amount: -1 })).toMatch(/invalid amount/)
    expect(validateRewardEntry({ type: 'heroExp', amount: -0.5 })).toMatch(/invalid amount/)
  })

  test('a non-finite amount is rejected — NaN and both infinities', () => {
    // NaN is the one a comparison-only guard misses: `NaN < 0` is false, so `Number.isFinite`
    // is doing the work here and a mutant removing it leaves NaN sailing through into a ledger.
    expect(validateRewardEntry({ ...validCurrency, amount: Number.NaN })).toMatch(/invalid amount/)
    expect(validateRewardEntry({ ...validCurrency, amount: Number.POSITIVE_INFINITY })).toMatch(
      /invalid amount/,
    )
    expect(validateRewardEntry({ ...validCurrency, amount: Number.NEGATIVE_INFINITY })).toMatch(
      /invalid amount/,
    )
  })

  test('a quantity below one is rejected — zero included', () => {
    // The quantity floor is 1, not 0: granting "zero of an item" is a silent no-op reward.
    expect(validateRewardEntry({ type: 'item', itemId: 'iron-essence', quantity: 0 })).toMatch(
      /invalid quantity/,
    )
    expect(validateRewardEntry({ type: 'item', itemId: 'iron-essence', quantity: -3 })).toMatch(
      /invalid quantity/,
    )
    expect(
      validateRewardEntry({ type: 'item', itemId: 'iron-essence', quantity: Number.NaN }),
    ).toMatch(/invalid quantity/)
  })

  test('an unknown currency is rejected', () => {
    expect(validateRewardEntry({ ...validCurrency, currencyId: 'ticket' })).toMatch(
      /unknown currency/,
    )
  })

  test('an unknown item is rejected', () => {
    expect(validateRewardEntry({ type: 'item', itemId: 'not-a-real-item', quantity: 1 })).toMatch(
      /unknown item/,
    )
  })

  test('an empty resourceId is rejected', () => {
    expect(validateRewardEntry({ type: 'resource', resourceId: '', amount: 1 })).toMatch(
      /missing resourceId/,
    )
  })

  test('control: a well-formed entry of every type passes', () => {
    // Without this the tests above would still pass if the validator rejected everything.
    expect(validateRewardEntry(validCurrency)).toBeNull()
    expect(validateRewardEntry({ type: 'item', itemId: 'iron-essence', quantity: 1 })).toBeNull()
    expect(validateRewardEntry({ type: 'heroExp', amount: 0 })).toBeNull()
    expect(validateRewardEntry({ type: 'accountExp', amount: 250 })).toBeNull()
    expect(validateRewardEntry({ type: 'resource', resourceId: 'shard', amount: 2 })).toBeNull()
  })
})

describe('validateRewardDefinition — aggregation, not just the first failure', () => {
  test('collects every guaranteed error rather than stopping at the first', () => {
    const def: RewardDefinition = {
      sourceId: 'test',
      guaranteed: [
        { ...validCurrency, amount: -1 },
        { type: 'item', itemId: 'not-a-real-item', quantity: 1 },
      ],
    }
    expect(validateRewardDefinition(def)).toHaveLength(2)
  })

  test('a conditional error names the condition that carried it', () => {
    const def: RewardDefinition = {
      sourceId: 'test',
      conditional: [
        { condition: { kind: 'firstClear' }, entries: [{ ...validCurrency, amount: -1 }] },
      ],
    }
    expect(validateRewardDefinition(def)).toEqual(['firstClear: invalid amount for currency'])
  })

  test('an unknown pool and a rolls count below one are both rejected', () => {
    const def: RewardDefinition = {
      sourceId: 'test',
      randomPools: [{ poolId: 'no-such-pool', rolls: 0 }],
    }
    const errors = validateRewardDefinition(def)
    expect(errors).toHaveLength(2)
    expect(errors.join(' ')).toMatch(/unknown pool/)
    expect(errors.join(' ')).toMatch(/invalid rolls/)
  })

  test('control: a definition with nothing wrong returns no errors', () => {
    expect(validateRewardDefinition({ sourceId: 'test', guaranteed: [validCurrency] })).toEqual([])
    expect(validateRewardDefinition({ sourceId: 'test' })).toEqual([])
  })
})
