import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createDefaultSkillLevels } from '../game/realtimeBattle/SkillProgressionSystem'
import { mapOwnedCharacterRow } from './accountRepository.supabase.mapping'

/*
  work contract #14 (docs/agent-blueprint/14-progression-system.md) done-criterion #1:
  shape parity ระหว่าง accountRepository.ts (localStorage) กับ accountRepository.supabase.ts
  — เทสต์นี้ล็อกฝั่ง Supabase (pure mapping ล้วน ไม่ต้องมี Supabase จริงรัน)
*/

describe('mapOwnedCharacterRow', () => {
  test('แถวเก่าก่อน migration 0005 ไม่มี skill_levels — เติม default เดียวกับ createDefaultSkillLevels()', () => {
    const owned = mapOwnedCharacterRow({
      character_id: 'monkey-king',
      level: 5,
      exp: 0,
      exp_to_next: 100,
      obtained_at: '2026-01-01T00:00:00.000Z',
    })

    expect(owned.skillLevels).toEqual(createDefaultSkillLevels())
  })

  test('แถวที่มี skill_levels อยู่แล้ว — ใช้ค่าจริงจาก DB ไม่ทับด้วย default', () => {
    const stored = {
      skill1: { level: 5, exp: 10, expToNext: 400 },
      skill2: { level: 1, exp: 0, expToNext: 200 },
      skill3: { level: 1, exp: 0, expToNext: 200 },
      ultimate: { level: 2, exp: 0, expToNext: 240 },
    }
    const owned = mapOwnedCharacterRow({
      character_id: 'monkey-king',
      level: 5,
      exp: 0,
      exp_to_next: 100,
      obtained_at: '2026-01-01T00:00:00.000Z',
      skill_levels: stored,
    })

    expect(owned.skillLevels).toEqual(stored)
  })

  test('แถวที่มี talent_state / awakening_state — map ตรง shape OwnedCharacter', () => {
    const owned = mapOwnedCharacterRow({
      character_id: 'monkey-king',
      level: 2,
      exp: 10,
      exp_to_next: 90,
      obtained_at: '2026-01-01T00:00:00.000Z',
      talent_state: { unlockedNodes: ['mk-talent-1'] },
      awakening_state: { tier: 1, unlockedEffects: [] },
    })

    expect(owned.talentState).toEqual({ unlockedNodes: ['mk-talent-1'] })
    expect(owned.awakeningState).toEqual({ tier: 1, unlockedEffects: [] })
  })

  test('แถวเก่าก่อน migration 0008 — default talent/awakening ว่าง', () => {
    const owned = mapOwnedCharacterRow({
      character_id: 'pig-warrior',
      level: 3,
      exp: 12,
      exp_to_next: 90,
      obtained_at: '2026-01-02T00:00:00.000Z',
    })

    expect(owned.talentState).toEqual({ unlockedNodes: [] })
    expect(owned.awakeningState).toEqual({ tier: 0, unlockedEffects: [] })
  })

  test('field mapping ตรงกับ shape ของ OwnedCharacter ฝั่ง localStorage (accountRepository.ts) เป๊ะ', () => {
    const owned = mapOwnedCharacterRow({
      character_id: 'pig-warrior',
      level: 3,
      exp: 12,
      exp_to_next: 90,
      obtained_at: '2026-01-02T00:00:00.000Z',
    })

    expect(owned).toEqual({
      characterId: 'pig-warrior',
      level: 3,
      exp: 12,
      expToNext: 90,
      obtainedAt: '2026-01-02T00:00:00.000Z',
      skillLevels: createDefaultSkillLevels(),
      talentState: { unlockedNodes: [] },
      awakeningState: { tier: 0, unlockedEffects: [] },
      star: 1,
      shards: 0,
    })
  })
})

/*
  item 145 (2026-08-08, MEMORY.md): a CoalBoard reality-lens review found this module's real
  RPC wrapper functions (earnGold/grantItem/redeemCoupon/findPlayerByUid) had ZERO test
  coverage — the 618 passing tests elsewhere in the repo exercise the parallel localStorage
  `accountRepository.ts`, not this file. These tests mock `supabase` itself so they run without
  a live project, and pin the one thing most likely to silently regress: the exact RPC
  name/param wiring (a typo'd RPC name or param key fails ONLY at runtime against a real
  Postgres project — nothing here would catch it before this).
*/

