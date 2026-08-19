import {
  createMatchSeed,
  handlePvPAuthorityRequest,
  isRequestBody,
  minimalPlayer,
  serveWithFailsafe,
} from './index.ts'

/**
 * 379 lines of PvP server authority sat behind 22 lines of test — two cases, both stopping at
 * the method gate. The CI wiring for `test:edge` was fixed earlier; the tests behind it had
 * not caught up, so a green check overstated what was verified (audit item B11, 2026-08-16).
 *
 * What is testable without secrets: the method/auth gates, and the three pure helpers. The
 * request path past auth needs a live Supabase project and is deliberately still not covered
 * here — an integration concern, not a unit one.
 */

const URL = 'https://example.test/functions/v1/pvp-authority'

// ---------- gates that run before any secret is read ----------

Deno.test('pvp-authority answers CORS preflight without credentials', async () => {
  const response = await handlePvPAuthorityRequest(new Request(URL, { method: 'OPTIONS' }))

  if (response.status !== 200) throw new Error(`expected 200, received ${response.status}`)
  if (response.headers.get('Access-Control-Allow-Methods') !== 'POST, OPTIONS') {
    throw new Error('missing POST/OPTIONS CORS contract')
  }
})

Deno.test('pvp-authority rejects unsupported methods before touching secrets', async () => {
  const response = await handlePvPAuthorityRequest(new Request(URL, { method: 'GET' }))
  const payload = (await response.json()) as { error?: string }

  if (response.status !== 405) throw new Error(`expected 405, received ${response.status}`)
  if (payload.error !== 'METHOD_NOT_ALLOWED') throw new Error('wrong method error contract')
})

Deno.test('pvp-authority refuses a POST carrying no bearer token', async () => {
  // The auth gate sits above the env read, so this asserts an unauthenticated caller cannot
  // even reach the branch that would report which secrets are missing.
  const response = await handlePvPAuthorityRequest(new Request(URL, { method: 'POST' }))
  const payload = (await response.json()) as { error?: string }

  if (response.status !== 401) throw new Error(`expected 401, received ${response.status}`)
  if (payload.error !== 'AUTH_REQUIRED') throw new Error('wrong auth error contract')
})

Deno.test('pvp-authority refuses a malformed Authorization header before reading env', async () => {
  /*
    This test found a real gap and the source was fixed rather than the assertion relaxed.
    The old guard used `replace(/^Bearer\s+/i, '')` and returned the untouched string when the
    pattern did not match — so `Authorization: Bearer` with no token (the Fetch spec strips
    the trailing space, leaving no whitespace for `\s+` to match) and any non-Bearer scheme
    both sailed past the gate and reached the env read. Neither is exploitable — Supabase
    rejects them at getUser — but both broke this file's own stated contract that a request
    without credentials is refused before secrets are touched.

    Running this without --allow-env is what makes it an assertion rather than a hope: if the
    guard lets one through, Deno raises NotCapable on `Deno.env.get` and the test fails.
  */
  for (const header of ['Bearer', 'Bearer   ', 'Basic abc123', 'abc123', '']) {
    const response = await handlePvPAuthorityRequest(
      new Request(URL, { method: 'POST', headers: { Authorization: header } }),
    )
    const payload = (await response.json()) as { error?: string }

    if (response.status !== 401) {
      throw new Error(`"${header}" got ${response.status}, expected 401`)
    }
    if (payload.error !== 'AUTH_REQUIRED') {
      throw new Error(`"${header}" must not pass the auth gate`)
    }
  }
})

// ---------- isRequestBody: the validation gate on an untrusted body ----------
//
// Driven from the side that REFUSES, per .agents/rules/mutation-verified-fix-law.md. This is
// the only thing standing between a client-shaped payload and the room state machine.

Deno.test('isRequestBody refuses anything that is not an object with a string roomId', () => {
  const rejected: unknown[] = [
    null,
    undefined,
    'room-1',
    42,
    [],
    {},
    { roomId: 1, action: 'disconnect' },
    { action: 'disconnect' },
  ]
  for (const value of rejected) {
    if (isRequestBody(value)) throw new Error(`accepted a bad body: ${JSON.stringify(value)}`)
  }
})

Deno.test('isRequestBody refuses an unknown action', () => {
  if (isRequestBody({ roomId: 'r', action: 'delete-everything' })) {
    throw new Error('accepted an action outside the three the server implements')
  }
  if (isRequestBody({ roomId: 'r' })) throw new Error('accepted a body with no action at all')
})

Deno.test('isRequestBody refuses an input command with non-integer counters', () => {
  const base = { roomId: 'r', action: 'input', input: {} }
  const rejected: unknown[] = [
    { ...base, sequence: 1.5, clientTick: 1 },
    { ...base, sequence: 1, clientTick: 1.5 },
    { ...base, sequence: Number.NaN, clientTick: 1 },
    { ...base, sequence: Number.MAX_SAFE_INTEGER + 2, clientTick: 1 },
    { ...base, sequence: '1', clientTick: 1 },
    { ...base, sequence: 1, clientTick: 1, input: null },
    { ...base, sequence: 1, clientTick: 1, input: 'up' },
  ]
  for (const value of rejected) {
    if (isRequestBody(value)) throw new Error(`accepted a bad input: ${JSON.stringify(value)}`)
  }
})

