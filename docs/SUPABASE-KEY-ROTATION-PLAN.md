# Supabase key rotation — the runbook

**Written 2026-08-13 for HetCreep's decision to revoke every Supabase API key.** This is the
preparation, not the execution: main never handles a key value, and never applies anything to
production. Every step that touches a real key is HetCreep's.

> **The one thing that must not happen: do not revoke first.**
>
> Legacy `anon`/`service_role` and the new `sb_publishable_`/`sb_secret_` keys **work side by
> side** — Supabase's own guidance is that creating new keys "adds them _alongside_ your existing
> `anon` and `service_role` keys without affecting them". So there is a zero-downtime order, and
> it runs the other way round from the instinct: **create → migrate every consumer → verify →
> only then disable the old ones.** Revoking first takes down sign-in, the whole game client, CI,
> and the PvP Edge Function at the same moment, with no partial state to debug from.

---

## What actually consumes a key

Measured, not assumed — every site found by grep across `src/`, `supabase/`, `tools/`, `.github/`.

| #   | consumer                                                            | reads                                                                                                                                                                | notes                                                                                                                              |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Browser client (`src/lib/supabaseClient.ts:80-81`)                  | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                                                                                                        | Passes the string straight into `createClient` with **no format validation**, so a publishable key drops in without a code change. |
| 2   | Edge Function (`supabase/functions/pvp-authority/index.ts:174-178`) | `SUPABASE_URL`, then `SUPABASE_PUBLISHABLE_KEYS` **falling back to** `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEYS` **falling back to** `SUPABASE_SERVICE_ROLE_KEY` | **Already dual-key aware.** `readDefaultKeySet` parses the JSON key-set env and takes `.default`. This side is ready.              |
| 3   | GitHub Actions CI (`.github/workflows/ci.yml:67-78`)                | repo secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                                                                                           | Falls back to a placeholder when unset, so CI does not break on a missing secret — it builds against a fake.                       |
| 4   | GitHub Actions deploy (`.github/workflows/deploy.yml:167-168`)      | the same two secrets                                                                                                                                                 | This one **does** need the real value; the built bundle ships it.                                                                  |
| 5   | `.env.local` on each dev machine                                    | the same two                                                                                                                                                         | Not in git. Each machine updates its own.                                                                                          |

Integration tests (`starAscension`, `progressionCostAuthority`, `profileUid`, `gachaAuthority`)
run against PGlite, not against the hosted project — they need no key.

---

## The blocker to decide before starting

**Edge Function JWT verification does not work with the new key types.** Supabase's API-keys guide
states it plainly: _"Edge Functions only support JWT verification via the `anon` and `service_role`
JWT-based API keys. You will need to use the `--no-verify-jwt` option when using publishable and
secret keys."_

This project runs `verify_jwt = true` for `pvp-authority` (`supabase/config.toml:2`).

Two distinct things are easy to conflate here, so be precise:

- **The platform gate** (`verify_jwt`) — Supabase checks the request carries a valid JWT before the
  function even runs. This is the part the new key types break.
- **The function's own check** (`index.ts:170`, `:193`) — it reads the `Authorization` header itself
  and calls `auth.getUser(jwt)` to resolve the caller. **This is unaffected.** It validates a
  _user session_ token, which Supabase Auth keeps issuing regardless of which API-key generation
  the project uses.

So the function does not lose its identity check if the platform gate is turned off — it keeps the
one that decides _which player_ is calling. What is lost is the outer filter that rejects
unauthenticated requests before they reach the code, which means unauthenticated traffic starts
arriving at the function and being rejected by its own guard instead. That is a real change in
exposure and cost, and it is a decision, not a detail.

**Options, owner's call:**

- **A — keep legacy keys for the Edge Function only.** Migrate the browser client to a publishable
  key, leave `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` set for the function, keep
  `verify_jwt = true`. Revokes the key that is exposed in the shipped bundle, which is the one worth
  rotating, and changes nothing about the server's trust boundary.
