-- Reconcile `cleanup_dead_unplayed_accounts` between production and this repo, and close the
-- deletion defect — the registered-account twin of the guest job fixed in
-- 20260810160000_security_audit_hardening_wave1.sql.
--
-- ── HOW THIS IS DEPLOYED ────────────────────────────────────────────────────────────────────
-- Applied by the OWNER via the Supabase SQL Editor (migration relay), NEVER `supabase db push`,
-- and never by an agent. This file is the durable record of what was pasted.
-- Every statement is RE-RUNNABLE; a double-paste of the whole file is safe.
--
-- ⚠ THIS FILE SCHEDULES NOTHING. `cleanup-dead-unplayed-accounts` was `cron.unschedule`d on
-- 2026-08-10 (MEMORY item 190 Part B) and STAYS unscheduled. Applying this replaces the function
-- body; it does not put the job back on the schedule. Re-arming is the owner's separate,
-- deliberate act — do not read "fixed" as "running". Run the PRE-ARM CHECK at the bottom of this
-- file first; re-arm only if it returns 0.
--
-- ── WHICH BODY WAS AUTHORITATIVE, AND HOW WE KNOW ───────────────────────────────────────────
-- Production ran, verbatim:
--     delete from auth.users u
--     where u.is_anonymous is false
--       and u.created_at < now() - interval '30 days'
--       and not exists (select 1 from public.battle_history bh where bh.profile_id = u.id);
-- That is byte-for-byte the FIRST revision of 0014_dead_account_cleanup.sql, commit 1204236
-- (2026-08-08 23:09:29 +0700). Four minutes later commit 835dd95 (23:13:03) added the
-- `cleanup_exempt_profiles` and `topup` guards under the message "add exemption paths to
-- dead-account cleanup BEFORE FIRST APPLY" — the author believed it had not been relayed yet.
-- Production proves it had been, inside that four-minute window.
--
-- So the answer is neither "0014 was never relayed" nor "a later hand-paste overwrote it":
-- **0014 WAS relayed, at revision 1204236, and its three follow-up commits (835dd95, db2c079,
-- 985d4c3) never were.** The committed file is authoritative as INTENT; production carries a
-- stale body that predates every guard the file appears to promise. Anyone reading 0014 in the
-- repo would have concluded the guards were live. They were not.
--
-- ⚠ CONSEQUENCE FOR THIS FILE: `cleanup_exempt_profiles` was introduced by 835dd95, which was
-- never relayed either — so this migration must NOT assume the table, its RLS, or its seed rows
-- exist on production. All three are (re)created here idempotently. If they do already exist
-- (main's 2026-08-10 sweep reported the table present, by a route this file cannot establish
-- from git), every statement below is a no-op. Either way this file is self-sufficient, which
-- is the whole lesson of the 20260810160000 `grant_item` overload: a fix that lives only in a
-- hand-paste is a fix that does not exist for the next environment.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 1. THE EXEMPTION TABLE — carried here because its own migration never reached production
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Identical shape to 0014:34-38. `if not exists` makes this a no-op where it already landed.
create table if not exists public.cleanup_exempt_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- RLS on with zero policies — same pattern as rpc_rate_limit (0011) and item_catalog
-- (20260810160000). Only the SECURITY DEFINER function below, running as owner, ever reads it.
alter table public.cleanup_exempt_profiles enable row level security;
revoke all on public.cleanup_exempt_profiles from public, anon, authenticated;

