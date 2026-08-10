import { describe, expect, it, vi } from 'vitest'
import { createResilientFetch } from './supabaseClient'

/*
  2026-08-10 audit F5 — no timeout and no retry on any Supabase call.

  `createClient` was built bare, so every request rode the browser's own fetch, which has NO
  default timeout at all. A request that hangs never rejects: the player sits on the battle
  result panel with no spinner, no message and no way to retry, forever. These pin the wrapper
  that closes it — a deadline plus exactly ONE retry, and only for failures where the server has
  not answered yet (network/timeout/5xx). A 4xx is a real answer; retrying it changes nothing.

  Retrying at all is only safe because the reward RPCs are idempotent on refId
  (0013_reward_idempotency.sql) — a replayed call returns the first result instead of granting
  twice.
*/

function response(status: number): Response {
  return new Response(null, { status })
}

describe('createResilientFetch', () => {
  it('passes a successful response straight through, one call only', async () => {
    const base = vi.fn(async () => response(200))
    const resilient = createResilientFetch(base as unknown as typeof fetch)

    const result = await resilient('https://example.test/rest/v1/profiles')

    expect(result.status).toBe(200)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('retries a 5xx exactly once, then returns the second answer', async () => {
    const base = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200))
    const resilient = createResilientFetch(base as unknown as typeof fetch)

    const result = await resilient('https://example.test/rest/v1/profiles')

    expect(base).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(200)
  })

  it('gives up after the single retry — a 5xx twice is returned, not looped on', async () => {
    const base = vi.fn(async () => response(500))
    const resilient = createResilientFetch(base as unknown as typeof fetch)

    const result = await resilient('https://example.test/rest/v1/profiles')

    expect(base).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(500)
  })

  it('never retries a 4xx — that is the server answering, not failing', async () => {
    const base = vi.fn(async () => response(409))
    const resilient = createResilientFetch(base as unknown as typeof fetch)

    const result = await resilient('https://example.test/rest/v1/profiles')

    expect(base).toHaveBeenCalledTimes(1)
    expect(result.status).toBe(409)
  })

  it('retries a network error once, then rethrows if it fails again', async () => {
    const base = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const resilient = createResilientFetch(base as unknown as typeof fetch)

    await expect(resilient('https://example.test/rest/v1/profiles')).rejects.toThrow(
      'Failed to fetch',
    )
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('aborts a hung request at the deadline instead of hanging forever', async () => {
    // A request that never settles on its own — only the injected deadline can end it.
    const base = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason ?? new Error('aborted'))
          })
        }),
    )
    const resilient = createResilientFetch(base as unknown as typeof fetch, 10)

    await expect(resilient('https://example.test/rest/v1/profiles')).rejects.toThrow()
    // The deadline counts as a network-class failure, so it gets the one retry too.
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('does not retry when the CALLER aborted — that is an intentional cancel', async () => {
    const controller = new AbortController()
    const base = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        }),
    )
    const resilient = createResilientFetch(base as unknown as typeof fetch)

    const pending = resilient('https://example.test/rest/v1/profiles', {
      signal: controller.signal,
    })
    controller.abort()

    await expect(pending).rejects.toThrow()
    expect(base).toHaveBeenCalledTimes(1)
  })
})