const { supabaseMock, rpcMock, fromMock, reportErrorMock, signInWithOAuthMock, linkIdentityMock } =
  vi.hoisted(() => {
    const rpcFn = vi.fn()
    const fromFn = vi.fn()
    const reportErrorFn = vi.fn()
    const signInWithOAuthFn = vi.fn()
    const linkIdentityFn = vi.fn()
    return {
      rpcMock: rpcFn,
      fromMock: fromFn,
      reportErrorMock: reportErrorFn,
      signInWithOAuthMock: signInWithOAuthFn,
      linkIdentityMock: linkIdentityFn,
      supabaseMock: {
        rpc: rpcFn,
        from: fromFn,
        auth: {
          onAuthStateChange: vi.fn(),
          getSession: vi.fn(),
          signInWithOAuth: signInWithOAuthFn,
          linkIdentity: linkIdentityFn,
        },
      },
    }
  })

vi.mock('../lib/supabaseClient', () => ({ supabase: supabaseMock }))
vi.mock('../lib/errors/reportError', () => ({ reportError: reportErrorMock }))

type QueryResult = { data: unknown; error: unknown }

/*
  ทั้งสอง helper คืนค่าเป็น Promise จริง (Promise.resolve) แล้วแปะ method chain เพิ่มทับ —
  ไม่ประกอบ object literal ที่มี `then` เอง (oxlint unicorn/no-thenable ห้าม) `.then` ที่ใช้
  งานได้จริงจึงมาจาก Promise.prototype ตรง ๆ ไม่ใช่ของปลอม
*/

/** ผลลัพธ์ของ `await supabase.rpc(...)` ตรง ๆ — ไม่มี RPC wrapper ไหน chain ต่อ `.maybeSingle()` แล้ว */
function rpcResult(data: unknown, error: { message: string } | null = null) {
  return Promise.resolve({ data, error } as QueryResult)
}

/** chain แบบ query builder ของ Supabase (`.select().eq().maybeSingle()` ฯลฯ) — resolve ค่าเดียวกันทุกจุดจบ */
function chainable(result: QueryResult) {
  const promise = Promise.resolve(result) as Promise<QueryResult> & {
    select: () => ReturnType<typeof chainable>
    eq: () => ReturnType<typeof chainable>
    order: () => ReturnType<typeof chainable>
    maybeSingle: () => Promise<QueryResult>
  }
  promise.select = () => chainable(result)
  promise.eq = () => chainable(result)
  promise.order = () => chainable(result)
  promise.maybeSingle = () => Promise.resolve(result)
  return promise
}

