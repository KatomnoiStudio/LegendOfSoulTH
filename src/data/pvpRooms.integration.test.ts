import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const HOST = '11111111-1111-1111-1111-111111111111'
const GUEST = '22222222-2222-2222-2222-222222222222'
const MIGRATION = '20260809064000_p12_private_pvp_rooms.sql'

async function applyMigration(db: PGlite, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8')
  await db.exec(sql)
}

async function setAuthenticatedUser(db: PGlite, userId: string): Promise<void> {
  await db.exec(`
    create or replace function auth.uid() returns uuid
    language sql stable as $$ select '${userId}'::uuid $$;
  `)
}

describe('P12 private PvP room authority migration (isolated Postgres via PGLite)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      insert into auth.users (id) values ('${HOST}'), ('${GUEST}');

      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role anon; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role; exception when duplicate_object then null; end $$;

      create schema realtime;
      create table realtime.messages (
        topic text not null,
        extension text not null,
        payload jsonb,
        event text,
        private boolean default false
      );
      alter table realtime.messages enable row level security;
      create or replace function realtime.topic() returns text
      language sql stable as $$ select current_setting('realtime.topic', true) $$;
      create or replace function realtime.send(jsonb, text, text, boolean) returns void
      language sql as $$ select null::void $$;
    `)
    await setAuthenticatedUser(db, HOST)
    await applyMigration(db, '0001_init.sql')
    await db.exec(`
      insert into public.profiles (id, uid, name) values
        ('${HOST}', '1111111111', 'Host'),
        ('${GUEST}', '2222222222', 'Guest');
      insert into public.owned_characters (profile_id, character_id, level, exp, exp_to_next)
      values
        ('${HOST}', 'monkey-king', 1, 0, 100),
        ('${GUEST}', 'monkey-king', 1, 0, 100);
    `)
    await applyMigration(db, MIGRATION)
  }, 20_000)

  afterAll(async () => {
    await db.close()
  })

  it('creates and joins a six-character private room through narrow authenticated RPCs', async () => {
    await setAuthenticatedUser(db, HOST)
    const created = await db.query<{
      id: string
      room_code: string
      status: string
      host_profile_id: string
    }>(
      `select id, room_code, status, host_profile_id from public.create_private_pvp_room('monkey-king')`,
    )
    const room = created.rows[0]

    expect(room?.room_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(room?.status).toBe('waiting')
    expect(room?.host_profile_id).toBe(HOST)

    await setAuthenticatedUser(db, GUEST)
    const joined = await db.query<{ status: string; guest_profile_id: string }>(
      `select status, guest_profile_id
       from public.join_private_pvp_room($1, 'monkey-king')`,
      [room!.room_code.toLowerCase()],
    )
    expect(joined.rows[0]).toEqual({ status: 'active', guest_profile_id: GUEST })
  })

  it('enables RLS, removes direct writes, and reserves state/result commits for service_role', async () => {
    const security = await db.query<{
      rls: boolean
      authenticated_insert: boolean
      authenticated_update: boolean
      authenticated_create: boolean
      authenticated_join: boolean
      authenticated_commit: boolean
      anon_commit: boolean
      service_commit: boolean
      realtime_insert_policy_count: string
      realtime_select_policy_count: string
    }>(`
      select
        (select relrowsecurity from pg_class where oid = 'public.pvp_rooms'::regclass) as rls,
        has_table_privilege('authenticated', 'public.pvp_rooms', 'INSERT') as authenticated_insert,
        has_table_privilege('authenticated', 'public.pvp_rooms', 'UPDATE') as authenticated_update,
        has_function_privilege('authenticated', 'public.create_private_pvp_room(text)', 'EXECUTE')
          as authenticated_create,
        has_function_privilege('authenticated', 'public.join_private_pvp_room(text,text)', 'EXECUTE')
          as authenticated_join,
        has_function_privilege(
          'authenticated',
          'public.commit_pvp_authority_state(uuid,bigint,jsonb,text,text,uuid,uuid,text)',
          'EXECUTE'
        ) as authenticated_commit,
        has_function_privilege(
          'anon',
          'public.commit_pvp_authority_state(uuid,bigint,jsonb,text,text,uuid,uuid,text)',
          'EXECUTE'
        ) as anon_commit,
        has_function_privilege(
          'service_role',
          'public.commit_pvp_authority_state(uuid,bigint,jsonb,text,text,uuid,uuid,text)',
          'EXECUTE'
        ) as service_commit,
        (select count(*)::text from pg_policies
          where schemaname = 'realtime' and tablename = 'messages' and cmd = 'INSERT')
          as realtime_insert_policy_count,
        (select count(*)::text from pg_policies
          where schemaname = 'realtime' and tablename = 'messages' and cmd = 'SELECT')
          as realtime_select_policy_count
    `)
    expect(security.rows[0]).toEqual({
      rls: true,
      authenticated_insert: false,
      authenticated_update: false,
      authenticated_create: true,
      authenticated_join: true,
      authenticated_commit: false,
      anon_commit: false,
      service_commit: true,
      realtime_insert_policy_count: '0',
      realtime_select_policy_count: '1',
    })
  })

  it('commits authoritative state with compare-and-swap and rejects stale replay', async () => {
    const room = await db.query<{ id: string }>(
      `select id from public.pvp_rooms where host_profile_id = $1 order by created_at desc limit 1`,
      [HOST],
    )
    const roomId = room.rows[0]!.id
    const state = JSON.stringify({ matchId: roomId, tick: 1, stateHash: 'abc123' })

    const committed = await db.query<{ version: string }>(
      `select public.commit_pvp_authority_state(
        $1, 0, $2::jsonb, 'abc123', 'active', null, null, null
      )::text as version`,
      [roomId, state],
    )
    expect(committed.rows[0]?.version).toBe('1')

    await expect(
      db.query(
        `select public.commit_pvp_authority_state(
          $1, 0, $2::jsonb, 'stale', 'active', null, null, null
        )`,
        [roomId, state],
      ),
    ).rejects.toThrow('PVP_STATE_VERSION_CONFLICT')

    await expect(
      db.query(
        `select public.commit_pvp_authority_state(
          $1, 1, $2::jsonb, 'forged', 'completed',
          '33333333-3333-3333-3333-333333333333', $3, 'forfeit'
        )`,
        [roomId, state, GUEST],
      ),
    ).rejects.toThrow('ผู้ชนะหรือผู้แพ้ไม่ใช่ผู้เล่นในห้อง')

    const abandoned = await db.query<{ version: string }>(
      `select public.commit_pvp_authority_state(
        $1, 1, $2::jsonb, 'double-forfeit', 'completed', null, null, 'double-forfeit'
      )::text as version`,
      [roomId, state],
    )
    expect(abandoned.rows[0]?.version).toBe('2')
  })

  it('pins every privileged function to an empty search_path', async () => {
    const rows = await db.query<{ proname: string; config: string[] | null }>(`
      select proname, proconfig as config from pg_proc
      where oid in (
        'public.create_private_pvp_room(text)'::regprocedure,
        'public.join_private_pvp_room(text,text)'::regprocedure,
        'public.commit_pvp_authority_state(uuid,bigint,jsonb,text,text,uuid,uuid,text)'::regprocedure,
        'private.broadcast_pvp_authority_state()'::regprocedure
      )
    `)
    expect(rows.rows).toHaveLength(4)
    for (const row of rows.rows) expect(row.config).toContain('search_path=""')
  })
})
