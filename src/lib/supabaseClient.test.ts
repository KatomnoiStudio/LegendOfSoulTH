import { describe, expect, it, vi } from 'vitest'
import { createDeadlineFetch } from './supabaseClient'

/*
  2026-08-10 audit F5 — Supabase calls had no deadline.

  `createClient` was built bare, so every request rode the browser's own fetch, which has NO
  default timeout at all. A request that hangs never rejects: the player sits on the battle
  result panel with no spinner, no message and no way to retry, forever.

  ── and the QC finding on the first fix (MEMORY item 189) ────────────────────────────────
  That first version ALSO retried once on network errors and 5xx, not knowing supabase-js
  already retries underneath it. Measured in node_modules:
    postgrest-js  DEFAULT_MAX_RETRIES = 3, retryEnabled defaults true, backoff 1s/2s/4s,
                  and it retries ONLY GET/HEAD/OPTIONS (RETRYABLE_METHODS) precisely because
                  replaying a POST/PATCH can write twice
    auth-js       _refreshAccessToken retries with its own exponential backoff
  Stacked, one failing GET became 4 postgrest attempts x 2 of ours = 8 requests and
  4x(15s x 2) + 7s backoff ~= 127s, from a wrapper whose contract said "15 seconds". Worse, our
  retry covered every method, so a `savePlayer` PATCH — which has no refId to dedupe on — could
  be replayed where the library would never have replayed it.

  So the retry is gone and only the deadline (the real gap) remains. The last test in this file
  is the guard: it fails the moment anyone adds a retry back in.
*/

function response(status: number): Response {
  return new Response(null, { status })
}

/** A request that never settles on its own — only an abort signal can end it. */
function hangingFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason ?? new Error('aborted'))
        })
      }),
  )
}

describe('createDeadlineFetch', () => {
  it('passes a successful response straight through', async () => {
    const base = vi.fn(async () => response(200))
    const deadline = createDeadlineFetch(base as unknown as typeof fetch)

    const result = await deadline('https://example.test/rest/v1/profiles')

    expect(result.status).toBe(200)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('aborts a hung request at the deadline instead of hanging forever', async () => {
    const base = hangingFetch()
    const deadline = createDeadlineFetch(base as unknown as typeof fetch, 10)

    await expect(deadline('https://example.test/rest/v1/profiles')).rejects.toThrow()
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('leaves the caller their own cancel — both signals abort the request', async () => {
    const controller = new AbortController()
    const base = hangingFetch()
    const deadline = createDeadlineFetch(base as unknown as typeof fetch)

    const pending = deadline('https://example.test/rest/v1/profiles', {
      signal: controller.signal,
    })
    controller.abort()

    await expect(pending).rejects.toThrow()
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('forwards the rest of init untouched', async () => {
    const seen: RequestInit[] = []
    const base = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(init ?? {})
      return response(200)
    })
    const deadline = createDeadlineFetch(base as unknown as typeof fetch)

    await deadline('https://example.test/rest/v1/rpc/earn_gold', {
      method: 'POST',
      body: '{"p_amount":50}',
      headers: { apikey: 'anon' },
    })

    const init = seen[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"p_amount":50}')
    expect(init.headers).toEqual({ apikey: 'anon' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  /*
    THE GUARD. supabase-js retries underneath this wrapper; a retry here multiplies its attempt
    count and its worst-case latency, and does it for methods the library deliberately refuses to
    replay. One request in must always be exactly one request out.
  */
  it.each([
    ['a 5xx', 500],
    ['a 503 the library itself would retry', 503],
    ['a 4xx', 409],
    ['a success', 200],
  ])('never retries — %s produces exactly one request', async (_label, status) => {
    const base = vi.fn(async () => response(status))
    const deadline = createDeadlineFetch(base as unknown as typeof fetch)

    const result = await deadline('https://example.test/rest/v1/profiles')

    expect(result.status).toBe(status)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('never retries a network error either — it rethrows on the first failure', async () => {
    const base = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const deadline = createDeadlineFetch(base as unknown as typeof fetch)

    await expect(deadline('https://example.test/rest/v1/profiles')).rejects.toThrow(
      'Failed to fetch',
    )
    expect(base).toHaveBeenCalledTimes(1)
  })
})
