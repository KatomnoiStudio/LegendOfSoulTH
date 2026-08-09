import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * issue #101 Finding 7 — team_slots accepted any character_id, letting a client field a Hero
 * it never owned. Exercised against real Postgres (PGlite) applying the actual migration files,
 * because the defect lives in what RLS structurally cannot check: a value, not a row.
 */

const TEST_USER = '11111111-1111-1111-1111-111111111111'

async function applyMigration(db: PGlite, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8')
  await db.exec(sql)
}

describe('team_slots ownership enforcement (isolated Postgres via PGLite)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create schema if not exists auth;
      -- raw_user_meta_data is part of the stub because handle_new_user() reads it; the other
      -- integration harnesses omit it only because they never fire the signup trigger.
      create table if not exists auth.users (
        id uuid primary key,
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      insert into auth.users (id) values ('${TEST_USER}') on conflict do nothing;

      create or replace function auth.uid() returns uuid
      language sql stable as $$ select '${TEST_USER}'::uuid $$;

      do $$ begin
        create role authenticated;
      exception
        when duplicate_object then null;
      end $$;

      do $$ begin
        create role anon;
      exception
        when duplicate_object then null;
      end $$;
    `)

    await applyMigration(db, '0001_init.sql')

    // Seeded directly rather than through handle_new_user(): the test user was inserted into
    // auth.users before 0001 created that trigger, matching the other integration harnesses.
    // Slot 0 starts filled with an owned character, slots 1-3 empty.
    await db.exec(`
      insert into public.profiles (id, uid, name, gold, gem)
      values ('${TEST_USER}', '1234567890', 'Tester', 500, 0);

      insert into public.owned_characters (profile_id, character_id)
      values ('${TEST_USER}', 'monkey-king'), ('${TEST_USER}', 'nezha');

      insert into public.team_slots (profile_id, slot_index, character_id)
      values ('${TEST_USER}', 0, 'monkey-king'),
             ('${TEST_USER}', 1, null),
             ('${TEST_USER}', 2, null),
             ('${TEST_USER}', 3, null);
    `)

    await applyMigration(db, '20260810101000_security_team_slots_ownership.sql')
  }, 20_000)

  afterAll(async () => {
    await db.close()
  })

  async function slotOf(slotIndex: number): Promise<string | null> {
    const result = await db.query<{ character_id: string | null }>(
      `select character_id from public.team_slots where profile_id = $1 and slot_index = $2`,
      [TEST_USER, slotIndex],
    )
    return result.rows[0]?.character_id ?? null
  }

  it('equipping an owned character succeeds', async () => {
    await db.query(
      `update public.team_slots set character_id = 'nezha'
       where profile_id = $1 and slot_index = 1`,
      [TEST_USER],
    )

    expect(await slotOf(1)).toBe('nezha')
  })

  it('equipping an unowned character is rejected', async () => {
    await expect(
      db.query(
        `update public.team_slots set character_id = 'erlang-shen'
         where profile_id = $1 and slot_index = 2`,
        [TEST_USER],
      ),
    ).rejects.toThrow('ยังไม่ได้เป็นเจ้าของตัวละครนี้')

    expect(await slotOf(2)).toBeNull()
  })

  it('the insert path is guarded too, not only update', async () => {
    await expect(
      db.query(
        `insert into public.team_slots (profile_id, slot_index, character_id)
         values ($1, 0, 'erlang-shen')
         on conflict (profile_id, slot_index) do update set character_id = excluded.character_id`,
        [TEST_USER],
      ),
    ).rejects.toThrow('ยังไม่ได้เป็นเจ้าของตัวละครนี้')

    expect(await slotOf(0)).toBe('monkey-king')
  })

  it('clearing a slot to null still works', async () => {
    await db.query(
      `update public.team_slots set character_id = null
       where profile_id = $1 and slot_index = 1`,
      [TEST_USER],
    )

    expect(await slotOf(1)).toBeNull()
  })

  it('signup still works — handle_new_user grants the character before filling slot 0', async () => {
    const newUser = '22222222-2222-2222-2222-222222222222'

    await db.query(`insert into auth.users (id) values ($1)`, [newUser])

    const slots = await db.query<{ slot_index: number; character_id: string | null }>(
      `select slot_index, character_id from public.team_slots
       where profile_id = $1 order by slot_index`,
      [newUser],
    )

    expect(slots.rows).toHaveLength(4)
    expect(slots.rows[0]?.character_id).toBe('monkey-king')
  })

  it('removing an owned character clears the slots referencing it', async () => {
    await db.query(
      `update public.team_slots set character_id = 'nezha'
       where profile_id = $1 and slot_index = 3`,
      [TEST_USER],
    )
    expect(await slotOf(3)).toBe('nezha')

    await db.query(
      `delete from public.owned_characters where profile_id = $1 and character_id = 'nezha'`,
      [TEST_USER],
    )

    expect(await slotOf(3)).toBeNull()
  })
})