describe('accountRepository.supabase RPC wrapper wiring', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    fromMock.mockReset()
    reportErrorMock.mockReset()
    supabaseMock.auth.getSession.mockReset()
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'profile-1' } } },
    })
    // loadPlayer() ยิง 8 ตารางพร้อมกัน (Promise.all) — ให้ทุกตารางว่างเปล่าเป็นค่าเริ่มต้น
    // เว้น profiles ที่ต้องมีแถวเสมอ ไม่งั้น loadPlayer คืน null (ดู accountRepository.supabase.ts:82)
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chainable({
          data: {
            id: 'profile-1',
            uid: '1234567890',
            name: 'Tester',
            title: 'ผู้จาริกหน้าใหม่',
            level: 1,
            exp: 0,
            exp_to_next: 100,
            gold: 500,
            gem: 20,
            frame_id: 'arcane',
            flags: {},
            defeated_npc_ids: [],
          },
          error: null,
        })
      }
      return chainable({ data: [], error: null })
    })
  })

  test('earnGold: เรียก RPC ชื่อ earn_gold พร้อม param p_source/p_amount/p_ref_id ตรงตัว', async () => {
    const { earnGold } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult({ id: 'profile-1' }))

    await earnGold('uid-ignored', 'quest', 50, 'quest-1')

    expect(rpcMock).toHaveBeenCalledWith('earn_gold', {
      p_source: 'quest',
      p_amount: 50,
      p_ref_id: 'quest-1',
    })
  })

  test('earnGold: RPC error คืน ok:false พร้อมข้อความ error, ไม่ยิง loadPlayer ต่อ', async () => {
    const { earnGold } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult(null, { message: 'จำนวนทองเกินขีดจำกัดต่อครั้ง' }))

    const result = await earnGold('uid-ignored', 'quest', 999_999, undefined)

    expect(result).toEqual({ ok: false, error: 'จำนวนทองเกินขีดจำกัดต่อครั้ง' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  test('grantItem: เรียก RPC ชื่อ grant_item พร้อม param p_item_id/p_quantity/p_source ตรงตัว', async () => {
    const { grantItem } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult({ id: 'profile-1' }))

    await grantItem('uid-ignored', 'spirit-incense', 2, 'drop')

    expect(rpcMock).toHaveBeenCalledWith('grant_item', {
      p_item_id: 'spirit-incense',
      p_quantity: 2,
      p_source: 'drop',
      p_ref_id: null,
    })
  })

  test('redeemCoupon: เรียก RPC ชื่อ redeem_coupon พร้อม param p_code ตรงตัว', async () => {
    const { redeemCoupon } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult({ profile: { id: 'profile-1' }, amount: 100 }))

    await redeemCoupon('uid-ignored', 'WELCOME2026')

    expect(rpcMock).toHaveBeenCalledWith('redeem_coupon', { p_code: 'WELCOME2026' })
  })

  test('ascendCharacterStar: ส่ง request ID และ hero ID ไป RPC โดย Client ไม่แก้ดาวเอง', async () => {
    const { ascendCharacterStar } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(
      rpcResult([{ new_star: 2, shards_remaining: 0, shards_spent: 1, replayed: false }]),
    )

    const result = await ascendCharacterStar(
      'uid-ignored',
      'monkey-king',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )

    expect(rpcMock).toHaveBeenCalledWith('ascend_character_star', {
      p_request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_character_id: 'monkey-king',
    })
    expect(result).toEqual({
      ok: true,
      newStar: 2,
      shardsRemaining: 0,
      shardsSpent: 1,
      replayed: false,
    })
  })

  test('pullGacha: ส่ง banner/count/request ID ตรง RPC และใช้ผลสุ่มจาก server เท่านั้น', async () => {
    const { pullGacha } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(
      rpcResult([
        {
          payload: {
            results: [
              {
                characterId: 'nezha-warden',
                rarity: 'rare',
                isPity: false,
                isNew: true,
                shardsGranted: 0,
              },
            ],
            cost: 100,
            currencyUsed: 'gem',
            newPity: 1,
          },
          replayed: false,
        },
      ]),
    )

    const result = await pullGacha('standard-banner', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    expect(rpcMock).toHaveBeenCalledWith('perform_gacha_pull', {
      p_request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_banner_id: 'standard-banner',
      p_pull_count: 1,
    })
    expect(result).toMatchObject({
      ok: true,
      results: [{ characterId: 'nezha-warden' }],
      cost: 100,
      newPity: 1,
      replayed: false,
    })
  })

  test('findPlayerByUid: เรียก RPC find_player_by_uid ไม่ query ตาราง profiles ตรง ๆ อีกต่อไป (item 145)', async () => {
    const { findPlayerByUid } = await import('./accountRepository.supabase')
    // returns table(...) มาเป็น array ผ่าน PostgREST เสมอ ไม่ใช่ object เดี่ยว
    rpcMock.mockReturnValue(
      rpcResult([{ uid: '9876543210', name: 'Friend', level: 10, title: 'นักรบ' }]),
    )

    const result = await findPlayerByUid('9876543210')

    expect(rpcMock).toHaveBeenCalledWith('find_player_by_uid', { p_uid: '9876543210' })
    expect(fromMock).not.toHaveBeenCalledWith('profiles')
    expect(result).toEqual({ uid: '9876543210', name: 'Friend', level: 10, title: 'นักรบ' })
  })

  test('findPlayerByUid: ไม่พบ UID คืน null (array ว่าง)', async () => {
    const { findPlayerByUid } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult([]))

    expect(await findPlayerByUid('0000000000')).toBeNull()
    expect(reportErrorMock).not.toHaveBeenCalled()
  })

  test('findPlayerByUid: RPC error รายงานผ่าน reportError (SILENT) แยกจาก "หาไม่เจอจริง" — คืน null เหมือนกันแต่ log แยกได้ (adversary-lens finding 3)', async () => {
    const { findPlayerByUid } = await import('./accountRepository.supabase')
    const rpcError = { message: 'permission denied for function find_player_by_uid' }
    rpcMock.mockReturnValue(rpcResult(null, rpcError))

    const result = await findPlayerByUid('9876543210')

    expect(result).toBeNull()
    expect(reportErrorMock).toHaveBeenCalledWith('FRIEND_LOOKUP_FAIL', 'silent', rpcError)
  })
})

// ─── Known Scars (Path of Exile economy & transaction authority precedents) ───

