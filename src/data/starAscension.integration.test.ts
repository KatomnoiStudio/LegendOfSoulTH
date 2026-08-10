import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_USER = '11111111-1111-1111-1111-111111111111'
const MIGRATION = '20260808204905_p9_star_ascension_server_authority.sql'
/** Task #25 (CoalBoard scope B) — narrows p9's allowlist and hardens the progression RPC. */
const HARDENING = '20260810130000_security_harden_lobby_progression_rpc.sql'
const COMMIT_RPC =
  'public.commit_lobby_battle_progression(text,text,text,int,int,int,text,jsonb,text[],' +
  'text,int,int,int,jsonb,jsonb,jsonb,text,text,text,int,timestamptz)'

interface AscensionRow {
  new_star: number
  shards_remaining: number
  shards_spent: number
  replayed: boolean
}

interface ProgressionCommit {
  transactionId: string
  profileLevel: number
  heroLevel: number
  leadCharacterId: string
  /** Defaults to a mid-curve value; set to 0 to exercise the max-hero-level clamp_zero state. */
  heroExpToNext?: number
}

async function applyMigration(db: PGlite, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8')
  await db.exec(sql)
}

/** One `commit_lobby_battle_progression` call with everything but the tested fields held fixed. */
async function commitProgression(db: PGlite, commit: ProgressionCommit): Promise<void> {
  await db.query(
    `select * from public.commit_lobby_battle_progression(
      $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::text[],$10,$11,$12,$13,
      $14::jsonb,$15::jsonb,$16::jsonb,$17,$18,$19,$20,$21::timestamptz
    )`,
    [
      commit.transactionId,
      'Tester',
      'นักเดินทาง',
      commit.profileLevel,
      10,
      100,
      'default',
      JSON.stringify({ [`reward_tx_${commit.transactionId}_prog`]: true }),
      '{}',
      commit.leadCharacterId,
      commit.heroLevel,
      20,
      commit.heroExpToNext ?? 100,
      '{}',
      JSON.stringify({ unlockedNodes: [] }),
      JSON.stringify({ tier: 0, unlockedEffects: [] }),
      `battle-${commit.transactionId}`,
      'ทดสอบ',
      'win',
      12_000,
      '2026-08-10T09:00:00.000Z',
    ],
  )
}

