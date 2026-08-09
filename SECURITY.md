# Security Policy

Legend of Soul-TH is a small hobby game (React + Vite, deployed to GitHub Pages) with a real
backend: **Supabase (Auth + Postgres + Row Level Security)**, live since 2026-08-07. All account,
currency, character, Star/Shard, admin-status, and World Chat data lives server-side, RLS-protected;
the client never mutates valuable state directly. Read
[`src/data/accountRepository.supabase.ts`](src/data/accountRepository.supabase.ts)
and [`supabase/migrations/`](supabase/migrations/) for exactly what's enforced where before filing
a report. The older client-only `accountRepository.ts`/`password.ts` (localStorage + local PBKDF2)
is **dormant, kept only for the shared validators it re-exports** — `useAuth.ts` no longer imports
its own login/register/session logic. Still-real limitations are documented in **Out of Scope** below.

## Reporting a Vulnerability

This project follows a coordinated (responsible) disclosure policy: report a suspected
vulnerability privately first, give the maintainer a reasonable window to investigate and ship a
fix before any public disclosure, and avoid actions that could harm real players (their accounts,
currency, or data) while testing.

Use GitHub private vulnerability reporting — it goes straight to the maintainer, not a public issue:

- https://github.com/KatomnoiStudio/LegendOfSoulTH/security/advisories/new

**Do not** open a public GitHub issue for a security report.

Include:

- affected file/commit and the URL or build you tested (production `https://katomnoistudio.github.io/LegendOfSoulTH/` vs. a local dev build)
- steps to reproduce from a clean browser profile
- what trust boundary is actually crossed (see Scope below — RLS policies and RPC functions are the real ones now, not "does the client trust itself")
- any logs/screenshots with tokens, emails, or other real data redacted

Expected response:

- **Acknowledgment:** within 7 days (solo-maintained project, best-effort)
- **Fix or mitigation:** no fixed SLA — triaged by actual impact once acknowledged

## Scope

In scope:

- the `KatomnoiStudio/LegendOfSoulTH` repository and its GitHub Actions workflows (`.github/workflows/`)
- the deployed site at `https://katomnoistudio.github.io/LegendOfSoulTH/`
- anything that lets one player's browser affect **another** player's account/data, or that
  exfiltrates data the app didn't already hand to the page itself (real XSS, real CSRF-equivalent,
  supply-chain compromise of a dependency actually shipped in the built bundle)
