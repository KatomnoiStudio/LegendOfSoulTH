import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UID_LENGTH } from '../game/uid'

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

// The contract, rebuilt from `UID_LENGTH` rather than hard-coded, so changing the length in one
// place does not leave this file asserting the old one and blaming the SQL for it.
//
// `isValidUid` itself is deliberately NOT imported: it IS the regex, so asserting SQL output
// against it would let a loosened validator silently loosen this test too. Reading the length
// but rebuilding the pattern keeps the drift out without giving up the independent check.
const UID_CONTRACT = new RegExp(`^[1-9][0-9]{${UID_LENGTH - 1}}$`)

async function applyMigrationFunctionsOnly(db: PGlite): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', MIGRATION), 'utf8')

  // `handle_new_user` references auth.users and the full profile schema, neither of which exists
  // in a bare PGlite instance. The generator is pure and self-contained by design, so it is
  // extracted and applied alone — that separation is why it was written as its own function.
  const start = sql.indexOf('create or replace function public.issue_profile_uid()')
  const end = sql.indexOf('comment on function public.issue_profile_uid()')

  // Ordering is checked, not just presence. If the comment ever moves above the definition,
  // slice() returns '' and db.exec('') succeeds silently — every test then fails with
  // "function does not exist", which points at the SQL instead of at this extraction.
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(
      `could not extract issue_profile_uid() from ${MIGRATION} ` +
        `(create at ${start}, comment at ${end}) — the definition must precede its comment`,
    )
  }

  await db.exec(sql.slice(start, end))
}

describe('public UID issuance (isolated Postgres via PGlite)', () => {
  let db: PGlite

  // 20s, matching gachaAuthority.integration.test.ts — booting PGlite is a WASM Postgres cold
  // start, which clears the 10s default alone but not under a full parallel suite. Written
  // without this at first and it passed three CI runs before failing on the fourth: the flake
  // shows up as a hook timeout with zero failing assertions, which reads like an infra problem
  // rather than a missing argument.
  beforeAll(async () => {
    db = new PGlite()
    await applyMigrationFunctionsOnly(db)
  }, 20_000)

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

    // NOT `new Set(uids).size === uids.length`. That reads like the strictest possible check and
    // is really a coin flip: 5000 draws from 9e9 collide with probability
    // 1 - exp(-n(n-1)/2N) = 0.1388%, so on a perfectly correct generator it turns CI red about
    // once every 721 runs — and the failure reads "the generator is broken" when nothing is.
    //
    // The property that actually matters is that draws SPREAD, which is what lets
    // handle_new_user's 20-attempt retry loop terminate. A generator stuck on a small subset
    // fails this by a mile; ordinary birthday luck cannot.
    const distinct = new Set(uids).size
    expect(distinct).toBeGreaterThanOrEqual(uids.length - 5)

    // Every leading digit 1-9 should show up across 5000 draws; a generator stuck on a subset
    // would shrink the real space by an order of magnitude without failing anything above.
    const leading = new Set(uids.map((uid) => uid[0]))
    expect(leading.size).toBe(9)
  })
})