async function ascend(db: PGlite, requestId: string, characterId: string): Promise<AscensionRow> {
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

      -- pg_cron is a Supabase extension, not core Postgres — 0011 schedules a cleanup job.
      create schema if not exists cron;
      create or replace function cron.schedule(job_name text, schedule text, command text)
      returns bigint language sql as $$ select 1::bigint $$;
    `)

    await applyMigration(db, '0001_init.sql')
    await applyMigration(db, '0005_skill_levels.sql')
    await applyMigration(db, '0008_progression_state.sql')
    await applyMigration(db, '0009_economy_integrity_fixes.sql')
    // 0010-0013 are prerequisites of HARDENING below: it replaces 0013's RPC and calls 0011's
    // rate-limit helper, and the RPC's battle_history insert needs 0013's external_id column.
    await applyMigration(db, '0010_coupon_dedup_index.sql')
    await applyMigration(db, '0011_rpc_rate_limit.sql')
    await applyMigration(db, '0012_public_profile_lookup.sql')
    await applyMigration(db, '0013_reward_idempotency.sql')

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
    await applyMigration(db, HARDENING)

    await db.exec(`
      update public.owned_characters set shards = 5 where character_id = 'monkey-king';
      update public.owned_characters set shards = 27 where character_id = 'pig-warrior';
      update public.owned_characters set star = 6, shards = 9
      where character_id = 'pilgrim-monk';
      -- High enough that a legal (<= 20) per-call gain still lands above maxHeroLevel 60,
      -- which is the only way to reach the game-cap branch without tripping the delta cap first.
      update public.owned_characters set level = 55 where character_id = 'pilgrim-monk';
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
      // p9 kept level client-writable; task #25's HARDENING migration revoked it — the RPC is
      // the only writer now. Flipping this back to true means the F1/F4 hole is open again.
      can_update_level: false,
      can_insert_star: false,
      can_insert_level: false,
      authenticated_can_execute: true,
      anon_can_execute: false,
    })
  })

  it('client save path updates existing Heroes and never upserts/grants a roster row', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/data/accountRepository.supabase.ts'),
      'utf8',
    )
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
    await expect(ascend(db, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pig-warrior')).rejects.toThrow(
      'request ID',
    )
  })

  it('pins SECURITY DEFINER to an empty search_path', async () => {
    const config = await db.query<{ config: string[] | null }>(`
      select proconfig as config from pg_proc
      where oid = 'public.ascend_character_star(uuid,text)'::regprocedure
    `)
    expect(config.rows[0]?.config).toContain('search_path=""')
  })

  it('locks progression columns on profiles and gates the progression RPC (#25)', async () => {
    const privileges = await db.query<{
      profile_level: boolean
      profile_exp: boolean
      profile_exp_to_next: boolean
      profile_name: boolean
      profile_flags: boolean
      hero_exp: boolean
      hero_skill_levels: boolean
      commit_ledger_rls: boolean
      authenticated_can_commit: boolean
      anon_can_commit: boolean
    }>(`
      select
        has_column_privilege('authenticated', 'public.profiles', 'level', 'UPDATE')
          as profile_level,
        has_column_privilege('authenticated', 'public.profiles', 'exp', 'UPDATE')
          as profile_exp,
        has_column_privilege('authenticated', 'public.profiles', 'exp_to_next', 'UPDATE')
          as profile_exp_to_next,
        has_column_privilege('authenticated', 'public.profiles', 'name', 'UPDATE')
          as profile_name,
        has_column_privilege('authenticated', 'public.profiles', 'flags', 'UPDATE')
          as profile_flags,
        has_column_privilege('authenticated', 'public.owned_characters', 'exp', 'UPDATE')
          as hero_exp,
        has_column_privilege('authenticated', 'public.owned_characters', 'skill_levels', 'UPDATE')
          as hero_skill_levels,
        (select relrowsecurity from pg_class
          where oid = 'public.lobby_progression_commits'::regclass) as commit_ledger_rls,
        has_function_privilege('authenticated', '${COMMIT_RPC}', 'EXECUTE')
          as authenticated_can_commit,
        has_function_privilege('anon', '${COMMIT_RPC}', 'EXECUTE') as anon_can_commit
    `)

    expect(privileges.rows[0]).toEqual({
      // The whole point of #25: progression is RPC-only on both tables now.
      profile_level: false,
      profile_exp: false,
      profile_exp_to_next: false,
      hero_exp: false,
      // ...without over-reaching into what savePlayer still legitimately writes.
      profile_name: true,
      profile_flags: true,
      // skill_levels stays client-writable on purpose — that is F2 / task #26, not this topic.
      hero_skill_levels: true,
      commit_ledger_rls: true,
      authenticated_can_commit: true,
      anon_can_commit: false,
    })
  })

  it('hardened RPC commits once and swallows a replayed transaction id (#25)', async () => {
    const txId = 'lobby:trial-25:2026-08-10T09:00:00.000Z'

    await commitProgression(db, {
      transactionId: txId,
      profileLevel: 2,
      heroLevel: 2,
      leadCharacterId: 'guardian-general',
    })
    // Same id, richer payload. 0013's guard lived in the same `flags` column the caller
    // overwrote in the same statement, so a client could re-arm a committed id by sending
    // p_flags:{}. The ledger row is the guard now, and the caller cannot author it.
    await commitProgression(db, {
      transactionId: txId,
      profileLevel: 15,
      heroLevel: 15,
      leadCharacterId: 'guardian-general',
    })

    const state = await db.query<{
      profile_level: number
      hero_level: number
      battles: string
      commits: string
    }>(`
      select
        (select level from public.profiles where id = '${TEST_USER}') as profile_level,
        (select level from public.owned_characters
          where character_id = 'guardian-general') as hero_level,
        (select count(*)::text from public.battle_history
          where external_id = 'battle-${txId}') as battles,
        (select count(*)::text from public.lobby_progression_commits
          where transaction_id = '${txId}') as commits
    `)

    expect(state.rows[0]).toEqual({
      profile_level: 2,
      hero_level: 2,
      battles: '1',
      commits: '1',
    })
  })

  it('hardened RPC refuses an unowned lead hero instead of minting it (#25)', async () => {
    await expect(
      commitProgression(db, {
        transactionId: 'lobby:mint:2026-08-10T09:10:00.000Z',
        profileLevel: 2,
        heroLevel: 30,
        leadCharacterId: 'nezha-not-owned',
      }),
    ).rejects.toThrow('ไม่พบฮีโร่ที่ครอบครอง')

    const minted = await db.query<{ count: string }>(
      `select count(*)::text as count from public.owned_characters
       where character_id = 'nezha-not-owned'`,
    )
    expect(minted.rows[0]?.count).toBe('0')
  })

  it('hardened RPC refuses forged jumps, rollbacks, and over-cap hero levels (#25)', async () => {
    const lead = 'guardian-general'

    await expect(
      commitProgression(db, {
        transactionId: 'lobby:jump-account:2026-08-10T09:20:00.000Z',
        profileLevel: 999,
        heroLevel: 2,
        leadCharacterId: lead,
      }),
    ).rejects.toThrow('เลเวลบัญชีเพิ่มเกินขีดจำกัดต่อครั้ง')

    await expect(
      commitProgression(db, {
        transactionId: 'lobby:jump-hero:2026-08-10T09:21:00.000Z',
        profileLevel: 2,
        heroLevel: 999,
        leadCharacterId: lead,
      }),
    ).rejects.toThrow('เลเวลฮีโร่เพิ่มเกินขีดจำกัดต่อครั้ง')

    await expect(
      commitProgression(db, {
        transactionId: 'lobby:rollback:2026-08-10T09:22:00.000Z',
        profileLevel: 1,
        heroLevel: 2,
        leadCharacterId: lead,
      }),
    ).rejects.toThrow('เลเวลบัญชีย้อนหลังไม่ได้')

    // pilgrim-monk sits at 55, so +6 clears the per-call ceiling and only maxHeroLevel 60 stops it.
    await expect(
      commitProgression(db, {
        transactionId: 'lobby:cap:2026-08-10T09:23:00.000Z',
        profileLevel: 2,
        heroLevel: 61,
        leadCharacterId: 'pilgrim-monk',
      }),
    ).rejects.toThrow('เลเวลฮีโร่เกินขีดสูงสุดของเกม')

    // Every rejection aborts its transaction, so no refused call burns its transaction id —
    // only the one legitimate commit above is in the ledger.
    const after = await db.query<{ profile_level: number; commits: string }>(`
      select
        (select level from public.profiles where id = '${TEST_USER}') as profile_level,
        (select count(*)::text from public.lobby_progression_commits) as commits
    `)
    expect(after.rows[0]).toEqual({ profile_level: 2, commits: '1' })
  })

  it('hardened RPC accepts exp_to_next 0 only for a hero at the game cap (#25)', async () => {
    // progressionConfig.maxLevelExpBehavior is 'clamp_zero', so heroExpService returns
    // {newExp: 0, expToNext: 0} at maxHeroLevel 60 and progressionMigration stores it that way.
    // A blanket `exp_to_next <= 0` rejection would refuse that legal terminal state and freeze
    // the account's entire lobby commit — profile row and battle_history ride the same call.
    await commitProgression(db, {
      transactionId: 'lobby:cap-reached:2026-08-10T09:30:00.000Z',
      profileLevel: 2,
      heroLevel: 60,
      leadCharacterId: 'pilgrim-monk',
      heroExpToNext: 0,
    })

    const capped = await db.query<{ level: number; exp_to_next: number }>(
      `select level, exp_to_next from public.owned_characters where character_id = 'pilgrim-monk'`,
    )
    expect(capped.rows[0]).toEqual({ level: 60, exp_to_next: 0 })

    // Below the cap the same value is still malformed — the exemption is the cap, not the zero.
    await expect(
      commitProgression(db, {
        transactionId: 'lobby:zero-below-cap:2026-08-10T09:31:00.000Z',
        profileLevel: 2,
        heroLevel: 3,
        leadCharacterId: 'guardian-general',
        heroExpToNext: 0,
      }),
    ).rejects.toThrow('ค่า EXP ไม่ถูกต้อง')
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
