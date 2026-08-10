import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const TEST_USER = '11111111-1111-1111-1111-111111111111'
const MIGRATION = '20260808204905_p9_star_ascension_server_authority.sql'
/** Task #25 (CoalBoard scope B) — narrows p9's allowlist and hardens the progression RPC. */
const HARDENING = '20260810130000_security_harden_lobby_progression_rpc.sql'
/** 2026-08-10 audit wave 1 (F1-F8) — guest-cleanup inactivity, EXECUTE sweep, item catalog. */
const WAVE1 = '20260810160000_security_audit_hardening_wave1.sql'

// Guest-cleanup fixtures (F1). All three are 40 days old; what differs is ACTIVITY.
const GUEST_ACTIVE = '22222222-2222-4222-8222-222222222201'
const GUEST_STALE = '22222222-2222-4222-8222-222222222202'
const GUEST_EXEMPT = '22222222-2222-4222-8222-222222222203'
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
  // pg_cron is a Supabase-hosted extension PGlite cannot install; cron.schedule itself is
  // stubbed in beforeAll. Neutralize only the extension bootstrap line (0006/0007 carry it).
  await db.exec(
    sql.replace(
      /create extension if not exists pg_cron with schema extensions;/g,
      '-- pg_cron unavailable in PGlite (stubbed in test bootstrap)',
    ),
  )
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
      -- is_anonymous / created_at / last_sign_in_at mirror GoTrue's real columns — the F1
      -- guest-cleanup rewrite (wave 1) filters on them.
      create table if not exists auth.users (
        id uuid primary key,
        is_anonymous boolean not null default false,
        created_at timestamptz not null default now(),
        last_sign_in_at timestamptz
      );
      insert into auth.users (id) values ('${TEST_USER}') on conflict do nothing;

      -- Guest fixtures for the F1 cleanup test: all created 40 days ago, differing only in
      -- activity signals. Inserted BEFORE 0001 so handle_new_user never fires (the harness
      -- creates profiles by hand).
      insert into auth.users (id, is_anonymous, created_at, last_sign_in_at) values
        ('${GUEST_ACTIVE}', true, now() - interval '40 days', now() - interval '40 days'),
        ('${GUEST_STALE}', true, now() - interval '40 days', now() - interval '40 days'),
        ('${GUEST_EXEMPT}', true, now() - interval '40 days', now() - interval '40 days')
      on conflict do nothing;

      -- 0014 seeds cleanup_exempt_profiles with three fixed dev-account uuids that FK into
      -- profiles — those accounts must exist here or 0014 itself fails to apply.
      insert into auth.users (id) values
        ('e79a973f-fd52-4b84-8e6a-c53a0394db88'),
        ('d0a7b94f-5d95-4e52-8d8f-ebdd835cf695'),
        ('9baf5833-89d4-401e-9ece-14e46a27a228')
      on conflict do nothing;

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
    // 0002/0004 define grant_character + admin_accounts — WAVE1's EXECUTE sweep names them.
    await applyMigration(db, '0002_grant_character_rpc.sql')
    await applyMigration(db, '0004_admin_accounts.sql')
    await applyMigration(db, '0005_skill_levels.sql')
    // 0006/0007 define the guest/audit-log cleanup functions WAVE1 rewrites and locks.
    await applyMigration(db, '0006_guest_cleanup.sql')
    await applyMigration(db, '0007_audit_log_cleanup.sql')
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

      -- Guest profiles + the three dev accounts 0014's exempt seed references (FK).
      insert into public.profiles (id, uid, name) values
        ('${GUEST_ACTIVE}', '2000000001', 'GuestActive'),
        ('${GUEST_STALE}', '2000000002', 'GuestStale'),
        ('${GUEST_EXEMPT}', '2000000003', 'GuestExempt'),
        ('e79a973f-fd52-4b84-8e6a-c53a0394db88', '2000000004', 'DevA'),
        ('d0a7b94f-5d95-4e52-8d8f-ebdd835cf695', '2000000005', 'DevB'),
        ('9baf5833-89d4-401e-9ece-14e46a27a228', '2000000006', 'DevSmoke');

      -- Activity: the ACTIVE guest battled 2 days ago; the STALE and EXEMPT guests' only
      -- battle is 40 days old. All other signals (sign-in, currency) are 40 days stale.
      insert into public.battle_history (profile_id, opponent, result, finished_at) values
        ('${GUEST_ACTIVE}', 'trial-01', 'win', now() - interval '2 days'),
        ('${GUEST_STALE}', 'trial-01', 'win', now() - interval '40 days'),
        ('${GUEST_EXEMPT}', 'trial-01', 'win', now() - interval '40 days');

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

    // 0014 (dead-account cleanup + exempt table), then the rest of the chain WAVE1 builds on:
    // gacha (F8's table), the ledger archive (lifetime columns + archive fn), and the
    // earn_gold/signup-ledger hardening whose earn_gold body WAVE1 re-orders.
    await applyMigration(db, '0014_dead_account_cleanup.sql')
    // 0015 defines grant_gold_admin/grant_item_admin — also named by the EXECUTE sweep.
    await applyMigration(db, '0015_admin_grant_and_chat_block.sql')
    await applyMigration(db, MIGRATION)
    await applyMigration(db, '20260809073000_p9_gacha_server_authority.sql')
    await applyMigration(db, '20260809090000_p_currency_ledger_archive.sql')
    await applyMigration(db, '20260810100000_security_earn_gold_topup_and_signup_ledger.sql')
    await applyMigration(db, HARDENING)
    await applyMigration(db, WAVE1)

    await db.exec(`
      -- Exempt the third guest via the mechanism 0014 ships (and WAVE1's guest job honours).
      insert into public.cleanup_exempt_profiles (profile_id, reason)
      values ('${GUEST_EXEMPT}', 'F1 test: stale but explicitly exempt')
      on conflict (profile_id) do nothing;
    `)

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

  it('wave1: exactly one grant_item overload survives a full-chain replay (F3)', async () => {
    // 0011 (3-arg) + 0013 (4-arg) both applied above = the collision exists in this very
    // harness until WAVE1's drop runs. The production hand-fix lived in no file before this.
    const overloads = await db.query<{ count: string }>(`
      select count(*)::text as count
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'grant_item'
    `)
    expect(overloads.rows[0]?.count).toBe('1')
  })

  it('wave1: EXECUTE swept on all twelve SECURITY DEFINER RPCs (F2)', async () => {
    const anonChecks = [
      "public.cleanup_stale_guest_accounts()",
      "public.cleanup_dead_unplayed_accounts()",
      "public.cleanup_old_audit_log_entries()",
      "public.archive_currency_transactions(interval)",
      "public.earn_gold(text, int, text)",
      "public.grant_item(text, int, text, text)",
      "public.redeem_coupon(text)",
      "public.grant_character(text)",
      "public.grant_gold_admin(int)",
      "public.grant_item_admin(text, int)",
      "public.upsert_pending_lobby_reward(text, text, text, text, int, int, jsonb, timestamptz, int)",
      "public.clear_pending_lobby_reward(text)",
    ]
    for (const sig of anonChecks) {
      const anon = await db.query<{ ok: boolean }>(
        `select has_function_privilege('anon', '${sig}', 'EXECUTE') as ok`,
      )
      expect({ sig, anon: anon.rows[0]?.ok }).toEqual({ sig, anon: false })
    }

    // The four cron-only jobs get NO grant at all — not even authenticated.
    for (const sig of anonChecks.slice(0, 4)) {
      const authed = await db.query<{ ok: boolean }>(
        `select has_function_privilege('authenticated', '${sig}', 'EXECUTE') as ok`,
      )
      expect({ sig, authenticated: authed.rows[0]?.ok }).toEqual({ sig, authenticated: false })
    }

    // The client-callable eight keep working for signed-in players (spot-check the two the
    // reward pipeline fires every battle).
    for (const sig of ["public.earn_gold(text, int, text)", "public.grant_item(text, int, text, text)"]) {
      const authed = await db.query<{ ok: boolean }>(
        `select has_function_privilege('authenticated', '${sig}', 'EXECUTE') as ok`,
      )
      expect({ sig, authenticated: authed.rows[0]?.ok }).toEqual({ sig, authenticated: true })
    }
  })

  it('wave1: grant_item refuses an id missing from the item catalog (F4)', async () => {
    await expect(
      db.query(`select public.grant_item('developer-only-sword', 1, 'drop', 'ref-f4-bad')`),
    ).rejects.toThrow('ไม่พบไอเทมนี้')

    const minted = await db.query<{ count: string }>(
      `select count(*)::text as count from public.inventory_items
       where item_id = 'developer-only-sword'`,
    )
    expect(minted.rows[0]?.count).toBe('0')

    // A real catalog item still grants — the guard narrows, it does not break the pipeline.
    await db.query(`select public.grant_item('healing-peach', 3, 'drop', 'ref-f4-good')`)
    const granted = await db.query<{ quantity: number }>(
      `select quantity from public.inventory_items
       where profile_id = '${TEST_USER}' and item_id = 'healing-peach'`,
    )
    expect(granted.rows[0]?.quantity).toBe(3)
  })

  it('wave1: argument validation runs before the rate limiter (F5)', async () => {
    // Saturate earn_gold's window by hand, then send an INVALID call: the old order would
    // answer "too many calls", the new order rejects the argument without ever consulting
    // the limiter. A VALID call at the same instant still gets throttled.
    await db.exec(`
      insert into public.rpc_rate_limit (profile_id, rpc_name)
      select '${TEST_USER}', 'earn_gold' from generate_series(1, 20);
    `)
    await expect(db.query(`select public.earn_gold('drop', -5)`)).rejects.toThrow(
      'จำนวนทองไม่ถูกต้อง',
    )
    await expect(db.query(`select public.earn_gold('drop', 10)`)).rejects.toThrow(
      'เรียกใช้งานถี่เกินไป',
    )
    await db.exec(`delete from public.rpc_rate_limit where rpc_name = 'earn_gold';`)
  })

  it('wave1: pending-reward upserts are bounded and row-capped (F6)', async () => {
    await expect(
      db.query(
        `select public.upsert_pending_lobby_reward(
          'tx-f6-neg', 'trial-01', 'ด่านทดสอบ', 'victory', -1, 0, '[]'::jsonb, now()::timestamptz
        )`,
      ),
    ).rejects.toThrow('ค่ารางวัลไม่ถูกต้อง')

    // Fill to the cap directly (the 20/60 rate limit makes 64 RPC calls impossible in-test;
    // in production the cap is reached across days, not one burst), then: a NEW id must be
    // refused, an EXISTING id must still update (resume flow survives a full cache).
    await db.exec(`
      insert into public.pending_lobby_rewards
        (profile_id, transaction_id, stage_id, stage_name, outcome, finished_at)
      select '${TEST_USER}', 'tx-f6-fill-' || n, 'trial-01', 'ด่านทดสอบ', 'victory', now()
      from generate_series(1, 64) n;
    `)
    await expect(
      db.query(
        `select public.upsert_pending_lobby_reward(
          'tx-f6-overflow', 'trial-01', 'ด่านทดสอบ', 'victory', 0, 0, '[]'::jsonb, now()::timestamptz
        )`,
      ),
    ).rejects.toThrow('รายการรางวัลค้างเต็มแล้ว')
    await db.query(
      `select public.upsert_pending_lobby_reward(
        'tx-f6-fill-1', 'trial-01', 'ด่านทดสอบ', 'defeat', 5, 5, '[]'::jsonb, now()::timestamptz
      )`,
    )
    const updated = await db.query<{ outcome: string }>(
      `select outcome from public.pending_lobby_rewards
       where profile_id = '${TEST_USER}' and transaction_id = 'tx-f6-fill-1'`,
    )
    expect(updated.rows[0]?.outcome).toBe('defeat')
    await db.exec(
      `delete from public.pending_lobby_rewards where transaction_id like 'tx-f6-%';`,
    )
  })

  it('wave1: the schema can no longer express a gold gacha banner (F8)', async () => {
    await expect(
      db.exec(`
        insert into public.gacha_banners
          (id, name, description, currency, cost_single, cost_multi, pity_threshold, pity_rarity)
        values ('f8-gold-banner', 'x', 'y', 'gold', 100, 900, 50, 'legendary')
      `),
    ).rejects.toThrow('gacha_banners_currency_check')
  })

  it('wave1: guest cleanup deletes by inactivity, never by age alone (F1)', async () => {
    // All three guests are 40 days old — under 0006's age-only rule every one of them dies.
    await db.query(`select public.cleanup_stale_guest_accounts()`)

    const guests = await db.query<{ id: string }>(`
      select id::text as id from auth.users
      where id in ('${GUEST_ACTIVE}', '${GUEST_STALE}', '${GUEST_EXEMPT}')
      order by id
    `)
    expect(guests.rows.map((r) => r.id)).toEqual([GUEST_ACTIVE, GUEST_EXEMPT])

    // The stale guest's whole subtree cascaded with the auth.users row.
    const orphan = await db.query<{ count: string }>(
      `select count(*)::text as count from public.profiles where id = '${GUEST_STALE}'`,
    )
    expect(orphan.rows[0]?.count).toBe('0')

    // Registered accounts (is_anonymous false) are NEVER this job's business.
    const tester = await db.query<{ count: string }>(
      `select count(*)::text as count from auth.users where id = '${TEST_USER}'`,
    )
    expect(tester.rows[0]?.count).toBe('1')
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
