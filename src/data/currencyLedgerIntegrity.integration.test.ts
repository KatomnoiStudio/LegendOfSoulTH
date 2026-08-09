import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * issue #101 Findings 1 + 4 — currency-ledger integrity, verified against a real Postgres
 * (PGLite) with the actual migration files applied in order, not against mocks.
 *
 * Finding 1: earn_gold must no longer accept p_source = 'topup'.
 * Finding 4: account creation must write its 500 gold / 20 gem grant into the ledger, and
 *            existing accounts must get that row backfilled exactly once.
 */

const LEGACY_USER = '33333333-3333-4333-8333-333333333333'
const NEW_USER = '44444444-4444-4444-8444-444444444444'
const MIGRATION = '20260810100000_security_earn_gold_topup_and_signup_ledger.sql'

async function applyMigration(db: PGlite, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8')
  await db.exec(sql)
}

async function signupRows(
  db: PGlite,
  profileId: string,
): Promise<Array<{ currency: string; amount: number; ref_id: string }>> {
  const result = await db.query<{ currency: string; amount: number; ref_id: string }>(
    `select currency, amount, ref_id from public.currency_transactions
     where profile_id = $1 and source = 'signup'
     order by currency`,
    [profileId],
  )
  return result.rows
}

async function lifetime(
  db: PGlite,
  profileId: string,
): Promise<{
  gold: number
  gem: number
  lifetime_gold_earned: string
  lifetime_gem_earned: string
}> {
  const result = await db.query<{
    gold: number
    gem: number
    lifetime_gold_earned: string
    lifetime_gem_earned: string
  }>(
    `select gold, gem, lifetime_gold_earned::text, lifetime_gem_earned::text
     from public.profiles where id = $1`,
    [profileId],
  )
  const row = result.rows[0]
  if (!row) throw new Error(`no profile ${profileId}`)
  return row
}

