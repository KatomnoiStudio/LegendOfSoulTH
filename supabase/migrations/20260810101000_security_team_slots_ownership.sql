-- Security fix — issue #101 Finding 7 (MEDIUM, external audit): team_slots accepted ANY
-- character_id value.
--
-- team_slots' only write policy is `for all using (auth.uid() = profile_id)` (0001_init.sql:110).
-- RLS decides WHICH ROWS a client may touch, never WHICH VALUES it may write into them — the
-- same distinction 0009 Fix 3 already had to work around for profiles.gold/gem. So an
-- authenticated client could run
--   supabase.from('team_slots').update({ character_id: 'any-hero-id' }).eq('slot_index', 0)
-- and field a Hero it never obtained, bypassing gacha (#23), star ascension (#15) and every
-- grant_character path. The row is its own, so RLS passes; nothing validated the value.
--
-- ── Mechanism choice: BEFORE trigger, not a foreign key ───────────────────────────────────
-- A plain FK cannot express this constraint. Ownership is per-profile — the legal set of
-- character_id values for a row depends on that row's OWN profile_id, i.e. the pair
-- (profile_id, character_id) must exist in owned_characters. A composite FK
-- (profile_id, character_id) -> owned_characters(profile_id, character_id) would technically
-- match that unique key, but it would also force ON DELETE behaviour into the schema for a
-- parent row this repo never deletes, and it cannot express the "null slot is always legal"
-- exemption as clearly (MATCH SIMPLE happens to allow it, silently, as a side effect of one
-- column being null — an invariant that reads as an accident rather than a decision).
-- The repo's own precedent for value-level enforcement that RLS cannot express is a
-- SECURITY DEFINER function (0009's RPC guards, handle_new_user, redeem_coupon), so a
-- BEFORE INSERT OR UPDATE trigger is the shape that matches both the constraint and the repo.
--
-- SECURITY DEFINER on the check function is deliberate: it makes the ownership lookup
-- authoritative rather than dependent on the caller's RLS view of owned_characters. An INVOKER
-- function would fail OPEN in one direction and CLOSED in another — a legitimate equip could
-- be rejected because a SELECT policy hid a row the player really owns. It reads one table and
-- raises; it grants no new write reach. `set search_path = public` matches every other
-- SECURITY DEFINER function in this schema.

-- ── One-time repair: null out any slot that already references an unowned character ───────
-- Pre-existing violations (from the window this gap was open) would otherwise survive the fix
-- untouched, since the trigger only fires on write. Nulling unequips the slot — visible to the
-- player, and the honest outcome: the slot was never legitimately filled.
update public.team_slots ts
set character_id = null
where ts.character_id is not null
  and not exists (
    select 1
    from public.owned_characters oc
    where oc.profile_id = ts.profile_id
      and oc.character_id = ts.character_id
  );

create or replace function public.enforce_team_slot_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- An empty slot is always legal — clearing a slot must never be blocked.
  if new.character_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.owned_characters oc
    where oc.profile_id = new.profile_id
      and oc.character_id = new.character_id
  ) then
    raise exception 'ยังไม่ได้เป็นเจ้าของตัวละครนี้ จัดทีมไม่ได้: %', new.character_id;
  end if;

  return new;
end;
$$;

create trigger team_slots_ownership_check
  before insert or update on public.team_slots
  for each row execute function public.enforce_team_slot_ownership();

-- ── Delete side ───────────────────────────────────────────────────────────────────────────
-- ASSUMPTION, stated rather than assumed silently: this repo never deletes a row from
-- owned_characters. Verified 2026-08-10 — no `.delete()` against owned_characters exists in
-- src/, and no migration issues a DELETE against it. Characters are only ever added
-- (handle_new_user, grant_character, perform_gacha_pull) or updated (progression, ascension).
-- The only path that removes owned_characters rows is a profile deletion (guest cleanup 0006,
-- dead-account cleanup 0014), which cascades team_slots away in the same statement.
--
-- So the delete side is currently unreachable. It still gets a rule, because "unreachable
-- today" is exactly the assumption that rots: if a character is ever removed from a player,
-- every slot pointing at it is cleared. Without this, such a slot would be left referencing a
-- character the player no longer owns — an invariant violation the write-side trigger cannot
-- see, since it only inspects rows being written.
create or replace function public.clear_team_slots_for_removed_character()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team_slots
  set character_id = null
  where profile_id = old.profile_id
    and character_id = old.character_id;

  return old;
end;
$$;

-- AFTER, so the slot clear only happens once the character row is actually gone. Safe under a
-- profile cascade delete in either order: if team_slots was cascaded first the update matches
-- zero rows, and the update it does perform writes null, which the ownership trigger exempts.
create trigger owned_characters_clear_team_slots
  after delete on public.owned_characters
  for each row execute function public.clear_team_slots_for_removed_character();
