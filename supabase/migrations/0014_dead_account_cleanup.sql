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