-- The three standing exemptions from 0014:48-52 (dev/test accounts, MEMORY item 148, plus the
-- standing reusable smoke-test account). Re-seeded because 835dd95/db2c079 never relayed.
-- A profile that no longer exists is skipped rather than failing the paste.
insert into public.cleanup_exempt_profiles (profile_id, reason)
select v.profile_id, v.reason
from (values
  ('e79a973f-fd52-4b84-8e6a-c53a0394db88'::uuid, 'dev/test account (a@a.com) — item 148'),
  ('d0a7b94f-5d95-4e52-8d8f-ebdd835cf695'::uuid, 'dev/test account (kaoshock123, DemoGODRTX) — item 148'),
  ('9baf5833-89d4-401e-9ece-14e46a27a228'::uuid, 'standing reusable smoke-test account (smoketest-prod-verify@katomnoi.studio)')
) as v(profile_id, reason)
where exists (select 1 from public.profiles p where p.id = v.profile_id)
on conflict (profile_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 2. THE PREDICATE
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- ⚠ THE CORE CRITERION IS DELIBERATELY *NOT* THE GUEST JOB'S. Read this before "harmonising"
-- the two functions.
--   * The guest job (20260810160000) reaps DORMANCY: an anonymous account with no activity in
--     30 days. Its purpose is anti-farming, and a guest who played last month but not since is
--     exactly what it is meant to collect.
--   * This job reaps NEVER-ENGAGED registered accounts: "signed up and never played once."
--     0014's own header draws that line explicitly and cites Kakao's three-YEAR window as the
--     figure for accounts that were active and went dormant — a different category this job
--     does not touch.
-- So `not exists (ANY battle_history row, ever)` stays as it is on production. Swapping in the
-- guest job's "no battle in the last 30 days" would WIDEN deletion to every player who ever
-- stopped playing — a policy change nobody authorised, dressed as a consistency fix.
--
-- Everything else is added, and every addition strictly NARROWS the deployed predicate. There
-- is no input for which this deletes an account the deployed body would have spared.
--
-- The four added guards:
--   (a) last_sign_in_at, coalesced to created_at for rows GoTrue has never stamped — the signal
--       the deployed body lacked entirely. `created_at` alone must never decide a deletion.
--   (b) no currency_transactions in 30 days, EXCLUDING source 'signup' — 20260810100000's
--       backfill wrote a signup row onto every pre-existing account at APPLY time, so without
--       this exclusion every account would read as active for 30 days after that migration
--       landed and the guard would be silently inert. (Same trap the guest job documents.)
--   (c) cleanup_exempt_profiles — the table 0014 created and its function never read.
--   (d) any 'topup' ever. A paying account is never auto-deleted, full stop, at any age.
--
-- KNOWN LIMIT, stated not hidden: a registered user who signs in through a persisted session
-- without re-authenticating does not refresh last_sign_in_at (a token refresh is not a sign-in).
-- Combined with "never played a battle" and "never spent or earned currency", the surviving
-- class is "registered, never battled, never transacted, never re-authenticated for 30 days" —
-- and the exempt table is the escape hatch for any real case that surfaces.
create or replace function public.cleanup_dead_unplayed_accounts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users u
  where u.is_anonymous is false
    and u.created_at < now() - interval '30 days'
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (
      select 1 from public.battle_history bh where bh.profile_id = u.id
    )
    and not exists (
      select 1 from public.currency_transactions ct
      where ct.profile_id = u.id
        and ct.source <> 'signup'
        and ct.created_at > now() - interval '30 days'
    )
    and not exists (
      select 1 from public.cleanup_exempt_profiles ce where ce.profile_id = u.id
    )
    and not exists (
      select 1 from public.currency_transactions ct
      where ct.profile_id = u.id and ct.source = 'topup'
    );
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 3. EXECUTE LOCK — re-asserted, not undone
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- `create or replace` above preserves the existing ACL, so 20260810160000's revoke survives on
-- its own. This is restated anyway so the lock cannot be lost if this file is ever replayed
-- into an environment that never saw that migration.
-- `authenticated` IS in this list deliberately: Supabase's bootstrap runs
--   alter default privileges in schema public grant all on functions to anon, authenticated
-- so a function created here holds a DIRECT grant to that role and revoking `public, anon`
-- alone leaves it standing. No live role has any business invoking a mass-deletion job —
-- pg_cron runs it as the function owner, which needs no grant at all.
revoke execute on function public.cleanup_dead_unplayed_accounts() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- 4. PRE-ARM CHECK — run this BEFORE any cron.schedule, and do not re-arm unless it returns 0
-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Not executed by this migration (a SELECT in a relay paste just prints a number nobody reads
-- twice). This is the exact predicate above, counted instead of deleted, so the blast radius is
-- measured on the real data at the moment of arming rather than estimated from a stale snapshot.
--
-- Under the DEPLOYED body this count was 15 of 17 registered accounts within 30 days. Under the
-- predicate above it can only be smaller — every added clause is conjunctive — but the exact
-- figure has NOT been measured by the author of this file, who has no production access and is
-- not permitted to acquire any. Run it. Do not assume it is zero because it should be.
--
--   select count(*) from auth.users u
--   where u.is_anonymous is false
--     and u.created_at < now() - interval '30 days'
--     and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
--     and not exists (select 1 from public.battle_history bh where bh.profile_id = u.id)
--     and not exists (
--       select 1 from public.currency_transactions ct
--       where ct.profile_id = u.id and ct.source <> 'signup'
--         and ct.created_at > now() - interval '30 days')
--     and not exists (
--       select 1 from public.cleanup_exempt_profiles ce where ce.profile_id = u.id)
--     and not exists (
--       select 1 from public.currency_transactions ct
--       where ct.profile_id = u.id and ct.source = 'topup');
--
-- If it returns non-zero, LIST those accounts before deciding — a non-zero result is a decision
-- for the owner, not a green light:
--   ...same predicate, `select u.id, u.email, u.created_at, u.last_sign_in_at` instead of count.
