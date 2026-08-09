import { describe, expect, it } from 'vitest'
import { ROSTER, getCharacter } from '../characters'
import { getPlayerAttackChain, HERO_ATTACK_CHAINS } from './attackChains'
import { BATCH_01_GACHA_BANNER, isCharacterInBatch01Pool } from './gachaPool'
import { getFinisherSpec, HERO_FINISHER_TABLE } from './finisherTable'
import { HERO_ARCHETYPE_LABEL } from './heroArchetypes'
import {
  BATCH_01_CHARACTER_IDS,
  PRODUCTION_BATCH_01,
  isBatch01Hero,
  isHeroProductionReady,
} from './heroProductionBatch'
import { getHeroSkillKit, HERO_SKILL_KITS } from './kits'
import { STAR_MULTIPLIERS, statsAtStar, starPowerRatio } from './starScaling'
import { findHitTargets } from '../realtimeBattle/HitboxSystem'
import { applyCcEffect } from '../realtimeBattle/EffectsSystem'
import { isControlLocked } from '../realtimeBattle/combatReaction'
import type { RealtimeBattleEntity } from '../realtimeBattle/types'

function entity(partial: Partial<RealtimeBattleEntity>): RealtimeBattleEntity {
  return {
    id: 'unit',
    entityType: 'enemy',
    name: 'mob',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    combatFacing: 'right',
    state: 'idle',
    hp: 500,
    maxHp: 500,
    atk: 50,
    def: 20,
    speed: 200,
    collisionRadius: 30,
    hurtboxRadius: 36,
    attackCooldownRemainingMs: 0,
    skillCooldownsMs: { skill1: 0, skill2: 0, skill3: 0 },
    ultimateGauge: 0,
    invulnerableUntilMs: 0,
    hitStunRemainingMs: 0,
    knockdownRemainingMs: 0,
    getUpRemainingMs: 0,
    combatTier: 'mob',
    ...partial,
  }
}

describe('Production Batch 01 — pipeline registry', () => {
  it('มีครบ 5 ฮีโร่ตาม archetype ที่ HetCreep กำหนด', () => {
    expect(PRODUCTION_BATCH_01).toHaveLength(5)
    const archetypes = PRODUCTION_BATCH_01.map((hero) => hero.archetype)
    expect(new Set(archetypes).size).toBe(5)
  })

  it('ทุก batch hero มีใน ROSTER และ productionBatch = batch-01', () => {
    for (const id of BATCH_01_CHARACTER_IDS) {
      const character = getCharacter(id)
      expect(character).not.toBeNull()
      expect(character?.productionBatch).toBe('batch-01')
      expect(isBatch01Hero(id)).toBe(true)
    }
  })

  it('ยังไม่มีฮีโร่ใดผ่าน Production gate จนกว่า Asset + mobile playtest ครบจริง', () => {
    const readyHeroIds = BATCH_01_CHARACTER_IDS.filter(isHeroProductionReady)

    expect(readyHeroIds).toEqual([])
  })

  it('archetype ใน ROSTER ไม่ซ้ำกันสำหรับ batch heroes (§4.1 anti-reskin)', () => {
    const batchArchetypes = ROSTER.filter((c) => c.productionBatch === 'batch-01').map(
      (c) => c.archetype,
    )
    expect(new Set(batchArchetypes).size).toBe(batchArchetypes.length)
  })
})