- **B — go fully new-key.** Set `verify_jwt = false`, redeploy with `--no-verify-jwt`, and rely on
  the function's own `auth.getUser` check. Cleanest key story, but the function starts seeing
  unauthenticated requests.
- **C — verify first.** Before deciding, re-check whether the `--no-verify-jwt` requirement still
  holds — it is exactly the kind of platform limitation that gets fixed. This document's citation is
  from 2026-08-13.

---

## Order of operations

Steps marked **[HetCreep]** involve a real key or a production change and are not main's to run.

1. **[HetCreep]** In Dashboard → Settings → API Keys, create a publishable key and (if going with
   option B) a secret key. Do **not** disable anything yet. Both generations are now live.
2. **[HetCreep]** Update `.env.local` on each dev machine to the new publishable key. Run the app,
   sign in, and confirm a real session — this is the first proof the new key works end to end.
3. **[HetCreep]** Update the GitHub repo secrets `VITE_SUPABASE_ANON_KEY` (and `VITE_SUPABASE_URL`
   if the project changed). The name stays as-is; only the value changes. Renaming the secret would
   mean editing two workflows for no benefit, and a rename is a second failure mode during a
   rotation.
4. **[HetCreep]** Update the Edge Function's environment: set `SUPABASE_PUBLISHABLE_KEYS` /
   `SUPABASE_SECRET_KEYS` as JSON with a `default` field, matching what `readDefaultKeySet` parses.
   The fallback to the legacy names stays in place, so this is additive and reversible.
5. **[HetCreep]** Redeploy the Edge Function. Under option B this is where `--no-verify-jwt` and the
   `config.toml` change land.
6. **Verify before revoking** — the checklist below.
7. **[HetCreep]** Only once every item verifies: disable the legacy `anon` and `service_role` keys.
8. Watch for a day. The failure mode of a missed consumer is a 401 from something nobody was
   watching, not a crash.

---

## Verification checklist — run before step 7

Nothing here needs a key value in the clear; each is a behaviour check.

- [ ] Sign in with email/password on a deployed build.
- [ ] Sign in with Google, and sign in as guest — both use the same client, but both were also the
      paths that silently broke in the UID defect, so neither is assumed.
- [ ] Load the lobby and confirm the player profile renders (a `profiles` read through RLS).
- [ ] Complete one battle and confirm gold and EXP persist across a reload (an authenticated write).
- [ ] Open a PvP private room from two signed-in clients and complete a round — this is the only
      check that exercises the Edge Function, and it is the one most likely to be skipped.
- [ ] Confirm the deploy workflow's built bundle carries the new key: run the deploy and load the
      published page, rather than trusting that the secret was updated.
- [ ] Grep the shipped bundle for the **old** key prefix to prove it is gone. The old anon key is a
      JWT, so `eyJ` in `dist/` is the marker.

---

## After the rotation

- The old `anon` key was embedded in every build ever published. Revoking it is what makes those
  builds inert, and that is the point of the exercise — but it also means **any user still running
  a cached old bundle will start failing**. If the game is live, expect that; a hard reload fixes it.
- `@supabase/supabase-js` is pinned in **three** places that must not drift apart:
  `package.json:35`, `supabase/functions/pvp-authority/index.ts:1` (the `npm:` specifier), and
  `supabase/functions/pvp-authority/deno.lock`. All three are `2.112.2` today. If the rotation ends
  up needing a version bump, all three move together or the Edge Function runs a different client
  than the app.
- Update `.env.local.example` so the next clone is told to use a publishable key, not an anon key.
- If option B is taken, `supabase/config.toml:2` is the record of that decision and should say why
  in a comment, not just flip to `false`.

---

## What main did not do, deliberately

Main did not read, request, generate, or write any key value, and did not touch the hosted project.
The Supabase MCP tools available in this session include one that returns publishable keys; it was
not called, because the plan does not need a key value to be correct and the owner is going to
rotate them anyway.
