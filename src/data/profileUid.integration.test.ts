import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Covers audit 2026-08-12 §0b.1: every Google-OAuth and guest account was issued a malformed
// public UID, because `handle_new_user` fell back to `substr(new.id::text, 1, 10)` whenever the
// client did not supply one in its signup metadata — which neither `signInAnonymously` nor
// `signInWithOAuth` ever did.
//
// These run against the real migration file rather than a transcription of it, the same way
// `spriteContract.test.ts` opens the shipped .webp instead of trusting the calibration table.
// The point is not that the SQL reads correctly; it is that the SQL, executed, produces UIDs the
// application's own validator accepts.

const MIGRATION = '20260813000000_fix_malformed_public_uid.sql'

// The contract from src/game/uid.ts — restated here on purpose rather than imported. Importing
// `isValidUid` would assert the regex against itself; what needs proving is that SQL output
// satisfies the rule the UI enforces, so the rule is written out independently.
const UID_CONTRACT = /^[1-9][0-9]{9}$/

async function applyMigrationFunctionsOnly(db: PGlite): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8')

  // `handle_new_user` references auth.users and the full profile schema, neither of which exists
  // in a bare PGlite instance. The generator is pure and self-contained by design, so it is
  // extracted and applied alone — that separation is why it was written as its own function.
  const start = sql.indexOf('create or replace function public.issue_profile_uid()')
  const end = sql.indexOf('comment on function public.issue_profile_uid()')
  if (start < 0 || end < 0) throw new Error('issue_profile_uid() not found in the migration')

  await db.exec(sql.slice(start, end))
}

describe('public UID issuance (isolated Postgres via PGlite)', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await applyMigrationFunctionsOnly(db)
  })

  afterAll(async () => {
    await db.close()
  })

  it('issues UIDs the app validator accepts — the old substring fallback did not', async () => {
    const result = await db.query<{ uid: string }>(
      'select public.issue_profile_uid() as uid from generate_series(1, 2000)',
    )
    const uids = result.rows.map((r) => r.uid)
    expect(uids).toHaveLength(2000)

    const malformed = uids.filter((uid) => !UID_CONTRACT.test(uid))
    expect(malformed).toEqual([])

    // The exact shape the friend-search box needs. It strips non-digits from its input, so a UID
    // containing a hyphen cannot be typed in at all — which is what made the old value
    // unrecoverable rather than merely inconvenient.
    expect(uids.every((uid) => uid.length === 10)).toBe(true)
    expect(uids.some((uid) => uid.startsWith('0'))).toBe(false)
  })

  it('proves the pre-fix expression is what this migration removes', async () => {
    // The old fallback, executed rather than described: substr(uuid, 1, 10) over real UUIDs.
    // If this ever starts passing UID_CONTRACT, the finding was misdiagnosed and the migration
    // is solving the wrong problem.
    const result = await db.query<{ old_uid: string }>(
      'select substr(gen_random_uuid()::text, 1, 10) as old_uid from generate_series(1, 200)',
    )
    const oldUids = result.rows.map((r) => r.old_uid)

    const passing = oldUids.filter((uid) => UID_CONTRACT.test(uid))
    expect(passing).toEqual([])

    // And specifically: it is always 8 hex + '-' + 1 hex, which is why it can never be typed
    // into a digits-only input.
    expect(oldUids.every((uid) => uid[8] === '-')).toBe(true)
  })

  it('spreads across the space rather than clustering — collisions stay a constraint concern', async () => {
    const result = await db.query<{ uid: string }>(
      'select public.issue_profile_uid() as uid from generate_series(1, 5000)',
    )
    const uids = result.rows.map((r) => r.uid)

    // 5000 draws from 9e9: the birthday-collision expectation is ~0.0014, so any duplicate here
    // is a broken generator, not luck. This is the property the retry loop in handle_new_user
    // leans on — if draws collided often, 20 attempts would not be enough.
    expect(new Set(uids).size).toBe(uids.length)

    // Every leading digit 1-9 should show up across 5000 draws; a generator stuck on a subset
    // would shrink the real space by an order of magnitude without failing anything above.
    const leading = new Set(uids.map((uid) => uid[0]))
    expect(leading.size).toBe(9)
  })
})
