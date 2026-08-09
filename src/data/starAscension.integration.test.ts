import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_USER = '11111111-1111-1111-1111-111111111111'
const MIGRATION = '20260808204905_p9_star_ascension_server_authority.sql'

interface AscensionRow {
  new_star: number
  shards_remaining: number
  shards_spent: number
  replayed: boolean
}

async function applyMigration(db: PGlite, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8')
  await db.exec(sql)
}

async function ascend(
  db: PGlite,
  requestId: string,
  characterId: string,
): Promise<AscensionRow> {
  const result = await db.query<AscensionRow>(
    `select * from public.ascend_character_star($1::uuid, $2)`,
    [requestId, characterId],
  )
  const row = result.rows[0]
  if (!row) throw new Error('ascend_character_star returned no row')
  return row
}

describe('P9 Star Ascension server authority (isolated Postgres via PGLite)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create schema if not exists auth;
      create table if not exists auth.users (id uuid primary key);
      insert into auth.users (id) values ('${TEST_USER}') on conflict do nothing;

      create or replace function auth.uid() returns uuid
      language sql stable as $$ select '${TEST_USER}'::uuid $$;

      do $$ begin
        create role authenticated;
      exception when duplicate_object then null;
      end $$;

      do $$ begin
        create role anon;
      exception when duplicate_object then null;
      end $$;
    `)

    await applyMigration(db, '0001_init.sql')
    await applyMigration(db, '0005_skill_levels.sql')
    await applyMigration(db, '0008_progression_state.sql')
    await applyMigration(db, '0009_economy_integrity_fixes.sql')

    await db.exec(`
      insert into public.profiles (id, uid, name)
      values ('${TEST_USER}', '1234567890', 'Tester');

      insert into public.owned_characters (
        profile_id, character_id, level, exp, exp_to_next,
        skill_levels, talent_state, awakening_state
      ) values
        ('${TEST_USER}', 'monkey-king', 12, 345, 900,
          '{"skill1":{"level":3,"exp":20,"expToNext":300}}'::jsonb,
          '{"unlockedNodes":["node-1"]}'::jsonb,
          '{"tier":2,"unlockedEffects":["effect-1"]}'::jsonb),
        ('${TEST_USER}', 'pig-warrior', 1, 0, 100, '{}'::jsonb,
          '{"unlockedNodes":[]}'::jsonb,
          '{"tier":0,"unlockedEffects":[]}'::jsonb),
        ('${TEST_USER}', 'pilgrim-monk', 1, 0, 100, '{}'::jsonb,
          '{"unlockedNodes":[]}'::jsonb,
          '{"tier":0,"unlockedEffects":[]}'::jsonb),
        ('${TEST_USER}', 'guardian-general', 1, 0, 100, '{}'::jsonb,
          '{"unlockedNodes":[]}'::jsonb,
          '{"tier":0,"unlockedEffects":[]}'::jsonb);

      -- Supabase grants exposed public tables to authenticated by default. Reproduce that
      -- starting point so this migration must explicitly remove star/shard writes.
      grant select, insert, update on public.owned_characters to authenticated;
    `)

    await applyMigration(db, MIGRATION)

    await db.exec(`
      update public.owned_characters set shards = 5 where character_id = 'monkey-king';
      update public.owned_characters set shards = 27 where character_id = 'pig-warrior';
      update public.owned_characters set star = 6, shards = 9
      where character_id = 'pilgrim-monk';
    `)
  }, 20_000)

  afterAll(async () => {
    await db.close()
  })

  it('backfills ★1/0 shards, enables RLS, and removes direct client write privileges', async () => {
    const monkey = await db.query<{ star: number; shards: number }>(
      `select star, shards from public.owned_characters where character_id = 'monkey-king'`,
    )
    expect(monkey.rows[0]).toEqual({ star: 1, shards: 5 })

    const security = await db.query<{
      audit_rls: boolean
      can_update_star: boolean
      can_update_level: boolean
      can_insert_star: boolean
      can_insert_level: boolean
      authenticated_can_execute: boolean
      anon_can_execute: boolean
    }>(`
      select
        (select relrowsecurity from pg_class
          where oid = 'public.star_ascension_history'::regclass) as audit_rls,
        has_column_privilege('authenticated', 'public.owned_characters', 'star', 'UPDATE')
          as can_update_star,
        has_column_privilege('authenticated', 'public.owned_characters', 'level', 'UPDATE')
          as can_update_level,
        has_column_privilege('authenticated', 'public.owned_characters', 'star', 'INSERT')
          as can_insert_star,
        has_column_privilege('authenticated', 'public.owned_characters', 'level', 'INSERT')
          as can_insert_level,
        has_function_privilege(
          'authenticated', 'public.ascend_character_star(uuid,text)', 'EXECUTE'
        ) as authenticated_can_execute,
        has_function_privilege('anon', 'public.ascend_character_star(uuid,text)', 'EXECUTE')
          as anon_can_execute
    `)
    expect(security.rows[0]).toEqual({
      audit_rls: true,
      can_update_star: false,
      can_update_level: true,
      can_insert_star: false,
      can_insert_level: false,
      authenticated_can_execute: true,
      anon_can_execute: false,
    })
  })

  it('client save path updates existing Heroes and never upserts/grants a roster row', () => {
    const source = readFileSync(join(process.cwd(), 'src/data/accountRepository.supabase.ts'), 'utf8')
    const saveBlock = source.slice(
      source.indexOf('export async function savePlayer'),
      source.indexOf('export async function earnGold'),
    )

    expect(saveBlock).toContain("from('owned_characters')")
    expect(saveBlock).toContain('.update({')
    expect(saveBlock).not.toContain("from('owned_characters').upsert")
  })

  it('ascends atomically, preserves unrelated progression, and replays one request once', async () => {
    const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

    const first = await ascend(db, requestId, 'monkey-king')
    const retry = await ascend(db, requestId, 'monkey-king')

    expect(first).toEqual({ new_star: 2, shards_remaining: 4, shards_spent: 1, replayed: false })
    expect(retry).toEqual({ new_star: 2, shards_remaining: 4, shards_spent: 1, replayed: true })

    const hero = await db.query<{
      star: number
      shards: number
      level: number
      exp: number
      skill_levels: unknown
      talent_state: unknown
      awakening_state: unknown
    }>(`select star, shards, level, exp, skill_levels, talent_state, awakening_state
       from public.owned_characters where character_id = 'monkey-king'`)
    expect(hero.rows[0]).toMatchObject({
      star: 2,
      shards: 4,
      level: 12,
      exp: 345,
      skill_levels: { skill1: { level: 3, exp: 20, expToNext: 300 } },
      talent_state: { unlockedNodes: ['node-1'] },
      awakening_state: { tier: 2, unlockedEffects: ['effect-1'] },
    })

    const audit = await db.query<{ count: string }>(
      `select count(*)::text as count from public.star_ascension_history
       where profile_id = $1 and request_id = $2::uuid`,
      [TEST_USER, requestId],
    )
    expect(audit.rows[0]?.count).toBe('1')
  })

  it('uses the locked 1/2/4/8/12 ladder through ★6', async () => {
    const requests = [
      'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',
      'bbbbbbbb-bbbb-4bbb-8bbb-000000000002',
      'bbbbbbbb-bbbb-4bbb-8bbb-000000000003',
      'bbbbbbbb-bbbb-4bbb-8bbb-000000000004',
      'bbbbbbbb-bbbb-4bbb-8bbb-000000000005',
    ]

    const results: AscensionRow[] = []
    for (const requestId of requests) results.push(await ascend(db, requestId, 'pig-warrior'))

    expect(results.map((row) => row.shards_spent)).toEqual([1, 2, 4, 8, 12])
    expect(results.at(-1)).toMatchObject({ new_star: 6, shards_remaining: 0 })
  })

  it('rejects insufficient shards, ★6 ascension, and request reuse for another hero', async () => {
    await expect(
      ascend(db, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'guardian-general'),
    ).rejects.toThrow('ชิ้นส่วนไม่เพียงพอ')
    await expect(
      ascend(db, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'pilgrim-monk'),
    ).rejects.toThrow('ระดับดาวสูงสุด')
    await expect(
      ascend(db, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pig-warrior'),
    ).rejects.toThrow('request ID')
  })

  it('pins SECURITY DEFINER to an empty search_path', async () => {
    const config = await db.query<{ config: string[] | null }>(`
      select proconfig as config from pg_proc
      where oid = 'public.ascend_character_star(uuid,text)'::regprocedure
    `)
    expect(config.rows[0]?.config).toContain('search_path=""')
  })

  it('rejects invalid star and shard values at the database boundary', async () => {
    await expect(
      db.exec(`update public.owned_characters set star = 7 where character_id = 'monkey-king'`),
    ).rejects.toThrow()
    await expect(
      db.exec(`update public.owned_characters set shards = -1 where character_id = 'monkey-king'`),
    ).rejects.toThrow()
  })
})
