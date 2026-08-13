import { beforeEach, describe, expect, it, vi } from 'vitest'

// `register()` is the entry point for every email account in the game and had no test at all —
// which is why removing its client-side UID generation and three-attempt retry (8c9361e) left the
// suite green either way. Green meant "nothing runs it", not "the behaviour holds".
//
// The UID assertions here are the load-bearing ones: a client that sends its own uid in signup
// metadata is a second generator racing the server's, and `handle_new_user` (migration
// 20260813000000) is now the only issuer. Nothing else in the tree would notice that coming back.

const { signUpMock, supabaseMock } = vi.hoisted(() => {
  const signUpFn = vi.fn()
  return { signUpMock: signUpFn, supabaseMock: { auth: { signUp: signUpFn } } }
})

vi.mock('../lib/supabaseClient', () => ({ getSupabase: () => supabaseMock }))
vi.mock('../lib/errors/reportError', () => ({ reportError: vi.fn() }))

const { register } = await import('./accountRepository.supabase')

// Every case here stops at or before the signUp result, so `loadPlayer` (module-private, and the
// only thing past that point) never runs and needs no stub. The success path itself is left to
// the persistence suite, which already owns the profile-read shape.
beforeEach(() => {
  signUpMock.mockReset()
})

describe('register — Supabase path', () => {
  it('never sends a uid in signup metadata: the server is the only issuer', async () => {
    signUpMock.mockResolvedValue({ data: { user: null }, error: null })

    await register('player@example.com', 'hunter2hunter2')

    expect(signUpMock).toHaveBeenCalledTimes(1)
    const [payload] = signUpMock.mock.calls[0]

    // The whole point. `options.data` carried `{ uid }` before the server took over issuance;
    // if it comes back, two generators are live at once and the client's wins silently.
    expect(payload.options?.data).toBeUndefined()
    expect(JSON.stringify(payload)).not.toContain('uid')
  })

  it('forwards the captcha token, which the shared interface now declares', async () => {
    signUpMock.mockResolvedValue({ data: { user: null }, error: null })

    await register('player@example.com', 'hunter2hunter2', 'captcha-abc')

    const [payload] = signUpMock.mock.calls[0]
    expect(payload.options?.captchaToken).toBe('captcha-abc')
  })

  it('calls signUp exactly once — the collision retry belongs to the server now', async () => {
    // The removed loop re-ran signUp on any error containing "duplicate". A UID collision can no
    // longer surface here: handle_new_user retries 20 times against the unique constraint before
    // raising, and reaching that means the generator is broken, not that redrawing would help.
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: 'duplicate key value violates unique constraint' },
    })

    const result = await register('player@example.com', 'hunter2hunter2')

    expect(signUpMock).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(false)
  })

  it('names the already-registered case and stays generic on everything else', async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })
    const taken = await register('player@example.com', 'hunter2hunter2')
    expect(taken).toEqual({ ok: false, error: 'อีเมลนี้ถูกใช้สมัครไปแล้ว' })

    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: 'network unreachable' },
    })
    const other = await register('player@example.com', 'hunter2hunter2')
    expect(other).toEqual({ ok: false, error: 'สมัครไม่สำเร็จด้วยข้อผิดพลาดที่ไม่คาดคิด' })
  })

  it('rejects a signUp that reports success with no user rather than treating it as ok', async () => {
    signUpMock.mockResolvedValue({ data: { user: null }, error: null })

    const result = await register('player@example.com', 'hunter2hunter2')

    expect(result.ok).toBe(false)
    expect(result).toEqual({ ok: false, error: 'สมัครไม่สำเร็จด้วยข้อผิดพลาดที่ไม่คาดคิด' })
  })

  it('validates before reaching the network — a bad password never hits signUp', async () => {
    const result = await register('player@example.com', 'short')

    expect(result.ok).toBe(false)
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('validates the email before reaching the network too', async () => {
    const result = await register('not-an-email', 'hunter2hunter2')

    expect(result.ok).toBe(false)
    expect(signUpMock).not.toHaveBeenCalled()
  })
})
