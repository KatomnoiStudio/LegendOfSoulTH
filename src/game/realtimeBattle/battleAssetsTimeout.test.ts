import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Audit 2026-08-12 §0b.2: `TextureLoader.loadAsync` has no timeout and is not covered by
// `createDeadlineFetch` (that wrapper is installed on the Supabase client only), so one texture
// that never settles kept `Promise.all` pending forever, `phase` stuck at 'loading', and the
// player on a screen with no way out.
//
// three is mocked at the module boundary rather than stubbed inside battleAssets, so what is
// under test is the real preload function — including the fact that a hung load is a hung
// PROMISE, which is the whole shape of the defect.

const { loadAsyncMock } = vi.hoisted(() => ({ loadAsyncMock: vi.fn() }))

vi.mock('three', () => ({
  SRGBColorSpace: 'srgb',
  TextureLoader: class {
    loadAsync = loadAsyncMock
  },
}))
vi.mock('../../lib/errors/reportError', () => ({ reportError: vi.fn() }))

const { preloadBattleTextures, BattleAssetTimeoutError, BATTLE_TEXTURE_TIMEOUT_MS } =
  await import('./battleAssets')
const { reportError } = await import('../../lib/errors/reportError')

/** A load that never settles — the exact condition the old code had no answer for. */
function neverSettles(): Promise<never> {
  return new Promise(() => {})
}

function fakeTexture() {
  return { colorSpace: '', needsUpdate: false }
}

beforeEach(() => {
  vi.useFakeTimers()
  loadAsyncMock.mockReset()
  vi.mocked(reportError).mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('preloadBattleTextures — the stall has a deadline', () => {
  it('rejects instead of hanging when a texture never settles', async () => {
    loadAsyncMock.mockImplementation(() => neverSettles())

    // Unique URLs per test: the module-level cache is deliberately shared across battles, so a
    // reused URL would be served from cache and never reach the loader at all.
    const pending = preloadBattleTextures(['/never-settles-1.webp'], 1_000)
    const assertion = expect(pending).rejects.toBeInstanceOf(BattleAssetTimeoutError)

    await vi.advanceTimersByTimeAsync(1_000)
    await assertion
  })

  it('reports the timeout so a stall is observable rather than silent', async () => {
    loadAsyncMock.mockImplementation(() => neverSettles())

    const pending = preloadBattleTextures(['/never-settles-2.webp'], 1_000)
    const assertion = expect(pending).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(1_000)
    await assertion

    expect(reportError).toHaveBeenCalledWith(
      'BATTLE_ASSET_LOAD_TIMEOUT',
      'visible',
      expect.any(BattleAssetTimeoutError),
      expect.objectContaining({ timeoutMs: 1_000 }),
    )
  })

  it('does not fire the deadline when every texture arrives in time', async () => {
    loadAsyncMock.mockResolvedValue(fakeTexture())

    await expect(preloadBattleTextures(['/loads-fine-1.webp'], 1_000)).resolves.toBeUndefined()

    // The timer must be cleared on the happy path too; a stray one would reject after the caller
    // already moved on, which surfaces as an unhandled rejection rather than a visible failure.
    await vi.advanceTimersByTimeAsync(5_000)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('still rejects with the underlying load error, not the timeout, when a load fails fast', async () => {
    loadAsyncMock.mockRejectedValue(new Error('404'))

    const pending = preloadBattleTextures(['/broken-1.webp'], 1_000)

    await expect(pending).rejects.not.toBeInstanceOf(BattleAssetTimeoutError)
    expect(reportError).toHaveBeenCalledWith(
      'BATTLE_ASSET_LOAD_FAIL',
      'visible',
      expect.anything(),
      expect.objectContaining({ url: '/broken-1.webp' }),
    )
  })

  it('exposes the deadline as one named constant rather than a literal per call site', () => {
    // The value is a player-experience judgement, not a network measurement, and it is explicitly
    // unvalidated against real devices. Pinning it here means changing it is a deliberate edit.
    expect(BATTLE_TEXTURE_TIMEOUT_MS).toBe(15_000)
  })
})
