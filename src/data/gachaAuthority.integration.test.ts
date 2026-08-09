import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_USER = '22222222-2222-4222-8222-222222222222'
const MIGRATION = '20260809073000_p9_gacha_server_authority.sql'

interface PullRow {
  payload: {
    results: Array<{
      characterId: string
      rarity: string
      isPity: boolean
      isNew: boolean
      shardsGranted: number
    }>
    cost: number
    currencyUsed: string
    newPity: number
    remainingBalance: number
  }
  replayed: boolean
}

async function applyMigration(db: PGlite, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8')
  await db.exec(sql)
}

async function pull(db: PGlite, requestId: string, count: 1 | 10 = 1): Promise<PullRow> {
  const result = await db.query<PullRow>(
    `select * from public.perform_gacha_pull($1::uuid, 'standard-banner', $2)`,
    [requestId, count],
  )
  const row = result.rows[0]
  if (!row) throw new Error('perform_gacha_pull returned no row')
  return row
}

describe('P9 Gacha server authority (isolated Postgres via PGLite)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create schema if not exists auth;
      create table if not exists auth.users (id uuid primary key);
      insert into auth.users (id) values ('${TEST_USER}') on conflict do nothing;

      create or replace function auth.uid() returns uuid
      language sql stable as $$ select '${TEST_USER}'::uuid $$;

      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role anon; exception when duplicate_object then null; end $$;
    `)

    await applyMigration(db, '0001_init.sql')
    await applyMigration(db, '0004_admin_accounts.sql')
    await applyMigration(db, '0005_skill_levels.sql')
    await applyMigration(db, '0008_progression_state.sql')
    await applyMigration(db, '0009_economy_integrity_fixes.sql')
    await applyMigration(db, '0015_admin_grant_and_chat_block.sql')
    await applyMigration(db, '20260808204905_p9_star_ascension_server_authority.sql')
    await applyMigration(db, MIGRATION)

    await db.exec(`
      insert into public.profiles (id, uid, name, gem)
      values ('${TEST_USER}', 'LOS-2222-2222', 'Gacha Tester', 3000);
      insert into public.owned_characters (profile_id, character_id)
      values ('${TEST_USER}', 'monkey-king');
    `)
  }, 20_000)

  afterAll(async () => {
    await db.close()
  })

  it('publishes an auditable 100% pool while denying direct pity/history writes', async () => {
    const config = await db.query<{
      total_rate: number
      pity_rls: boolean
      history_rls: boolean
      can_write_pity: boolean
      admin_source_allowed: boolean
      authenticated_can_execute: boolean
      anon_can_execute: boolean
    }>(`
      select
        (select sum(drop_rate)::float8 from public.gacha_banner_pool
          where banner_id = 'standard-banner') as total_rate,
        (select relrowsecurity from pg_class where oid = 'public.gacha_pity'::regclass)
          as pity_rls,
        (select relrowsecurity from pg_class where oid = 'public.gacha_pull_history'::regclass)
          as history_rls,
        has_table_privilege('authenticated', 'public.gacha_pity', 'INSERT,UPDATE')
          as can_write_pity,
        not exists (
          select 1 from pg_constraint
          where conrelid = 'public.currency_transactions'::regclass
            and contype = 'c'
            and pg_get_constraintdef(oid) like '%source%'
            and not pg_get_constraintdef(oid) like '%admin%'
        ) as admin_source_allowed,
        has_function_privilege(
          'authenticated', 'public.perform_gacha_pull(uuid,text,integer)', 'EXECUTE'
        ) as authenticated_can_execute,
        has_function_privilege(
          'anon', 'public.perform_gacha_pull(uuid,text,integer)', 'EXECUTE'
        ) as anon_can_execute
    `)

    expect(config.rows[0]).toEqual({
      total_rate: 1,
      pity_rls: true,
      history_rls: true,
      can_write_pity: false,
      admin_source_allowed: true,
      authenticated_can_execute: true,
      anon_can_execute: false,
    })
  })

  it('debits Gem and commits roll, pity, ownership/shards and ledger exactly once', async () => {
    const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    const first = await pull(db, requestId)
    const retry = await pull(db, requestId)

    expect(first.replayed).toBe(false)
    expect(retry).toEqual({ ...first, replayed: true })
    expect(first.payload.results).toHaveLength(1)
    expect(first.payload.cost).toBe(100)
    expect(first.payload.remainingBalance).toBe(2900)

    const audit = await db.query<{
      gem: number
      history_count: string
      ledger_count: string
      ledger_amount: number
    }>(`
      select
        (select gem from public.profiles where id = '${TEST_USER}') as gem,
        (select count(*)::text from public.gacha_pull_history
          where request_id = '${requestId}') as history_count,
        (select count(*)::text from public.currency_transactions
          where ref_id = '${requestId}') as ledger_count,
        (select amount from public.currency_transactions
          where ref_id = '${requestId}') as ledger_amount
    `)
    expect(audit.rows[0]).toEqual({
      gem: 2900,
      history_count: '1',
      ledger_count: '1',
      ledger_amount: -100,
    })
  })

  it('hard pity is decided by the server and converts an owned duplicate into a shard', async () => {
    await db.exec(`
      insert into public.gacha_pity (profile_id, banner_id, pity_count)
      values ('${TEST_USER}', 'standard-banner', 29)
      on conflict (profile_id, banner_id) do update set pity_count = 29;
    `)
    const before = await db.query<{ shards: number }>(
      `select shards from public.owned_characters
       where profile_id = $1 and character_id = 'monkey-king'`,
      [TEST_USER],
    )

    const result = await pull(db, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2')
    expect(result.payload.results[0]).toMatchObject({
      characterId: 'monkey-king',
      rarity: 'legendary',
      isPity: true,
      isNew: false,
      shardsGranted: 1,
    })
    expect(result.payload.newPity).toBe(0)

    const after = await db.query<{ shards: number }>(
      `select shards from public.owned_characters
       where profile_id = $1 and character_id = 'monkey-king'`,
      [TEST_USER],
    )
    expect(after.rows[0]?.shards).toBe((before.rows[0]?.shards ?? 0) + 1)
  })

  it('rejects insufficient Gem without partial pity, Hero, history or ledger writes', async () => {
    await db.exec(`update public.profiles set gem = 0 where id = '${TEST_USER}'`)
    const requestId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'

    await expect(pull(db, requestId)).rejects.toThrow('หยกไม่เพียงพอ')

    const counts = await db.query<{ history_count: string; ledger_count: string }>(`
      select
        (select count(*)::text from public.gacha_pull_history
          where request_id = '${requestId}') as history_count,
        (select count(*)::text from public.currency_transactions
          where ref_id = '${requestId}') as ledger_count
    `)
    expect(counts.rows[0]).toEqual({ history_count: '0', ledger_count: '0' })
  })

  it('pins SECURITY DEFINER to an empty search_path', async () => {
    const config = await db.query<{ config: string[] | null }>(`
      select proconfig as config from pg_proc
      where oid = 'public.perform_gacha_pull(uuid,text,integer)'::regprocedure
    `)
    expect(config.rows[0]?.config).toContain('search_path=""')
  })

  // Design-fork 2.b (2026-08-10): perform_gacha_pull calls Postgres random() directly, no
  // seed path — a server-authoritative RNG a client can predict is a risk surface, not a
  // testing convenience, so the done-criterion is statistical rather than deterministic (see
  // docs/agent-blueprint/23-gacha-system.md Done-criteria #1). Both tests below reset pity to
  // 0 and top up Gem before running, then pull one-at-a-time so pity accumulates exactly like
  // production (a 10x multi-pull would let pity roll over mid-batch and complicate the count).
  describe('statistical roll distribution (Done-criteria #1)', () => {
    const RATES: Record<string, number> = {
      legendary: 0.05,
      epic: 0.25, // celestial-archer + pig-warrior
      rare: 0.7, // nezha-warden + sand-sage
    }
    const PITY_THRESHOLD = 30
    const PULLS = 1000
    // Binomial std dev at n=1000 for the smallest rate (5%) is ~0.7pp — 3pp is >4 std devs,
    // safe from normal-variance flakes while still catching a genuinely broken table (e.g.
    // rates swapped, or pity silently not firing).
    const TOLERANCE = 0.03

    beforeAll(async () => {
      await db.exec(`
        update public.profiles set gem = 999999 where id = '${TEST_USER}';
        delete from public.gacha_pity where profile_id = '${TEST_USER}';
      `)
    }, 20_000)

    it(`observed rarity distribution of natural (non-pity) rolls over ${PULLS} pulls stays within ${TOLERANCE * 100}pp of configured drop_rate`, async () => {
      // Forced pity structurally raises the realized legendary rate above the configured 5%
      // (it inserts extra legendaries a plain independent-trials process wouldn't produce), so
      // checking the RAW distribution against drop_rate would fail even with a perfectly
      // correct RPC. perform_gacha_pull's forced branch (`v_is_pity`) skips the random() draw
      // entirely and never touches gacha_banner_pool's cumulative-rate ranking — only natural
      // (isPity=false) rolls are actual draws from the configured table, so those are what
      // this criterion's "matches configured drop_rate" half is about.
      const counts: Record<string, number> = { legendary: 0, epic: 0, rare: 0 }
      let naturalCount = 0
      let pityHits = 0

      for (let i = 0; i < PULLS; i += 1) {
        const requestId = `dddddddd-dddd-4ddd-8ddd-${String(i).padStart(12, '0')}`
        const result = await pull(db, requestId, 1)
        const roll = result.payload.results[0]
        if (!roll) throw new Error(`pull ${i} returned no result`)
        if (roll.isPity) {
          pityHits += 1
        } else {
          counts[roll.rarity] = (counts[roll.rarity] ?? 0) + 1
          naturalCount += 1
        }
      }

      expect(pityHits).toBeGreaterThan(0)

      for (const [rarity, expectedRate] of Object.entries(RATES)) {
        const observedRate = (counts[rarity] ?? 0) / naturalCount
        expect(
          Math.abs(observedRate - expectedRate),
          `${rarity}: expected ~${expectedRate}, observed ${observedRate} over ${naturalCount} natural pulls (counts: ${JSON.stringify(counts)}, pityHits: ${pityHits})`,
        ).toBeLessThan(TOLERANCE)
      }
    }, 60_000)

    const PITY_RUNS = 5
    const PULLS_PER_RUN = PITY_THRESHOLD * 5
    it(`the gap since the last legendary (natural or pity) never exceeds ${PITY_THRESHOLD} pulls, across ${PITY_RUNS} independent runs of ${PULLS_PER_RUN}, and forced pity fires at least once overall`, async () => {
      // Pity resets on ANY legendary, not only a forced one (perform_gacha_pull: `if v_rarity =
      // pity_rarity then v_pity := 0`), so a natural ~5%-per-pull legendary usually resets the
      // counter well before the threshold — forced pity is a backstop for an unlucky dry
      // streak, not something guaranteed to fire on a fixed schedule. The real, deterministic
      // guarantee is the gap invariant asserted after every non-legendary pull below: it can
      // only ever fail if the RPC lets a 30th consecutive non-legendary pull happen without
      // forcing legendary. "Forced pity fires at least once" is checked once across all
      // 5 x 150 = 750 pulls combined (not per-run) since it's the RPC's actual mechanism being
      // exercised, not a per-run certainty.
      let forcedPityFiresTotal = 0

      for (let run = 0; run < PITY_RUNS; run += 1) {
        await db.exec(`
          update public.profiles set gem = 999999 where id = '${TEST_USER}';
          delete from public.gacha_pity where profile_id = '${TEST_USER}';
        `)

        let sinceLegendary = 0
        for (let i = 1; i <= PULLS_PER_RUN; i += 1) {
          const requestId = `eeeeeeee-eeee-4eee-8eee-${String(run).padStart(4, '0')}${String(i).padStart(8, '0')}`
          const result = await pull(db, requestId, 1)
          const roll = result.payload.results[0]
          if (!roll) throw new Error(`run ${run} pull ${i} returned no result`)

          if (roll.rarity === 'legendary') {
            if (roll.isPity) forcedPityFiresTotal += 1
            sinceLegendary = 0
          } else {
            sinceLegendary += 1
            expect(
              sinceLegendary,
              `run ${run} pull ${i}: ${sinceLegendary} consecutive non-legendary pulls since the last legendary — pity should have forced one by now`,
            ).toBeLessThan(PITY_THRESHOLD)
          }
        }
      }

      expect(
        forcedPityFiresTotal,
        `expected forced pity to fire at least once across ${PITY_RUNS * PULLS_PER_RUN} total pulls, got 0`,
      ).toBeGreaterThan(0)
    }, 120_000)
  })
})