describe('currency ledger integrity — issue #101 F1/F4 (isolated Postgres via PGLite)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create schema if not exists auth;
      -- raw_user_meta_data is required: handle_new_user reads it, so the signup trigger can
      -- only be exercised against a users table that actually carries the column.
      create table if not exists auth.users (
        id uuid primary key,
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );

      create or replace function auth.uid() returns uuid
      language sql stable as $$ select '${LEGACY_USER}'::uuid $$;

      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role anon; exception when duplicate_object then null; end $$;

      create schema if not exists cron;
      create or replace function cron.schedule(job_name text, schedule text, command text)
      returns bigint language sql as $$ select 1::bigint $$;
    `)

    await applyMigration(db, '0001_init.sql')
    await applyMigration(db, '0004_admin_accounts.sql')
    await applyMigration(db, '0005_skill_levels.sql')
    await applyMigration(db, '0008_progression_state.sql')
    await applyMigration(db, '0009_economy_integrity_fixes.sql')
    await applyMigration(db, '0010_coupon_dedup_index.sql')
    await applyMigration(db, '0011_rpc_rate_limit.sql')
    await applyMigration(db, '0012_public_profile_lookup.sql')
    await applyMigration(db, '0013_reward_idempotency.sql')
    await applyMigration(db, '0015_admin_grant_and_chat_block.sql')
    await applyMigration(db, '20260808204905_p9_star_ascension_server_authority.sql')
    await applyMigration(db, '20260809073000_p9_gacha_server_authority.sql')
    await applyMigration(db, '20260809090000_p_currency_ledger_archive.sql')

    // An account exactly as production has them today — created by the OLD (0001) trigger,
    // which is still the live definition at this point in the chain: balance credited by a
    // direct UPDATE, no signup ledger row, lifetime_* left at the 20260809090000 backfill's
    // ledger-derived zero.
    await db.exec(`
      insert into auth.users (id, raw_user_meta_data)
      values ('${LEGACY_USER}', '{"uid":"LOS-3333-3333","name":"Legacy"}'::jsonb);
    `)

    await applyMigration(db, MIGRATION)
  }, 30_000)

  afterAll(async () => {
    await db.close()
  })

  // ── Finding 1 ────────────────────────────────────────────────────────────────────────────
  it("earn_gold rejects p_source = 'topup' and still accepts quest/drop", async () => {
    await expect(db.query(`select * from public.earn_gold('topup', 1000)`)).rejects.toThrow(
      'แหล่งที่มาทองไม่ถูกต้อง',
    )

    const before = await lifetime(db, LEGACY_USER)
    await db.query(`select * from public.earn_gold('drop', 81, 'f1-drop')`)
    await db.query(`select * from public.earn_gold('quest', 19, 'f1-quest')`)
    const after = await lifetime(db, LEGACY_USER)

    expect(after.gold).toBe(before.gold + 100)
    expect(Number(after.lifetime_gold_earned)).toBe(Number(before.lifetime_gold_earned) + 100)
  })

  it("no 'topup' row can be minted through earn_gold, while the ledger still allows the source", async () => {
    const topupRows = await db.query<{ count: string }>(
      `select count(*)::text as count from public.currency_transactions where source = 'topup'`,
    )
    expect(topupRows.rows[0]?.count).toBe('0')

    // The table constraint must still permit 'topup' — historical rows, the archive exclusion,
    // and cleanup_dead_unplayed_accounts' paying-player exemption all depend on it.
    const constraintAllowsTopup = await db.query<{ ok: boolean }>(`
      select pg_get_constraintdef(oid) like '%topup%' as ok
      from pg_constraint where conname = 'currency_transactions_source_check'
    `)
    expect(constraintAllowsTopup.rows[0]?.ok).toBe(true)
  })

  it('keeps the gacha negative-amount rule intact after the constraint rewrite', async () => {
    await db.exec(`
      insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
      values ('${LEGACY_USER}', 'gem', 'gacha', -160, 'constraint-probe');
    `)
    const debit = await db.query<{ amount: number }>(
      `select amount from public.currency_transactions
       where profile_id = $1 and ref_id = 'constraint-probe'`,
      [LEGACY_USER],
    )
    expect(debit.rows[0]?.amount).toBe(-160)

    // and a gold debit is still illegal
    await expect(
      db.exec(`
        insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
        values ('${LEGACY_USER}', 'gold', 'gacha', -1, 'constraint-probe-bad');
      `),
    ).rejects.toThrow()
  })

  // ── Finding 4 ────────────────────────────────────────────────────────────────────────────
  it('new account creation writes two signup ledger rows matching its balance', async () => {
    await db.exec(`
      insert into auth.users (id, raw_user_meta_data)
      values ('${NEW_USER}', '{"uid":"LOS-4444-4444","name":"Newborn"}'::jsonb);
    `)

    const rows = await signupRows(db, NEW_USER)
    expect(rows).toEqual([
      { currency: 'gem', amount: 20, ref_id: 'signup' },
      { currency: 'gold', amount: 500, ref_id: 'signup' },
    ])

    const profile = await lifetime(db, NEW_USER)
    expect(profile.gold).toBe(500)
    expect(profile.gem).toBe(20)
    expect(Number(profile.lifetime_gold_earned)).toBe(500)
    expect(Number(profile.lifetime_gem_earned)).toBe(20)
  })

  it('backfills an existing account once — ledger rows added, balance untouched', async () => {
    const rows = await signupRows(db, LEGACY_USER)
    expect(rows).toEqual([
      { currency: 'gem', amount: 20, ref_id: 'signup-backfill' },
      { currency: 'gold', amount: 500, ref_id: 'signup-backfill' },
    ])

    // lifetime_gem_earned was 0 before the backfill (nothing in the ledger to derive it from)
    // and is now the signup grant exactly. gem balance must NOT have moved — the old trigger
    // already credited it; recording it again would mint currency.
    const profile = await lifetime(db, LEGACY_USER)
    expect(Number(profile.lifetime_gem_earned)).toBe(20)
    expect(profile.gem).toBe(20)
    // gold: 500 signup backfill + the 100 earned in the Finding 1 test above
    expect(Number(profile.lifetime_gold_earned)).toBe(600)
    expect(profile.gold).toBe(600)
  })

  it('re-running the migration does not double the backfill', async () => {
    const before = await lifetime(db, LEGACY_USER)
    const beforeNew = await lifetime(db, NEW_USER)

    await applyMigration(db, MIGRATION)

    expect(await signupRows(db, LEGACY_USER)).toHaveLength(2)
    expect(await signupRows(db, NEW_USER)).toHaveLength(2)

    const after = await lifetime(db, LEGACY_USER)
    const afterNew = await lifetime(db, NEW_USER)
    expect(after).toEqual(before)
    expect(afterNew).toEqual(beforeNew)
  })

  it("never archives a 'signup' row, so the backfill guard cannot be aged out", async () => {
    await db.exec(
      `update public.currency_transactions set created_at = now() - interval '5 years'
       where profile_id = '${LEGACY_USER}'`,
    )

    await db.query(`select public.archive_currency_transactions()`)

    expect(await signupRows(db, LEGACY_USER)).toHaveLength(2)
  })
})
