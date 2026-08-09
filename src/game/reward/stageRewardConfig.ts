import type { RewardDefinition } from './rewardSchema'

/**
 * Per-stage lobby battle rewards — Chapter 1 (P11, Ring 0 locked numerics 2026-08-09).
 * Dungeon rewards stay in rewardConfig.ts; lobby/adventure stages resolve here.
 */
export const STAGE_REWARD_DEFINITIONS: Record<string, RewardDefinition> = {
  'trial-01': {
    sourceId: 'trial-01-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 40 },
      { type: 'heroExp', amount: 70 },
      { type: 'item', itemId: 'iron-essence', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 30 },
          { type: 'item', itemId: 'healing-peach', quantity: 1 },
        ],
      },
    ],
  },
  'trial-02': {
    sourceId: 'trial-02-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 55 },
      { type: 'heroExp', amount: 90 },
      { type: 'item', itemId: 'iron-essence', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 40 },
          { type: 'item', itemId: 'spirit-incense', quantity: 1 },
        ],
      },
    ],
  },
  'trial-03': {
    sourceId: 'trial-03-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 60 },
      { type: 'heroExp', amount: 95 },
      { type: 'item', itemId: 'spirit-incense', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 45 },
          { type: 'item', itemId: 'iron-essence', quantity: 2 },
        ],
      },
    ],
  },
  'trial-04': {
    sourceId: 'trial-04-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 70 },
      { type: 'heroExp', amount: 105 },
      { type: 'item', itemId: 'iron-essence', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 50 },
          { type: 'item', itemId: 'healing-peach', quantity: 1 },
        ],
      },
    ],
  },
  'trial-05': {
    sourceId: 'trial-05-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 80 },
      { type: 'heroExp', amount: 115 },
      { type: 'item', itemId: 'spirit-incense', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 55 },
          { type: 'item', itemId: 'iron-essence', quantity: 2 },
        ],
      },
    ],
  },
  'trial-06': {
    sourceId: 'trial-06-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 85 },
      { type: 'heroExp', amount: 120 },
      { type: 'item', itemId: 'spirit-incense', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 60 },
          { type: 'item', itemId: 'healing-peach', quantity: 2 },
        ],
      },
    ],
  },
  'trial-07': {
    sourceId: 'trial-07-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 75 },
      { type: 'heroExp', amount: 110 },
      { type: 'item', itemId: 'iron-essence', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 55 },
          { type: 'item', itemId: 'spirit-incense', quantity: 1 },
        ],
      },
    ],
  },
  'trial-08': {
    sourceId: 'trial-08-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 100 },
      { type: 'heroExp', amount: 140 },
      { type: 'item', itemId: 'spirit-incense', quantity: 2 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 80 },
          { type: 'item', itemId: 'iron-essence', quantity: 3 },
        ],
      },
    ],
  },
  'trial-09': {
    sourceId: 'trial-09-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 90 },
      { type: 'heroExp', amount: 130 },
      { type: 'item', itemId: 'iron-essence', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 70 },
          { type: 'item', itemId: 'healing-peach', quantity: 2 },
        ],
      },
    ],
  },
  'trial-10': {
    sourceId: 'trial-10-clear',
    guaranteed: [
      { type: 'currency', currencyId: 'gold', amount: 150 },
      { type: 'heroExp', amount: 200 },
      { type: 'item', itemId: 'spirit-incense', quantity: 2 },
      { type: 'item', itemId: 'healing-peach', quantity: 1 },
    ],
    conditional: [
      {
        condition: { kind: 'firstClear' },
        entries: [
          { type: 'currency', currencyId: 'gold', amount: 150 },
          { type: 'item', itemId: 'iron-essence', quantity: 5 },
        ],
      },
    ],
  },
}

/** Bonus per wave cleared — stacks on top of stage table (all chapter-1 stages). */
export const STAGE_WAVE_CLEAR_BONUS = { gold: 15, exp: 25 } as const

export function getStageRewardDefinition(stageId: string): RewardDefinition | null {
  return STAGE_REWARD_DEFINITIONS[stageId] ?? null
}
