import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AWAKENING_TIER_FIXTURE_COSTS,
  SKILL_PROGRESSION_FIXTURES,
  TALENT_NODE_FIXTURES,
} from '../game/progression/progressionConfig'

/*
  Task #26/#35 — the cost catalog lives in TWO places and this test is the only thing stopping
  them from drifting.

  The prices are authored in TypeScript (progressionConfig.ts) because that is where the game
  designer edits them and where the UI reads them for its cost labels. The SERVER cannot read
  TypeScript, and a server that cannot price an upgrade can only trust the client's price —
  which is the free-upgrade bug wearing a different hat. So the same numbers are transcribed
  into `progression_cost_catalog` by migration 20260810180000, exactly the way
  20260810160000 transcribed src/game/items.ts into `item_catalog`.

  Two-place authoring is a real cost, stated rather than hidden. This test buys back the only
  thing that makes it tolerable: drift cannot ship silently. A price edited in the fixtures and
  not in a companion migration fails the build here, not in production where the RPC would
  quietly charge the old number — or refuse the upgrade outright if the row is missing.
*/

const MIGRATION = '20260810180000_p26_progression_cost_authority.sql'

interface CatalogRow {
  kind: string
  heroId: string
  key: string
  fromLevel: number
  gold: number
}

/**
 * Read the seeded rows back out of the migration's INSERT.
 *
 * Parsing SQL with a regex is normally a bad idea; it is the right one here because the
 * alternative — hand-maintaining a THIRD copy of the numbers in this test — is the very
 * failure mode the test exists to prevent. The pattern is anchored to the exact tuple shape
 * the migration writes, so a reformat that breaks it fails loudly rather than matching a
 * subset. The count assertion below is the tripwire for that.
 */
function readCatalogFromMigration(): CatalogRow[] {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8')
  const insertStart = sql.indexOf('insert into public.progression_cost_catalog')
  expect(insertStart, 'the catalog INSERT must exist in the migration').toBeGreaterThan(-1)
  const insertBody = sql.slice(insertStart, sql.indexOf('on conflict', insertStart))

  const tuple = /\('(skill|talent|awakening)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)/g
  const rows: CatalogRow[] = []
  for (const match of insertBody.matchAll(tuple)) {
    rows.push({
      kind: match[1],
      heroId: match[2],
      key: match[3],
      fromLevel: Number(match[4]),
      gold: Number(match[5]),
    })
  }
  return rows
}

/** The same rows, derived from the client fixtures the game actually renders from. */
function expectedCatalogFromFixtures(): CatalogRow[] {
  const rows: CatalogRow[] = []

  for (const [heroId, slots] of Object.entries(SKILL_PROGRESSION_FIXTURES)) {
    for (const definition of Object.values(slots)) {
      if (!definition) continue
      definition.upgradeCosts.forEach((cost, index) => {
        rows.push({
          kind: 'skill',
          heroId,
          key: definition.slot,
          // getSkillUpgradeCost indexes upgradeCosts[currentLevel - 1], so index 0 prices 1 -> 2.
          fromLevel: index + 1,
          gold: cost.gold ?? 0,
        })
      })
    }
  }

  for (const node of TALENT_NODE_FIXTURES) {
    rows.push({
      kind: 'talent',
      heroId: node.heroId,
      key: node.id,
      fromLevel: 0,
      gold: node.cost?.gold ?? 0,
    })
  }

  for (const [tier, cost] of Object.entries(AWAKENING_TIER_FIXTURE_COSTS)) {
    rows.push({
      kind: 'awakening',
      // '' = priced for any hero; awakening tiers are global today.
      heroId: '',
      key: '',
      fromLevel: Number(tier) - 1,
      gold: cost.gold ?? 0,
    })
  }

  return rows
}

function sortRows(rows: CatalogRow[]): CatalogRow[] {
  return rows.toSorted((a, b) =>
    `${a.kind}|${a.heroId}|${a.key}|${a.fromLevel}`.localeCompare(
      `${b.kind}|${b.heroId}|${b.key}|${b.fromLevel}`,
    ),
  )
}

describe('progression cost catalog parity (client fixtures <-> migration seed)', () => {
  it('the migration seeds exactly the fixture prices, no more and no fewer', () => {
    const seeded = sortRows(readCatalogFromMigration())
    const expected = sortRows(expectedCatalogFromFixtures())

    // Fails on: a price changed in one place only, a new skill/talent/tier added to the
    // fixtures without a companion migration row, or a stale row left behind after a removal.
    expect(seeded).toEqual(expected)
  })

  it('parses a non-trivial number of rows — guards the regex itself', () => {
    // If a reformat breaks the tuple pattern, the parse silently returns [] and the equality
    // above would then only pass if the fixtures were empty too. Pin the magnitude.
    expect(readCatalogFromMigration().length).toBeGreaterThanOrEqual(20)
  })

  it('no fixture cost uses materials — the catalog and the RPC price gold only', () => {
    /*
      A real limit, asserted rather than assumed. progression_cost_catalog has a gold_cost
      column and nothing else, and spend_progression_upgrade debits gold alone. The first
      fixture to grow a `materials` entry would otherwise let a player take the upgrade while
      paying only the gold half — the same "cost side driven to zero" shape this whole task
      closes. planUpgrade() refuses to submit such an upgrade; this fails the build first.
    */
    const withMaterials: string[] = []

    for (const [heroId, slots] of Object.entries(SKILL_PROGRESSION_FIXTURES)) {
      for (const definition of Object.values(slots)) {
        if (!definition) continue
        definition.upgradeCosts.forEach((cost, index) => {
          if ((cost.materials ?? []).length > 0) {
            withMaterials.push(`skill ${heroId}.${definition.slot} lv${index + 1}`)
          }
        })
      }
    }
    for (const node of TALENT_NODE_FIXTURES) {
      if ((node.cost?.materials ?? []).length > 0) withMaterials.push(`talent ${node.id}`)
    }
    for (const [tier, cost] of Object.entries(AWAKENING_TIER_FIXTURE_COSTS)) {
      if ((cost.materials ?? []).length > 0) withMaterials.push(`awakening tier ${tier}`)
    }

    expect(withMaterials).toEqual([])
  })
})
