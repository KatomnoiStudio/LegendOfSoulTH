import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createDefaultSkillLevels } from '../game/realtimeBattle/SkillProgressionSystem'
import type { OwnedCharacter, Player, PlayerProgress } from '../types/player'

/*
  ── 2026-08-10 audit, F1/F2/F3 — the save/load path's data-integrity guards ────────────────

  F1: `savePlayer` read `friends` back in `loadPlayer` but never wrote it. The table and its RLS
      write policy have existed since 0001_init.sql:113 — only the client call was missing. The
      add-friend toast said "added" (savePlayer really did return true) and the friend was gone
      on the next load, with nothing tying the two events together.

  F2: the highest-leverage guard in the whole set — assert that EVERY field of `Player` is
      accounted for by exactly one owner (savePlayer's own writes, a server-owned RPC, a
      read-only identity field, or a NAMED known gap). A field nobody owns is a field that
      silently does not persist, which is how F1 happened at all and how the dormant
      dungeon-EXP and `progress.energy` traps are still sitting there today.

  F3: `loadPlayer` fires 8 queries in parallel and used to inspect only the first one's error.
      supabase-js resolves errors as `{ data, error }` and never throws, so a failed query
      degraded into an empty array — and the very next `savePlayer` wrote that emptiness back
      over the real rows.
*/

const { supabaseMock, fromMock, reportErrorMock, writes } = vi.hoisted(() => {
  const fromFn = vi.fn()
  const reportErrorFn = vi.fn()
  return {
    fromMock: fromFn,
    reportErrorMock: reportErrorFn,
    writes: [] as Array<{ table: string; op: 'update' | 'upsert' | 'delete'; payload: unknown }>,
    supabaseMock: {
      from: fromFn,
      rpc: vi.fn(),
      auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    },
  }
})

vi.mock('../lib/supabaseClient', () => ({ getSupabase: () => supabaseMock }))
vi.mock('../lib/errors/reportError', () => ({ reportError: reportErrorMock }))

type QueryResult = { data: unknown; error: unknown }

/**
 * Recording query builder — every terminal awaits to the same result, and every WRITE verb is
 * logged so a test can ask "which columns did savePlayer actually send, to which table?".
 *
 * Built by attaching methods onto a real `Promise.resolve` rather than composing an object with
 * a `then` key: oxlint's unicorn/no-thenable forbids the latter, and this way `.then` comes from
 * `Promise.prototype` for real (same approach as accountRepository.supabase.test.ts).
 */
function builder(table: string, result: QueryResult) {
  const promise = Promise.resolve(result) as Promise<QueryResult> & Record<string, unknown>
  promise.select = () => builder(table, result)
  promise.eq = () => builder(table, result)
  promise.not = () => builder(table, result)
  promise.order = () => builder(table, result)
  promise.maybeSingle = () => Promise.resolve(result)
  promise.update = (payload: unknown) => {
    writes.push({ table, op: 'update', payload })
    return builder(table, result)
  }
  promise.upsert = (payload: unknown) => {
    writes.push({ table, op: 'upsert', payload })
    return builder(table, result)
  }
  promise.delete = () => {
    writes.push({ table, op: 'delete', payload: null })
    return builder(table, result)
  }
  return promise
}

const PROFILE_ROW = {
  id: 'profile-1',
  uid: '1234567890',
  name: 'Tester',
  title: 'ผู้จาริกหน้าใหม่',
  level: 7,
  exp: 40,
  exp_to_next: 100,
  gold: 500,
  gem: 20,
  frame_id: 'arcane',
  flags: { intro_done: true },
  defeated_npc_ids: ['npc-1'],
}

