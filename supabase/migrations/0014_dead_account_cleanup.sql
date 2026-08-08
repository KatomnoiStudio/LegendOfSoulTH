-- Dead (never-played) email/password account cleanup — HetCreep, 2026-08-08
--
-- Extends the same reasoning as 0006_guest_cleanup.sql to REGISTERED (non-anonymous) accounts
-- that were created but never actually played a single battle. No universal legal number
-- exists for this window — researched live before writing this:
--   - GDPR sets only the storage-limitation PRINCIPLE (don't keep data longer than necessary),
--     never a specific day-count; the number is each project's own policy call.
--   - HoYoverse (Genshin Impact, Honkai Star Rail) never auto-deletes inactive accounts at all
--     — user-initiated deletion only, with its own 30-day undo window.
--   - Com2uS (Summoners War) publishes no findable retention figure.
--   - Kakao Games (Guardian Tales' platform) uses 3 years, but that's for accounts that WERE
--     active and went dormant — a different category from "signed up, never played once."
-- HetCreep's own call, not a legal requirement: this project's server is small today and
-- backend health/storage takes priority over a generous grace window — reuse the same 30-day
-- figure already established for guest cleanup (0006) rather than invent a new number with no
-- real precedent behind it either.
--
-- "Never played" = zero rows in battle_history ever, the cleanest true-zero-engagement signal.
-- currency/owned_characters/team_slots are all auto-granted by handle_new_user() at signup
-- regardless of whether the player does anything afterward, so they can't distinguish "played"
-- from "signed up and never came back" — only battle_history requires the player to actually
-- act, so its absence is unambiguous.
--
-- cascade via FK on delete cascade from profiles (and everything hanging off it) — same
-- mechanism 0006_guest_cleanup.sql already relies on; deleting the auth.users row is enough.
--
-- ⚠️ NO GRANDFATHER CLAUSE: the age/never-played check runs against every EXISTING account too,
-- not just future signups — the first cron run after this migration ships can immediately
-- delete any pre-existing account that already matches (>30 days old, zero battle_history).
-- Two exemption paths close the real cases HetCreep flagged before applying this:
--
-- (1) explicit manual allowlist, for dev/test/team accounts — add a row any time.
create table if not exists public.cleanup_exempt_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- known dev/test accounts from the 0013 apply incident (MEMORY.md item 148) — both predate
-- this migration and would otherwise be swept on the very first cron run.
insert into public.cleanup_exempt_profiles (profile_id, reason) values
  ('e79a973f-fd52-4b84-8e6a-c53a0394db88', 'dev/test account (a@a.com) — item 148'),
  ('d0a7b94f-5d95-4e52-8d8f-ebdd835cf695', 'dev/test account (kaoshock123, DemoGODRTX) — item 148'),
  ('9baf5833-89d4-401e-9ece-14e46a27a228', 'standing reusable smoke-test account (smoketest-prod-verify@katomnoi.studio)')
on conflict (profile_id) do nothing;

-- (2) automatic exemption for any account that ever made a real top-up — derived from data,
-- no manual list to maintain. topUpGold/topUpGems have no live RPC yet (SECURITY.md), so this
-- currently matches nothing, but it's cheap to have ready before real payments ship.
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
    and not exists (
      select 1 from public.battle_history bh where bh.profile_id = u.id
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

-- Offset 30 minutes from 0006's guest-cleanup job (0 3 * * *) so the two don't run in the same
-- instant — same off-peak reasoning (SEA player base, lowest traffic hour).
select cron.schedule(
  'cleanup-dead-unplayed-accounts',
  '30 3 * * *',
  $$select public.cleanup_dead_unplayed_accounts();$$
);
