<!-- coalmine: verified 2026-08-07 · exemplar this project's own SECURITY.md drift, found by a gold-standard audit scout the same day the drift became true (Supabase went live, SECURITY.md wasn't touched) · revalidate 90d -->

# Security Doc Sync Law

> **Scope**: Binding for every dev/agent. Found via `/gold-standard` AUDIT, 2026-08-07 (Security+Compatibility scout, item S14): `SECURITY.md` still described a "no backend, client-only, nothing to protect" trust model 8+ hours after Supabase Auth+RLS went live in `useAuth.ts` — a vulnerability reporter reading it that day would have scoped their report against a trust model that no longer existed.

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