Deno.test('isRequestBody accepts the three shapes the server implements', () => {
  // Control: without this the refusal tests would pass if the guard rejected everything.
  const accepted: unknown[] = [
    { roomId: 'r', action: 'disconnect' },
    { roomId: 'r', action: 'reconnect' },
    { roomId: 'r', action: 'input', sequence: 0, clientTick: 0, input: {} },
  ]
  for (const value of accepted) {
    if (!isRequestBody(value)) throw new Error(`refused a valid body: ${JSON.stringify(value)}`)
  }
})

// ---------- createMatchSeed ----------

Deno.test('createMatchSeed never returns 0', () => {
  // 0 is remapped to 1 because the seeded RNG downstream treats 0 as "unseeded"; a 1-in-2^32
  // draw is not something a test can wait for, so the remap is asserted directly instead.
  for (let i = 0; i < 200; i++) {
    const seed = createMatchSeed()
    if (seed === 0) throw new Error('seed 0 escaped the remap')
    if (!Number.isSafeInteger(seed) || seed < 0) throw new Error(`seed out of range: ${seed}`)
  }
})

// ---------- minimalPlayer ----------

const heroRow = {
  character_id: 'monkey-king',
  level: 7,
  exp: 120,
  exp_to_next: 400,
  obtained_at: '2026-01-01T00:00:00.000Z',
}

Deno.test('minimalPlayer carries the hero row through and seats it in slot 1', () => {
  const player = minimalPlayer('profile-1', heroRow)
  const hero = player.ownedCharacters[0]

  if (player.id !== 'profile-1' || player.uid !== 'profile-1') throw new Error('profile id lost')
  if (hero?.characterId !== 'monkey-king') throw new Error('character id lost')
  if (hero?.level !== 7 || hero?.exp !== 120 || hero?.expToNext !== 400) {
    throw new Error('progression fields lost in translation')
  }
  if (player.teamSlots[0] !== 'monkey-king') throw new Error('hero not seated in slot 1')
  if (player.teamSlots.slice(1).some((slot) => slot !== null)) {
    throw new Error('slots 2-4 must be empty for a ranked minimal player')
  }
})

Deno.test('minimalPlayer defaults star, shards and skill levels when the row omits them', () => {
  const hero = minimalPlayer('p', heroRow).ownedCharacters[0]

  if (hero?.star !== 1) throw new Error(`star should default to 1, got ${hero?.star}`)
  if (hero?.shards !== 0) throw new Error(`shards should default to 0, got ${hero?.shards}`)
  for (const key of ['skill1', 'skill2', 'skill3', 'ultimate'] as const) {
    if (hero?.skillLevels?.[key]?.level !== 1) throw new Error(`${key} did not default to level 1`)
  }
})

Deno.test('minimalPlayer keeps an explicit null star/shards from becoming null downstream', () => {
  // The row type allows null, and `?? 1` / `?? 0` is what stops a null reaching combat math.
  const hero = minimalPlayer('p', { ...heroRow, star: null, shards: null }).ownedCharacters[0]

  if (hero?.star !== 1) throw new Error('null star must fall back to 1')
  if (hero?.shards !== 0) throw new Error('null shards must fall back to 0')
})

Deno.test('minimalPlayer grants no currency — a ranked player brings nothing to spend', () => {
  const player = minimalPlayer('p', heroRow)

  if (player.currency.gold !== 0 || player.currency.gem !== 0) {
    throw new Error('a ranked minimal player must start with zero currency')
  }
  if (player.inventory.length !== 0) throw new Error('a ranked minimal player carries no items')
})

/*
  ── 2026-08-19 gold-standard audit, rank 8 — the failure mode with no CORS and no log ──

  `Deno.serve(handlePvPAuthorityRequest)` mounted the handler bare. Every ANTICIPATED failure
  returns through `json()`, which attaches corsHeaders, and logs through `logFailure`. An
  UNANTICIPATED throw did neither: Deno's own 500 carries no CORS headers, so the browser sees
  an opaque network error rather than a status — indistinguishable from the connection
  dropping — and not one line reached the log.

  Passing a non-Request makes the handler throw on its first property access, which is the
  cheapest deterministic way to reach the branch. Pre-fix this test cannot even resolve its
  import: `serveWithFailsafe` did not exist, because nothing stood between Deno and the
  handler.
*/
Deno.test('an unhandled throw answers with a code instead of an opaque network error', async () => {
  const response = await serveWithFailsafe(null as unknown as Request)

  if (response.status !== 500) throw new Error(`expected 500, received ${response.status}`)

  const body = (await response.json()) as { error?: string }
  if (body.error !== 'PVP_UNHANDLED') {
    throw new Error(`expected PVP_UNHANDLED, received ${JSON.stringify(body)}`)
  }
})

Deno.test(
  'an unhandled throw keeps the CORS headers the browser needs to read the status',
  async () => {
    const response = await serveWithFailsafe(null as unknown as Request)

    // This is the whole point of the wrapper. Without it the browser cannot read the 500 at all.
    if (!response.headers.get('Access-Control-Allow-Origin')) {
      throw new Error('unhandled-throw response carries no CORS headers — the browser sees nothing')
    }
    if (response.headers.get('Content-Type') !== 'application/json') {
      throw new Error('unhandled-throw response is not JSON like every other failure branch')
    }
  },
)

Deno.test('the failsafe wrapper does not alter a well-formed request', async () => {
  const direct = await handlePvPAuthorityRequest(new Request(URL, { method: 'OPTIONS' }))
  const wrapped = await serveWithFailsafe(new Request(URL, { method: 'OPTIONS' }))

  if (direct.status !== wrapped.status) {
    throw new Error(`wrapper changed the status: ${direct.status} vs ${wrapped.status}`)
  }
})