/** Every table resolves fine unless a test injects a failure for one specific table. */
function mockTables(errorByTable: Record<string, { message: string }> = {}) {
  fromMock.mockImplementation((table: string) => {
    const error = errorByTable[table] ?? null
    if (error) return builder(table, { data: null, error })
    if (table === 'profiles') return builder(table, { data: PROFILE_ROW, error: null })
    if (table === 'owned_characters')
      return builder(table, {
        data: [
          {
            character_id: 'monkey-king',
            level: 5,
            exp: 10,
            exp_to_next: 200,
            obtained_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      })
    if (table === 'team_slots')
      return builder(table, {
        data: [{ slot_index: 0, character_id: 'monkey-king' }],
        error: null,
      })
    if (table === 'friends')
      return builder(table, {
        data: [{ friend_uid: '9876543210', name: 'Friend', level: 3, title: 'นักรบ' }],
        error: null,
      })
    return builder(table, { data: [], error: null })
  })
}

function makeOwned(): OwnedCharacter {
  return {
    characterId: 'monkey-king',
    level: 5,
    exp: 10,
    expToNext: 200,
    obtainedAt: '2026-01-01T00:00:00.000Z',
    skillLevels: createDefaultSkillLevels(),
    talentState: { unlockedNodes: ['mk-1'] },
    awakeningState: { tier: 1, unlockedEffects: ['awakening-tier-1'] },
    progressionVersion: 1,
    star: 2,
    shards: 4,
  }
}

function makeProgress(): PlayerProgress {
  return {
    flags: { intro_done: true },
    defeatedNpcIds: ['npc-1'],
    battleHistory: [
      {
        id: 'battle-1',
        opponent: 'ทดสอบ',
        result: 'win',
        finishedAt: '2026-08-01T00:00:00.000Z',
        durationMs: 12_000,
      },
    ],
    energy: { current: 5, max: 10, lastRegenAt: '2026-08-01T00:00:00.000Z' },
  }
}

function makePlayer(): Player {
  return {
    id: 'profile-1',
    uid: '1234567890',
    name: 'Tester',
    title: 'ผู้จาริกหน้าใหม่',
    level: 7,
    exp: 40,
    expToNext: 100,
    currency: { gold: 500, gem: 20 },
    ownedCharacters: [makeOwned()],
    inventory: [
      {
        itemId: 'iron-essence',
        quantity: 3,
        obtainedAt: '2026-08-01T00:00:00.000Z',
        obtainedFrom: 'drop',
      },
    ],
    friends: [{ uid: '9876543210', name: 'Friend', level: 3, title: 'นักรบ' }],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'arcane',
    progress: makeProgress(),
    gachaPity: { 'standard-banner': 12 },
  }
}

beforeEach(() => {
  writes.length = 0
  fromMock.mockReset()
  reportErrorMock.mockReset()
  supabaseMock.auth.getSession.mockReset()
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'profile-1' } } },
  })
  mockTables()
})

describe('F1: savePlayer writes the friends list', () => {
  test('upserts every friend with the columns the friends table declares', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')

    const saved = await savePlayer(makePlayer())

    expect(saved).toBe(true)
    const friendWrite = writes.find((w) => w.table === 'friends' && w.op === 'upsert')
    // Old code never touched the friends table at all — this find() returned undefined.
    expect(friendWrite?.payload).toEqual([
      {
        profile_id: 'profile-1',
        friend_uid: '9876543210',
        name: 'Friend',
        level: 3,
        title: 'นักรบ',
      },
    ])
  })

  test('prunes friends that are no longer in the list — after the upsert, never before', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')

    await savePlayer(makePlayer())

    const friendOps = writes.filter((w) => w.table === 'friends').map((w) => w.op)
    // Delete-then-insert would lose the whole list if the second half failed.
    expect(friendOps).toEqual(['upsert', 'delete'])
  })

  test('a friends write failure fails the whole save — no silent success toast', async () => {
    mockTables({ friends: { message: 'permission denied for table friends' } })
    const { savePlayer } = await import('./accountRepository.supabase')

    expect(await savePlayer(makePlayer())).toBe(false)
  })
})

describe('F3: loadPlayer checks every one of its 8 queries', () => {
  test.each(['owned_characters', 'team_slots', 'inventory_items', 'friends', 'battle_history'])(
    'a failed %s query fails the load loudly instead of degrading to empty',
    async (table) => {
      mockTables({ [table]: { message: 'network error' } })
      const { getSessionPlayer } = await import('./accountRepository.supabase')

      const player = await getSessionPlayer()

      // Old code inspected profileRes only: it returned a fully-formed Player with this table's
      // data silently blank, and the next savePlayer wrote that blankness back over the real rows.
      expect(player).toBeNull()
      expect(reportErrorMock).toHaveBeenCalledWith(
        'PLAYER_LOAD_FAIL',
        'visible',
        expect.objectContaining({ message: 'network error' }),
      )
    },
  )

  test('a healthy load still returns the full player — the check is not a blanket refusal', async () => {
    const { getSessionPlayer } = await import('./accountRepository.supabase')

    const player = await getSessionPlayer()

    expect(player?.teamSlots[0]).toBe('monkey-king')
    expect(player?.friends).toHaveLength(1)
    expect(reportErrorMock).not.toHaveBeenCalled()
  })
})