describe('Production Batch 01 — combat kits & combos', () => {
  it.each(BATCH_01_CHARACTER_IDS)('%s มีครบ 4 skill slots + attack chain 3 hit', (characterId) => {
    const kit = getHeroSkillKit(characterId)
    expect(kit).toBeDefined()
    expect(kit?.skill1).toBeDefined()
    expect(kit?.skill2).toBeDefined()
    expect(kit?.skill3).toBeDefined()
    expect(kit?.ultimate).toBeDefined()

    const chain = getPlayerAttackChain(characterId)
    expect(chain).toHaveLength(3)
    expect(chain[2].damageMultiplier).toBeGreaterThan(chain[0].damageMultiplier)
  })

  it('REALTIME_CHARACTER_KITS มีครบ batch 01', () => {
    for (const id of BATCH_01_CHARACTER_IDS) {
      expect(HERO_SKILL_KITS[id]).toBeDefined()
      expect(HERO_ATTACK_CHAINS[id]).toBeDefined()
    }
  })

  it('Ranged (celestial-archer) ยิงโดนเป้าหมายไกลกว่า melee baseline', () => {
    const archer = entity({ id: 'player', entityType: 'player', position: { x: 0, y: 0 } })
    const target = entity({ id: 'far', position: { x: 400, y: 0 } })
    const basic = getPlayerAttackChain('celestial-archer')[0]

    const hits = findHitTargets([target], {
      attacker: archer,
      attack: basic,
      alreadyHit: new Set(),
      elapsedMs: 0,
    })
    expect(hits.map((t) => t.id)).toEqual(['far'])
    expect(basic.lungeDistance).toBe(0)
  })

  it('Control (nezha-warden) finisher ใช้ root CC ไม่ใช้ knockdown', () => {
    const finisher = getFinisherSpec('nezha-warden')
    expect(finisher?.knockdown).toBe(false)

    const chainFinisher = getPlayerAttackChain('nezha-warden')[2]
    expect(chainFinisher.knockdown).toBeUndefined()
    expect(chainFinisher.effects?.[0]?.kind).toBe('cc')
  })

  it('Control CC ล็อกการควบคุมโดยไม่พึ่ง knockdown', () => {
    const target = entity({ id: 'mob' })
    applyCcEffect(
      { kind: 'cc', target: 'nearestEnemy', ccType: 'stun', ccDurationMs: 500 },
      { owner: entity({ id: 'nezha', entityType: 'player' }), allies: [], enemies: [target] },
    )
    expect(target.activeCc?.[0].ccType).toBe('stun')
    expect(isControlLocked(target)).toBe(true)
    expect(target.state).not.toBe('knockdown')
  })

  it('Summoner (sand-sage) S2 มี summon effect', () => {
    const kit = getHeroSkillKit('sand-sage')
    expect(kit?.skill2.attack.effects?.[0]).toEqual({
      kind: 'summon',
      target: 'self',
      summonId: 'shadow-soldier',
    })
  })

  it('Heavy (pig-warrior) finisher เปิด knockdown flag', () => {
    expect(getFinisherSpec('pig-warrior')?.knockdown).toBe(true)
    expect(getPlayerAttackChain('pig-warrior')[2].knockdown).toBe(true)
  })
})

describe('Production Batch 01 — gacha & star scaling', () => {
  it('gacha pool มีเฉพาะ batch 01 heroes', () => {
    for (const entry of BATCH_01_GACHA_BANNER.pool) {
      expect(isCharacterInBatch01Pool(entry.characterId)).toBe(true)
    }
  })

  it('star scaling ไม่เกิน 130% ที่ ★6', () => {
    expect(starPowerRatio(6)).toBeLessThanOrEqual(1.3)
    expect(starPowerRatio(1)).toBe(1)
    const base = { hp: 1000, atk: 100, def: 80, spd: 90 }
    const at6 = statsAtStar(base, 6)
    const at1 = statsAtStar(base, 1)
    expect(at6.hp / at1.hp).toBeLessThanOrEqual(1.3)
  })

  it('STAR_MULTIPLIERS มีครบ ★1–★6', () => {
    expect(STAR_MULTIPLIERS).toEqual({ 1: 1, 2: 1.06, 3: 1.12, 4: 1.18, 5: 1.24, 6: 1.3 })
  })
})

describe('Production Batch 01 — finisher table coverage', () => {
  it('finisher table ครบทุก batch hero', () => {
    expect(HERO_FINISHER_TABLE).toHaveLength(BATCH_01_CHARACTER_IDS.length)
    for (const id of BATCH_01_CHARACTER_IDS) {
      expect(getFinisherSpec(id)).toBeDefined()
    }
  })
})

describe('Production Batch 01 — archetype labels', () => {
  it('ทุก archetype ใน batch มี label ภาษาไทย', () => {
    for (const hero of PRODUCTION_BATCH_01) {
      expect(HERO_ARCHETYPE_LABEL[hero.archetype]).toBeTruthy()
    }
  })
})
