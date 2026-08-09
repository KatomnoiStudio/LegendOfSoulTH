import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_USER = '22222222-2222-4222-8222-222222222222'
const MIGRATION = '20260809073000_p9_gacha_server_authority.sql'
const CONTENT_GATE_MIGRATION = '20260809102500_disable_unready_gacha_content.sql'

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

  it('server ปิดตู้ Production เมื่อ Asset Contract ยังไม่ผ่าน โดยไม่ลบประวัติผู้เล่น', async () => {
    const historyBefore = await db.query<{ count: string }>(
      `select count(*)::text as count from public.gacha_pull_history where profile_id = $1`,
      [TEST_USER],
    )

    await applyMigration(db, CONTENT_GATE_MIGRATION)

    const banner = await db.query<{ active: boolean }>(
      `select active from public.gacha_banners where id = 'standard-banner'`,
    )
    expect(banner.rows[0]?.active).toBe(false)
    await expect(pull(db, 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4')).rejects.toThrow(
      'ไม่พบตู้สุ่มที่เปิดใช้งาน',
    )

    const historyAfter = await db.query<{ count: string }>(
      `select count(*)::text as count from public.gacha_pull_history where profile_id = $1`,
      [TEST_USER],
    )
    expect(historyAfter.rows[0]?.count).toBe(historyBefore.rows[0]?.count)
  })
})