- any way to bypass a Supabase Row Level Security policy or trigger a `SECURITY DEFINER` RPC
  function (`supabase/migrations/*.sql`) into doing something its own checks should have rejected
  (self-granting currency/characters/admin status, reading another player's row, etc.)
- World Chat identity/authority bypasses: posting as another profile, forging the server timestamp,
  bypassing the 10-message/minute throttle, or writing directly to `world_chat_messages`
- Star Ascension authority bypasses: inserting an owned Hero directly, writing `star`/`shards`,
  reusing an idempotency request for another Hero, or bypassing the 1/2/4/8/12 shard ladder
- Gacha authority bypasses: controlling a roll from the client, changing a banner/cost after a
  request ID is committed, spending Gem twice on retry, bypassing pity, or directly writing
  `gacha_pity`, pull history, owned Heroes, or duplicate shards
- Private PvP authority bypasses: joining a room without being one of its two participants,
  sending input as the other player, publishing a forged authoritative snapshot/result, reading
  another room's private Realtime topic, reviving a participant after reconnect grace, replaying an
  older state version, or bypassing the compare-and-swap state version
- session-token exposure: anything that puts a user's `access_token`/`refresh_token` somewhere it
  outlives the tab — a URL the browser records in history, a log, an error report, a referrer. Auth
  uses the PKCE flow (`flowType: 'pkce'`, `src/lib/supabaseClient.ts`) specifically so the callback
  carries a one-time `?code=` instead of a JWT fragment; a change that reverts to the implicit flow,
  or an OAuth `redirectTo` that does not land on the app itself, reopens this and is in scope

## Out of Scope

By design, not bugs — don't file these:

- **"I can see/edit values in my own browser's React state or a stale localStorage cache."**
  Expected and low-risk: the server (Supabase, RLS-enforced) is the real source of truth for
  currency/characters/admin-status; any client-side tampering is cosmetic and gets overwritten
  on the next server round-trip. **Do** file a report if you find a way to make a _write_ (an
  RPC call, a direct table mutation) actually persist a value the server should have rejected —
  that crosses a real trust boundary. (This project already fixed real cases of this shape:
  `grant_character` didn't check admin status before 2026-08-07 — see `supabase/migrations/0004_admin_accounts.sql`'s
  own comment for what that looked like and how it was closed. On 2026-08-08, `earn_gold`/`grant_item`
  accepted unbounded client-supplied amounts and `profiles.gold`/`gem` had no column-write protection
  beyond RLS (which is row-scoped, not column-scoped) — see `supabase/migrations/0009_economy_integrity_fixes.sql`.
  Lobby battle rewards use refId-guarded RPCs and a durable pending snapshot table — see
  `supabase/migrations/0013_reward_idempotency.sql`. Star Ascension uses an authenticated,
  atomic, idempotent RPC and a private-write audit ledger — see
  `supabase/migrations/20260808204905_p9_star_ascension_server_authority.sql`. Report the same
  _class_ of bug elsewhere.)
- **"I changed Star/Shard values in React state or called the preview calculator."** The preview
  is presentation-only. Report it only if the change persists in Supabase without a valid
  `ascend_character_star` transaction.
- **"I changed the displayed Gacha result, pity, or Gem balance in React state."** The display is
  not authoritative. Report it only if a roll persists without `perform_gacha_pull`, if retrying
  the same request debits twice, or if a direct table write succeeds.
- **"I can locally hide/show a World Chat author by editing my block list."** `/block` is a
  client-local viewing preference by design. Chat rows themselves remain server-authoritative.
- **"I changed my local PvP position/HP or predicted a different result."** PvP prediction is
  presentation-only. The JWT-protected `pvp-authority` Edge Function injects the authenticated
  player identity, advances fixed-tick combat, and is the only caller allowed to commit state or
  results. Postgres broadcasts those committed snapshots to a participant-only private Realtime
  topic; authenticated clients have receive permission but no Broadcast INSERT policy. It reads
  hosted Supabase keys from the platform's plural JSON key sets (`SUPABASE_PUBLISHABLE_KEYS` and
  `SUPABASE_SECRET_KEYS`) with legacy project-secret fallbacks; no secret enters the browser bundle.
  A heartbeat timeout and monotonic snapshot version gate make reconnect/prediction disposable.
  Completed results live in a detached audit table while expired unfinished rooms are reaped.
  Report a change only if it persists as authority state or becomes visible in a room you do not
  belong to.
- **Matchmaking, Rank/MMR, PvP rewards, and public PvP lobbies.** These are intentionally excluded
  from P12 and therefore do not yet define a production trust boundary.
- **"Passwords are hashed client-side with no real server auth."** No longer applies to the live
  app — auth is Supabase Auth (server-side), not the old local PBKDF2 layer in
  [`src/lib/password.ts`](src/lib/password.ts) (dormant, kept only as a shared validator source).
- **"CurrencyShopModal payments (gold or gems) aren't real / always succeed."** Still intentional —
  no payment gateway is wired up yet (see `accountRepository.supabase.ts` `topUpGold`/`topUpGems`).
  Not a payment-bypass vulnerability; there is no real payment to bypass.
- Vulnerabilities in a dependency that this project doesn't actually reach at runtime
  (see `npm audit` in CI first — if it's already flagged/tracked there, no need to duplicate).

## Auth Abuse Protection

- **Anonymous (guest) sign-in rate limit**: Supabase's `rate_limit_anonymous_users` config,
  confirmed at its default 30/hour (per project, not per-IP) — no code change needed, already
  active. Combined with the 30-day stale-guest cleanup job
  (`supabase/migrations/0006_guest_cleanup.sql`), bounds how much guest-account farming can
  accumulate before it's auto-reaped.
- **CAPTCHA (Cloudflare Turnstile)**: client-side widget shipped (`AuthModal.tsx`, `VITE_TURNSTILE_SITE_KEY`).
  Supabase's Dashboard toggle (Authentication → Settings → Attack Protection) is project-wide
  across all `signUp`/`signInWithPassword`/`signInAnonymously` calls, not scoped per method —
  currently disabled server-side pending a live-browser verification pass; re-enable once that's
  confirmed working end-to-end.

## Supply-Chain / CI

- Third-party GitHub Actions are pinned to full commit SHAs, not floating version tags
  (see any `.github/workflows/*.yml`).
- Secret scanning: [`gitleaks`](.github/workflows/security-scan.yml) runs on every push/PR and
  daily via the free CLI directly (not the paid Action, which requires a license for org repos).
- Dependency vulnerabilities: `npm audit --audit-level=high` runs daily and on every push.
- GitHub Dependabot alerts and security updates are enabled on this repo.
