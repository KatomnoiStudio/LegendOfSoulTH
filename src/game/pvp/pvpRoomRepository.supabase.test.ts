import { FunctionsHttpError } from '@supabase/supabase-js'
import { describe, expect, test } from 'vitest'
import { authorityErrorMessage } from './pvpAuthorityError'

describe('PvP authority repository errors', () => {
  test('preserves the structured Edge Function error code for actionable client reporting', async () => {
    const error = new FunctionsHttpError(
      new Response(JSON.stringify({ error: 'PVP_STATE_BUSY' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(authorityErrorMessage(error)).resolves.toBe('PVP_STATE_BUSY')
  })

  test('falls back safely when the Edge response is not JSON', async () => {
    const error = new FunctionsHttpError(new Response('gateway failure', { status: 502 }))

    await expect(authorityErrorMessage(error)).resolves.toBe(
      'Edge Function returned a non-2xx status code',
    )
  })
})