describe('F3: savePlayer refuses to write an empty team over a real roster', () => {
  test('an all-null team with characters owned is rejected, and team_slots is never touched', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')

    const saved = await savePlayer({ ...makePlayer(), teamSlots: [null, null, null, null] })

    expect(saved).toBe(false)
    expect(writes.some((w) => w.table === 'team_slots')).toBe(false)
    expect(reportErrorMock).toHaveBeenCalledWith(
      'PLAYER_SAVE_FAIL',
      'visible',
      expect.objectContaining({ message: 'refusing to save an empty team' }),
    )
  })

  test('an all-null team on an account with NO characters is still allowed', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')

    const saved = await savePlayer({
      ...makePlayer(),
      ownedCharacters: [],
      teamSlots: [null, null, null, null],
    })

    expect(saved).toBe(true)
  })
})

/*
  ── F2: the column-coverage guard ─────────────────────────────────────────────────────────

  Everything below is derived from a REAL savePlayer call against the recording mock, not from a
  hand-maintained list — a field claimed as 'save-player' that savePlayer does not actually send
  fails here. That is exactly what `friends` did before this wave.

  Adding a field to `Player`, `PlayerProgress` or `OwnedCharacter` without classifying it here
  fails too. Pick the owner honestly:

    'save-player'  savePlayer sends it (the assertion below proves the column really is written)
    'rpc'          a SECURITY DEFINER RPC owns it; the client cannot and must not write it
    'read-only'    server-assigned identity, never written back from here
    'known-gap'    NOT PERSISTED TODAY, on purpose, with the reason and the fix named inline
*/

type FieldOwner = 'save-player' | 'rpc' | 'read-only' | 'known-gap'

/** Player field → the DB column that proves it, for anything claiming 'save-player'. */
const PLAYER_FIELD_COLUMNS: Record<string, { table: string; column: string }> = {
  name: { table: 'profiles', column: 'name' },
  title: { table: 'profiles', column: 'title' },
  frameId: { table: 'profiles', column: 'frame_id' },
  friends: { table: 'friends', column: 'friend_uid' },
  teamSlots: { table: 'team_slots', column: 'character_id' },
}

const PLAYER_FIELD_OWNERS: Record<keyof Player, FieldOwner> = {
  id: 'read-only',
  uid: 'read-only',
  name: 'save-player',
  title: 'save-player',
  frameId: 'save-player',
  friends: 'save-player',
  teamSlots: 'save-player',
  ownedCharacters: 'save-player',
  progress: 'save-player',
  // level/exp/expToNext: column-locked by 20260810130000 — commit_lobby_battle_progression owns
  // them. Sending them from savePlayer earns a 42501 that fails the ENTIRE save (#25).
  level: 'rpc',
  exp: 'rpc',
  expToNext: 'rpc',
  // gachaPity: perform_gacha_pull owns gacha_pity (20260809073000).
  gachaPity: 'rpc',
  /*
    KNOWN GAP — currency.gold and inventory are DEBITED client-side by
    progressionService.spendCost() for skill/talent/awakening upgrades, and neither can be
    written from here: profiles.gold is column-locked (0009) and inventory_items has no write
    policy for `authenticated` at all (0001_init.sql:111 grants select only).

    So the upgrade's EFFECT persists (skill_levels/talent_state/awakening_state below) while its
    COST does not: reload and the gold is back with the upgrade kept — free unlimited upgrades,
    and a currency bar that lies until the next refresh.

    Fix = ONE new RPC, not a widened grant. Smallest shape that works:
      spend_progression_cost(p_request_id uuid, p_hero_id text, p_upgrade text,
                             p_gold int, p_materials jsonb)
    debiting gold and materials in one transaction, rejecting an insufficient balance, idempotent
    on p_request_id like ascend_character_star already is, and writing the spend to
    currency_transactions. Needs a migration — belongs with #26 (skill/talent server authority).
  */
  currency: 'known-gap',
  inventory: 'known-gap',
}

const PROGRESS_FIELD_OWNERS: Record<keyof PlayerProgress, FieldOwner> = {
  flags: 'save-player',
  defeatedNpcIds: 'save-player',
  // battle_history rows are appended by commit_lobby_battle_progression, never by savePlayer.
  battleHistory: 'rpc',
  /*
    KNOWN GAP — §5.1 energy. LobbyBattleSession writes player.progress.energy on every stage
    entry, savePlayer sends only flags and defeated_npc_ids, and there is no energy column at
    all. Stage entry therefore costs nothing across a reload. Closing it is a schema decision
    (a profiles column vs. a flags-encoded value), so it stays named here rather than guessed at.
  */
  energy: 'known-gap',
}

