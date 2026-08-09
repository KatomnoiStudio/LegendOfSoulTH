import { handlePvPAuthorityRequest } from './index.ts'

Deno.test('pvp-authority answers CORS preflight without credentials', async () => {
  const response = await handlePvPAuthorityRequest(
    new Request('https://example.test/functions/v1/pvp-authority', { method: 'OPTIONS' }),
  )

  if (response.status !== 200) throw new Error(`expected 200, received ${response.status}`)
  if (response.headers.get('Access-Control-Allow-Methods') !== 'POST, OPTIONS') {
    throw new Error('missing POST/OPTIONS CORS contract')
  }
})

Deno.test('pvp-authority rejects unsupported methods before touching secrets', async () => {
  const response = await handlePvPAuthorityRequest(
    new Request('https://example.test/functions/v1/pvp-authority', { method: 'GET' }),
  )
  const payload = (await response.json()) as { error?: string }

  if (response.status !== 405) throw new Error(`expected 405, received ${response.status}`)
  if (payload.error !== 'METHOD_NOT_ALLOWED') throw new Error('wrong method error contract')
})