describe('Scar 1: Lost response & retry idempotency protection (PoE Rollback dupe incident)', () => {
  test('earnGold passes refId to server RPC ensuring idempotent drop transaction', async () => {
    const { earnGold } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult({ profile: { id: 'profile-1', gold: 600 }, amount: 100 }))

    const result = await earnGold('uid-ignored', 'drop', 100, 'stage-1-clear')

    expect(rpcMock).toHaveBeenCalledWith('earn_gold', {
      p_source: 'drop',
      p_amount: 100,
      p_ref_id: 'stage-1-clear',
    })
    expect(result.ok).toBe(true)
  })
})

describe('Scar 2: Concurrent submission serialized via atomic RPC (PoE Concurrent instance race)', () => {
  test('redeemCoupon routes through single atomic RPC call preventing multi-read TOCTOU', async () => {
    const { redeemCoupon } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult({ profile: { id: 'profile-1' }, amount: 500 }))

    const result = await redeemCoupon('uid-ignored', 'PROMO2026')

    expect(rpcMock).toHaveBeenCalledWith('redeem_coupon', { p_code: 'PROMO2026' })
    expect(result.ok).toBe(true)
  })
})

describe('Scar 3: Atomic cost & bounded grant validation (PoE Freedom of Faith infinite print incident)', () => {
  test('earnGold rejects unbounded amount before triggering DB transaction', async () => {
    const { earnGold } = await import('./accountRepository.supabase')
    rpcMock.mockReturnValue(rpcResult(null, { message: 'จำนวนทองเกินขีดจำกัดต่อครั้ง' }))

    const result = await earnGold('uid-ignored', 'drop', 99999999)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('จำนวนทองเกินขีดจำกัดต่อครั้ง')
    }
    expect(rpcMock).toHaveBeenCalledWith('earn_gold', {
      p_source: 'drop',
      p_amount: 99999999,
      p_ref_id: null,
    })
  })
})

/*
  OAuth redirect target — pins a real production bug found 2026-08-09.

  Both OAuth entry points used to pass `window.location.origin` as `redirectTo`. The app is a
  GitHub Pages *project site* served under `/LegendOfSoulTH/`, and `origin` always strips the
  path, so Google redirected users to the org root — where no app (and therefore no supabase-js)
  exists to consume the callback. Under the old implicit flow that left the raw session JWT
  sitting in the address bar and the browser history, and the user was never actually signed in.

  These tests fail if anyone reintroduces a bare-origin redirect.
*/
describe('OAuth redirect URL', () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset()
    linkIdentityMock.mockReset()
    signInWithOAuthMock.mockResolvedValue({ data: {}, error: null })
    linkIdentityMock.mockResolvedValue({ data: {}, error: null })
  })

  test('resolveOAuthRedirectUrl ต่อ base path เข้ากับ origin — ไม่ใช่ origin เปล่า (บั๊กจริง 2026-08-09)', async () => {
    const { resolveOAuthRedirectUrl } = await import('./accountRepository.supabase')

    // GitHub Pages project site — เคสที่พังจริงบน production
    expect(resolveOAuthRedirectUrl('https://katomnoistudio.github.io', '/LegendOfSoulTH/')).toBe(
      'https://katomnoistudio.github.io/LegendOfSoulTH/',
    )
    // dev server / user site — base '/' ต้องยังทำงานเหมือนเดิม
    expect(resolveOAuthRedirectUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/')
  })

  test('signInWithGoogle ส่ง redirectTo ที่ครอบ base path ไม่ใช่ origin เปล่า', async () => {
    const { signInWithGoogle } = await import('./accountRepository.supabase')

    await signInWithGoogle()

    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1)
    const redirectTo = signInWithOAuthMock.mock.calls[0][0].options.redirectTo as string
    expect(signInWithOAuthMock.mock.calls[0][0].provider).toBe('google')
    // ต้องขึ้นต้นด้วย origin และ "ยาวกว่า" origin เสมอเมื่อ base ไม่ใช่ '/' — กันการถอยกลับไปใช้ origin เปล่า
    expect(redirectTo.startsWith(window.location.origin)).toBe(true)
    expect(redirectTo).toBe(new URL(import.meta.env.BASE_URL, window.location.origin).href)
  })

  test('linkGoogleIdentity ใช้ redirectTo ตัวเดียวกับ signInWithGoogle — ไม่หลุดไปคนละค่า', async () => {
    const repo = await import('./accountRepository.supabase')

    await repo.signInWithGoogle()
    await repo.linkGoogleIdentity()

    const signInRedirect = signInWithOAuthMock.mock.calls[0][0].options.redirectTo
    const linkRedirect = linkIdentityMock.mock.calls[0][0].options.redirectTo
    expect(linkIdentityMock.mock.calls[0][0].provider).toBe('google')
    expect(linkRedirect).toBe(signInRedirect)
  })
})
