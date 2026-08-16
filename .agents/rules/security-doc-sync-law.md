<!-- coalmine: verified 2026-08-07 · exemplar this project's own SECURITY.md drift, found by a gold-standard audit scout the same day the drift became true (Supabase went live, SECURITY.md wasn't touched) · revalidate 90d -->

# Security Doc Sync Law

> **Scope**: Binding for every dev/agent. Found via a standards audit, 2026-08-07 (Security+Compatibility scout, item S14): `SECURITY.md` still described a "no backend, client-only, nothing to protect" trust model 8+ hours after Supabase Auth+RLS went live in `useAuth.ts` — a vulnerability reporter reading it that day would have scoped their report against a trust model that no longer existed.

## The rule

**Any change to the backend/auth trust model gets `SECURITY.md`'s Scope/Out-of-Scope sections re-checked in the SAME commit or PR, not "eventually."** Concretely, this fires on:

- Switching or adding an auth provider/backend (localStorage ↔ Supabase, or any future swap).
- Adding/removing a Row Level Security policy, or a `SECURITY DEFINER` RPC function.
- Adding/closing an access-control gap (the `grant_character` fix this same session — an RPC gaining or losing a privilege check — is exactly the shape).
- Any change to what data is client-trusted vs server-enforced.

## Why in the same commit, not a follow-up

A stale `SECURITY.md` isn't neutral — it actively misdirects. "No backend, nothing to bypass" tells a reporter not to look for RLS/RPC bugs, which is precisely the class of bug that becomes possible the moment a real backend exists. The gap this rule closes was real: this project ran with SECURITY.md describing zero attack surface while a genuine access-control hole (`grant_character`, no admin check) sat in production the whole time.

## What this doesn't mean

- Doesn't require re-writing `SECURITY.md` for unrelated changes (a new game feature, a UI tweak) — only backend/auth/trust-boundary changes trigger this.
- Doesn't replace `.agents/rules/agent-memory-law.md`'s `MEMORY.md`-rides-along requirement — both ride along together; `SECURITY.md` gets the same "ship the doc with the code" treatment `MEMORY.md` already has.

<!-- coalmine: verified 2026-08-16 · exemplar Supabase Row Level Security guide ("RLS must always be enabled on any tables stored in an exposed schema"; SECURITY DEFINER paired with SET search_path), fetched live 2026-08-16 · revalidate 90d -->

## The two Postgres requirements this law already fires on, now written down (2026-08-16)

The trigger list above already names "adding/removing a Row Level Security policy, or a
`SECURITY DEFINER` RPC function". What was never written is **what those additions must
contain.** A 2026-08-16 audit measured the code as clean on both counts and the rules
estate as silent on both: `grep -ri search_path` over `.agents/` returned **zero hits**
across 50 `SECURITY DEFINER` functions.

**Every new table in a PostgREST-exposed schema ships, in the same migration:**

1. `alter table … enable row level security`, and
2. at least one policy — RLS enabled with no policy denies everyone, which is safe but is
   a deployment bug, not a security posture.

**Every `security definer` function ships `set search_path` in the same migration.**
Without it the function resolves unqualified names through the caller's `search_path`,
which is the standard Postgres privilege-escalation route and the reason Supabase
documents the pairing rather than leaving it to habit.

### Why this is a rule and not a note

Measured 2026-08-16 across `supabase/migrations/` (29 files): **25 `create table` / 25
`enable row level security`** and **50 `SECURITY DEFINER` / 50 `set search_path`** — a
perfect record with nothing written down that requires it. That correctness is a habit of
whoever has been writing the migrations. The next migration from an outside contributor,
or from an agent skimming for a pattern, has nothing to fail against. **A miss here is a
data breach, not a bug**, which is why it is a MUST despite nothing being broken today.

**Enforcement**: ADVISORY today. The cheap mechanical form is a script over
`supabase/migrations/` counting `create table` against `enable row level security` and
`security definer` against `set search_path`, wired into `npm run ci` — a build check, not
a review habit (audit item A2).
