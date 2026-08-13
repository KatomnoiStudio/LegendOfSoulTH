# Supabase key rotation — the runbook

**Written 2026-08-13 for HetCreep's decision to revoke every Supabase API key. Executed the same
day.** Main never handled a key value and never applied anything to production; every step that
touched a real key was HetCreep's.

> ## DONE — the client-side rotation is complete
>
> **Legacy `anon` is disabled** (verified `disabled: true` via the Management API at 08:44Z). Every
> build ever published carried that key, and all of them are now inert — which was the entire point
> of the exercise. The client runs on `sb_publishable_…`, redeployed and verified.
>
> **What is left: `service_role`.** It is still enabled. Nothing holds it — see the Edge Function
> finding below — so rotating it is a single uncoordinated step with nothing to break.
>
> The rest of this document is kept as the record of how it was done and what was learned, not as
> instructions still waiting to be followed. Corrections found while executing are marked inline;
> they are the useful part.

---

## What was actually done, in order

| when (UTC)   | step                                                                                                                           | evidence                                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —            | Deleted `los-security-test`, a leftover project from the 2026-08-09 audit                                                      | It held one probe account and 125 transaction rows, was referenced from nowhere in the repo, and had its own live key set that "revoke everything" would not have touched. Deleting beat revoking: revoking leaves a shell you must keep remembering. |
| before 08:31 | Publishable key created (and rotated once mid-flight)                                                                          | Two different `sb_publishable_` values were observed 7 minutes apart, which is how the stale-secret risk below was caught.                                                                                                                            |
| 08:39:33     | GitHub **org** secret `VITE_SUPABASE_ANON_KEY` re-saved with the current value                                                 | Org-level, not repo-level — see the correction below.                                                                                                                                                                                                 |
| 08:40:34     | `Deploy to GitHub Pages` run via `workflow_dispatch` on `c805e93`, `force: true`                                               | Success. `force` was needed because the version had not changed.                                                                                                                                                                                      |
| —            | Verified on the live site: signed in, and the `apikey` header on requests to `supabase.co` starts `sb_publishable_`, not `eyJ` | The header check is the direct proof; a page that merely loads proves nothing.                                                                                                                                                                        |
| ~08:44       | **Legacy `anon` disabled**                                                                                                     | `get_publishable_keys` → `"disabled": true`.                                                                                                                                                                                                          |

---

## Corrections found while executing — the part worth keeping

**1. The GitHub secrets are ORGANIZATION-scoped, not repository-scoped.** The runbook and the first
link handed over both pointed at the repo's secret page, which holds only
`VITE_TURNSTILE_SITE_KEY`. `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_URL` live at
`https://github.com/organizations/KatomnoiStudio/settings/secrets/actions`. Consequence worth
knowing: any other repo in the org using those names gets the new value too, and a repo-level secret
of the same name would silently win over the org one.

**2. Rotating a publishable key twice orphans the saved secret.** The key was rotated after the
GitHub secret had already been saved, so the secret briefly held a dead value. GitHub never lets you
read a secret back, so this cannot be verified — only re-saved. **Re-pasting is the check.** Every
publishable rotation means updating two places: the org secret and every `.env.local`.

**3. `VITE_SUPABASE_URL` cannot be revoked and is not a secret.** It is the project address
(`https://<ref>.supabase.co`), fixed to the project ref, visible in every browser request. It is a
GitHub secret for convenience, not confidentiality. What protects the data is RLS plus the key's
privilege level, never the obscurity of the URL.

**4. `VITE_TURNSTILE_SITE_KEY` is Cloudflare's, is public by design, and must be rotated in
pairs.** The site key is meant to be embedded in the page. Its partner secret lives in Supabase
Dashboard → Authentication → Attack Protection. Rotating one side alone breaks captcha and therefore
sign-in entirely.

**5. Rotating a public key is barely a security action on its own.** The publishable key ships in
the bundle; anyone can read it. What made this rotation mean anything was **disabling the legacy
key** — until that moment, every old build still worked exactly as before.

**6. The Edge Function has never been deployed.** `list_edge_functions` returns an empty list. This
answers two things that had been open for days: the `verify_jwt` blocker below did not need
deciding, and `docs/pvp/P12_VERIFICATION_REPORT.md`'s graduation gate ("until the migration and Edge
Function are deployed") plus `BLUEPRINT-CHECK-HOLD`'s question #21 ("is the production deploy
scheduled, or waiting on a go-ahead?") both resolve to: not deployed, nothing scheduled.

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
| 3   | GitHub Actions CI (`.github/workflows/ci.yml:67-78`)                | **org** secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — corrected; the runbook first said repo-level and that was wrong                                      | Falls back to a placeholder when unset, so CI does not break on a missing secret — it builds against a fake.                       |
| 4   | GitHub Actions deploy (`.github/workflows/deploy.yml:167-168`)      | the same two secrets                                                                                                                                                 | This one **does** need the real value; the built bundle ships it.                                                                  |
| 5   | `.env.local` on each dev machine                                    | the same two                                                                                                                                                         | Not in git. Each machine updates its own.                                                                                          |

Integration tests (`starAscension`, `progressionCostAuthority`, `profileUid`, `gachaAuthority`)
run against PGlite, not against the hosted project — they need no key.

---

## The blocker that turned out not to be one

> **Resolved 2026-08-13 by measurement, not by choosing.** `list_edge_functions` returns an empty
> list — `pvp-authority` exists in this repository but has never been deployed. There is no running
> function to migrate, so nothing had to be decided to finish the rotation.
>
> The decision still has to be made **at deploy time**, and it is cheaper then than it looked here:
> with nothing already running, option B (`--no-verify-jwt` plus the function's own `auth.getUser`
> check) can be taken without a migration. The analysis below is kept for that day.

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

> Steps 1-7 ran on 2026-08-13 and are done for the **`anon` side**. What remains is `service_role`:
> create an `sb_secret_` key and disable the legacy one. Because nothing is deployed that holds it,
> that is a single step with no coordination and nothing to break — the sequence below exists for
> the general case, not for this remaining piece.

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

> On the day, the ones that ran were: signed in on the deployed build, and confirmed the `apikey`
> header on requests to `supabase.co` starts `sb_publishable_` rather than `eyJ`. **The PvP line
> below was not run and could not be** — the Edge Function is not deployed. Said plainly rather
> than ticked, since it is the item most likely to be assumed.

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

## What main did and did not do

Main did not generate a key, did not enter one anywhere, did not disable or delete anything, and
did not apply a migration. Every action with a consequence — creating keys, editing secrets,
running the deploy, disabling the legacy key, deleting the stale project — was HetCreep's.

**Amended from the original wording**, which claimed no key-returning tool was called. It was:
`get_publishable_keys` ran three times, to read the enable/disable state that the whole rotation
turns on. That tool returns **publishable** keys only — values that ship in the browser bundle and
are public by design — and the values were never echoed into chat or written to a file. No tool
exists that returns a secret key, and none was sought.

The original sentence was written before the tool was needed and was left standing as though it
still described what happened. Corrected here rather than deleted, because "the record said one
thing and the session did another" is the exact failure this project keeps finding elsewhere.
