import { describe, expect, test } from 'vitest'
import type { Player } from '../../types/player'
import { createRealtimeBattle } from './createRealtimeBattle'
import { applyBattleExp, calculateBattleReward } from './RewardSystem'
import { createDefaultSkillLevels } from './SkillProgressionSystem'
import { applyHeroExpToLeadHero } from '../progression/progressionService'

function stubPlayer(): Player {
  return {
    id: 'p1',
    uid: '1234567890',
    name: 'ทดสอบ',
    title: 'ผู้จาริกหน้าใหม่',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 1,
        exp: 0,
        expToNext: 500,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'arcane',
    progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
  }
}

describe('calculateBattleReward', () => {
  test('defeat yields zero rewards', () => {
    const state = createRealtimeBattle('trial-01', stubPlayer())
    if (!state) throw new Error('expected battle state')
    state.defeatedEnemyIds = state.enemies.map((e) => e.id)
    expect(calculateBattleReward(state, 'defeat')).toEqual({
      earnedExp: 0,
      earnedGold: 0,
      droppedItems: [],
    })
  })

  test('victory scales with stage table and is deterministic', () => {
    const state = createRealtimeBattle('trial-01', stubPlayer())
    if (!state) throw new Error('expected battle state')
    state.defeatedEnemyIds = state.enemies.map((e) => e.id)
    state.currentWaveIndex = 0

    const a = calculateBattleReward(state, 'victory')
    const b = calculateBattleReward(state, 'victory')
    expect(a).toEqual(b)
    // trial-01 table: 40 gold + 15 wave + 70 exp + 25 wave
    expect(a.earnedGold).toBe(55)
    expect(a.earnedExp).toBe(95)
    expect(a.droppedItems).toEqual([{ itemId: 'iron-essence', quantity: 1 }])
  })

  test('first-clear bonus applies when flagged', () => {
    const state = createRealtimeBattle('trial-01', stubPlayer())
    if (!state) throw new Error('expected battle state')
    state.currentWaveIndex = 0

    const repeat = calculateBattleReward(state, 'victory', { isFirstClear: false })
    const first = calculateBattleReward(state, 'victory', { isFirstClear: true })
    expect(first.earnedGold).toBeGreaterThan(repeat.earnedGold)
    expect(first.droppedItems).toEqual(
      expect.arrayContaining([
        { itemId: 'iron-essence', quantity: 1 },
        { itemId: 'healing-peach', quantity: 1 },
      ]),
    )
  })

  test('Done-criterion 3: calculateBattleReward does not mutate its state argument', () => {
    const state = createRealtimeBattle('trial-01', stubPlayer())
    if (!state) throw new Error('expected battle state')
    state.defeatedEnemyIds = state.enemies.map((e) => e.id)
    state.currentWaveIndex = 1

    const stateClone = JSON.parse(JSON.stringify(state))
    calculateBattleReward(state, 'victory')
    expect(state).toEqual(stateClone)
  })

  test('Done-criterion 5: droppedItems ids only contain approved materials/consumables and no equipment/affixes', () => {
    const state = createRealtimeBattle('trial-05', stubPlayer())
    if (!state) throw new Error('expected battle state')
    state.defeatedEnemyIds = state.enemies.map((e) => e.id)
    state.currentWaveIndex = 2

    const reward = calculateBattleReward(state, 'victory', { isFirstClear: true })
    const approvedIds = new Set(['iron-essence', 'spirit-incense', 'healing-peach'])

    expect(reward.droppedItems.length).toBeGreaterThan(0)
    for (const item of reward.droppedItems) {
      expect(approvedIds.has(item.itemId)).toBe(true)
    }
  })
})