const OWNED_FIELD_OWNERS: Record<keyof OwnedCharacter, FieldOwner> = {
  characterId: 'read-only',
  obtainedAt: 'read-only',
  skillLevels: 'save-player',
  talentState: 'save-player',
  awakeningState: 'save-player',
  // Hero level/exp: same column lock as the profile's (20260810130000 / 20260808204905).
  level: 'rpc',
  exp: 'rpc',
  expToNext: 'rpc',
  star: 'rpc',
  shards: 'rpc',
  // Set by migrateOwnedCharacters on read; nothing writes it back and nothing reads it from the
  // server. Harmless today, but it is a stored-shape marker with no home — named, not ignored.
  progressionVersion: 'known-gap',
}

const OWNED_FIELD_COLUMNS: Record<string, { table: string; column: string }> = {
  skillLevels: { table: 'owned_characters', column: 'skill_levels' },
  talentState: { table: 'owned_characters', column: 'talent_state' },
  awakeningState: { table: 'owned_characters', column: 'awakening_state' },
}

/** Columns savePlayer actually sent, per table, gathered from the recorded write payloads. */
function writtenColumns(): Record<string, Set<string>> {
  const byTable: Record<string, Set<string>> = {}
  for (const write of writes) {
    if (write.op === 'delete') continue
    const rows = Array.isArray(write.payload) ? write.payload : [write.payload]
    const columns = (byTable[write.table] ??= new Set())
    for (const row of rows) {
      for (const column of Object.keys(row as Record<string, unknown>)) columns.add(column)
    }
  }
  return byTable
}

describe('F2: every Player field has exactly one declared owner', () => {
  test('no field of Player is unclassified', () => {
    expect(Object.keys(makePlayer()).toSorted()).toEqual(Object.keys(PLAYER_FIELD_OWNERS).toSorted())
  })

  test('no field of PlayerProgress is unclassified', () => {
    expect(Object.keys(makeProgress()).toSorted()).toEqual(Object.keys(PROGRESS_FIELD_OWNERS).toSorted())
  })

  test('no field of OwnedCharacter is unclassified', () => {
    expect(Object.keys(makeOwned()).toSorted()).toEqual(Object.keys(OWNED_FIELD_OWNERS).toSorted())
  })

  test('every field claiming save-player really is written by savePlayer', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')
    await savePlayer(makePlayer())
    const written = writtenColumns()

    const claimed = Object.entries(PLAYER_FIELD_OWNERS)
      .filter(([, owner]) => owner === 'save-player')
      .map(([field]) => field)
      // ownedCharacters/progress are containers — their own leaves are checked separately.
      .filter((field) => field in PLAYER_FIELD_COLUMNS)

    for (const field of claimed) {
      const { table, column } = PLAYER_FIELD_COLUMNS[field]
      // `friends` is the one that failed here before this wave: claimed, never written.
      expect(written[table]?.has(column), `${field} → ${table}.${column}`).toBe(true)
    }

    for (const [field, { table, column }] of Object.entries(OWNED_FIELD_COLUMNS)) {
      expect(written[table]?.has(column), `ownedCharacters.${field}`).toBe(true)
    }
    expect(written.profiles?.has('flags')).toBe(true)
    expect(written.profiles?.has('defeated_npc_ids')).toBe(true)
  })

  test('nothing claiming rpc or known-gap leaks into a savePlayer write', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')
    await savePlayer(makePlayer())
    const written = writtenColumns()

    // Sending any of these earns a 42501 that fails the whole save (#25), or silently
    // implies a persistence guarantee that does not exist.
    for (const column of ['level', 'exp', 'exp_to_next', 'gold', 'gem', 'energy']) {
      expect(written.profiles?.has(column), `profiles.${column}`).not.toBe(true)
    }
    for (const column of ['level', 'exp', 'exp_to_next', 'star', 'shards']) {
      expect(written.owned_characters?.has(column), `owned_characters.${column}`).not.toBe(true)
    }
    expect(written.inventory_items).toBeUndefined()
  })

  test('savePlayer writes these four tables and no others', async () => {
    const { savePlayer } = await import('./accountRepository.supabase')
    await savePlayer(makePlayer())

    expect([...new Set(writes.map((w) => w.table))].toSorted()).toEqual([
      'friends',
      'owned_characters',
      'profiles',
      'team_slots',
    ])
  })
})