describe('applyBattleExp', () => {
  test('levels up player and lead character when crossing threshold', () => {
    const next = applyBattleExp(stubPlayer(), 100)
    expect(next.level).toBe(2)
    expect(next.exp).toBe(0)
    expect(next.expToNext).toBe(120)

    // design-lock item 12: hero-level EXP now runs through the same locked curve Dungeon
    // rewards use (progressionConfig.PLACEHOLDER_HERO_EXP_TABLE), not a `*1.2` loop reading
    // whatever expToNext happens to be stored on the character. stubPlayer()'s monkey-king
    // is deliberately seeded with expToNext:500 — a value the OLD inline loop trusted and
    // this test used to level 0 times against. The locked table says level 1 costs 100, so
    // 100 EXP levels the hero to 2 regardless of what was stored. If this ever regresses to
    // trusting the stored field again, this assertion is what catches it.
    expect(next.ownedCharacters[0]?.level).toBe(2)
    expect(next.ownedCharacters[0]?.exp).toBe(0)
    expect(next.ownedCharacters[0]?.expToNext).toBe(150)
  })

  test('hero and account EXP curves agree with the Dungeon reward path for the same amount', () => {
    // The defect item 12 found: the same "earnedExp" produced two different hero levels
    // depending on whether it came from a Lobby battle (this function) or a Dungeon battle
    // (rewardGrantService.ts, via applyHeroExpToLeadHero directly). Proven equal here by
    // driving both paths with an amount large enough to cross several levels and comparing
    // the resulting hero level/exp/expToNext, not just asserting against a hand-derived number.
    const lobbyResult = applyBattleExp(stubPlayer(), 900)

    const dungeonPlayer = stubPlayer()
    const dungeonResult = applyHeroExpToLeadHero(dungeonPlayer, 900).player

    expect(lobbyResult.ownedCharacters[0]).toEqual(dungeonResult.ownedCharacters[0])
    // Sanity: this must actually cross a level, or the two paths could agree trivially by
    // both doing nothing.
    expect(lobbyResult.ownedCharacters[0]?.level).toBeGreaterThan(1)
  })

  test('zero exp is a no-op', () => {
    const player = stubPlayer()
    expect(applyBattleExp(player, 0)).toBe(player)
  })

  test('a boss out-pays the weakest mob — bosses live in their own registry and were missing it', () => {
    // rewardForTemplate asked getEnemyTemplate only, so spirit-guardian-boss (BOSS_TEMPLATES,
    // maxHp 1400) matched neither TEMPLATE_REWARD nor the maxHp fallback and landed on DEFAULT
    // 20 gold / 35 exp — below shadow-soldier's hand-written 22/40 at maxHp 210. The invariant,
    // not the constants, is what this guards: a 6.7x tougher enemy must not pay less.
    //
    // p5-boss-arena is used because it carries the boss and is absent from
    // STAGE_REWARD_DEFINITIONS, so calculateBattleReward runs the per-enemy loop instead of
    // short-circuiting on the per-stage table the way every trial-NN stage does.
    const bossState = createRealtimeBattle('p5-boss-arena', stubPlayer())
    if (!bossState) throw new Error('expected boss battle state')
    bossState.defeatedEnemyIds = bossState.enemies.map((e) => e.id)
    const bossReward = calculateBattleReward(bossState, 'victory')

    const mobState = createRealtimeBattle('p5-elite-arena', stubPlayer())
    if (!mobState) throw new Error('expected mob battle state')
    mobState.defeatedEnemyIds = [mobState.enemies[0].id]
    const oneMobReward = calculateBattleReward(mobState, 'victory')

    expect(bossReward.earnedExp).toBeGreaterThan(oneMobReward.earnedExp)
    expect(bossReward.earnedGold).toBeGreaterThan(oneMobReward.earnedGold)
    // maxHp 1400 through the shared fallback: 1400/5 exp and 1400/8 gold, plus one wave clear.
    expect(bossReward.earnedExp).toBe(280 + 25)
    expect(bossReward.earnedGold).toBe(175 + 15)
  })

  test('a lead hero the player does not own skips hero EXP instead of losing the whole reward', () => {
    // Regression guard for a side effect design-lock 12.a introduced. Routing hero EXP through
    // progressionService means applyHeroExp's `throw new Error('Unknown hero: ...')` became
    // reachable from the reward path — and the inline loop it replaced never threw, it just
    // matched nothing.
    //
    // Neither lobbyBattleRewardPipeline nor the LobbyBattleSession effect that drives it catches,
    // so an account whose teamSlots and ownedCharacters disagree (a half-applied grant, a
    // migration that dropped a character) would lose gold and items too — not just the hero EXP
    // that genuinely has nowhere to land.
    const orphaned: Player = { ...stubPlayer(), ownedCharacters: [] }

    const next = applyBattleExp(orphaned, 100)

    expect(next.level).toBe(2) // account EXP still applied
    expect(next.ownedCharacters).toEqual([])
  })

  test('Done-criterion 4: applyBattleExp does not write or mutate currency or inventory fields', () => {
    const originalPlayer = stubPlayer()
    const currencyClone = { ...originalPlayer.currency }
    const inventoryClone = [...originalPlayer.inventory]

    const nextPlayer = applyBattleExp(originalPlayer, 250)

    expect(nextPlayer.currency).toEqual(currencyClone)
    expect(nextPlayer.inventory).toEqual(inventoryClone)
    expect(nextPlayer.level).toBeGreaterThan(originalPlayer.level)
  })
})
