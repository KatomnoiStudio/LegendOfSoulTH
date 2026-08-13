-- Public UID issuance moves to the server, because the client was never the right place for it.
--
-- THE DEFECT (live in production, audit 2026-08-12 §0b.1)
-- `handle_new_user` issued a profile's public UID as:
--     coalesce(new.raw_user_meta_data->>'uid', substr(new.id::text, 1, 10))
-- Only `register()` supplies that metadata. `signInAnonymously` and `signInWithOAuth` supply
-- none, so every guest and every Google account fell through to the substring branch — which
-- yields 8 hex + '-' + 1 hex, e.g. `3f1a9c2e-4`.
--
-- The UID contract is `^[1-9][0-9]{9}$` (src/game/uid.ts). The malformed value fails it, and
-- the friend-search box strips non-digits from its input, so an affected UID cannot even be
-- TYPED IN — not merely "not found". `profiles.uid` is `unique not null` and no write path
-- ever updates it, so an account born malformed stayed malformed, permanently unfriendable,
-- with nothing on screen explaining why.
--
-- WHY THE SERVER, NOT THE CALL SITES
-- Patching the two callers that forgot to pass metadata would fix today's two paths and leave
-- the default wrong. A third sign-in path added later would inherit the same bug in silence.
-- The generator belongs where every path already converges.
--
-- WHAT THIS DOES NOT DO
-- It does not backfill existing malformed rows. That is a separate decision with a player-facing
-- consequence — a reissued UID invalidates whatever the player already told their friends — and
-- it needs the affected-account count in front of it before anyone chooses. New accounts are
-- correct from this migration forward; existing ones are untouched.
--
-- DEPLOY ORDER — THIS MIGRATION MUST LAND BEFORE ANY CLIENT CHANGE
-- `register()` still generates a UID client-side and passes it in `options.data.uid`. After this
-- migration the server ignores it, which is harmless: register() re-reads the profile after
-- signup, so it observes the server's value either way. Removing that client-side generation is
-- a follow-up, and it is only safe once this is live — a new client against the old trigger
-- would supply no metadata and land straight in the substring branch this migration exists to
-- delete.

-- ---------------------------------------------------------------------------
-- The generator. Pure — no table access — so it can be tested on its own.
-- ---------------------------------------------------------------------------
--
-- First digit 1-9, then 9 digits 0-9: always exactly 10 characters, never a leading zero,
-- matching `^[1-9][0-9]{9}$` by construction rather than by assertion.
--
-- `random()` rather than a cryptographic source on purpose. A public UID is a friend code — it
-- is meant to be handed out, and the 9e9 space is enumerable regardless of how it was drawn, so
-- unpredictability buys nothing here. Uniqueness is what matters, and that is enforced by the
-- unique constraint below, not by the quality of the draw. (The TypeScript generator uses
-- `crypto.getRandomValues` because that is the idiomatic browser API, not because the value is
-- a secret; note that this version has no modulo bias to reject, since a float multiply is
-- already uniform.)
create or replace function public.issue_profile_uid()
returns text
language sql
volatile
as $$
  select (1 + floor(random() * 9))::int::text
      || lpad(floor(random() * 1000000000)::bigint::text, 9, '0')
$$;

comment on function public.issue_profile_uid() is
  'Draws one candidate public UID matching ^[1-9][0-9]{9}$. Uniqueness is the caller''s job — '
  'see handle_new_user, which retries against the unique constraint.';

-- ---------------------------------------------------------------------------
-- The trigger, with the substring branch removed.
-- ---------------------------------------------------------------------------
--
-- The UID is issued by inserting and letting the unique constraint arbitrate, rather than by
-- checking `not exists` first and then inserting. A pre-check is a race: two concurrent signups
-- can both see a candidate as free. The constraint cannot be raced, so it is the only check
-- worth having.
--
-- A `unique_violation` that is NOT the uid constraint is re-raised immediately. Without that
-- test, a duplicate primary key (the same auth user triggering twice) would be mistaken for a
-- UID collision and burn all the retries before failing with a misleading message.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        text;
  v_attempt    int := 0;
  v_constraint text;
begin
  loop
    v_attempt := v_attempt + 1;
    v_uid := public.issue_profile_uid();

    begin
      insert into public.profiles (id, uid, name)
      values (
        new.id,
        v_uid,
        coalesce(new.raw_user_meta_data->>'name', '')
      );
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;

      -- Not a UID collision (e.g. the primary key). Nothing here can fix that — let it out.
      if v_constraint is null or position('uid' in v_constraint) = 0 then
        raise;
      end if;

      -- 20 straight collisions against a 9e9 space is not luck, it is a broken generator or a
      -- table that is somehow full. Fail loudly rather than spin, and never hand back a
      -- duplicate — same posture as the TypeScript generator's MAX_ATTEMPTS.
      if v_attempt >= 20 then
        raise exception
          'could not issue a unique public uid after % attempts (last candidate %)',
          v_attempt, v_uid
          using errcode = 'unique_violation';
      end if;
    end;
  end loop;

  insert into public.owned_characters (profile_id, character_id)
  values (new.id, 'monkey-king');

  insert into public.team_slots (profile_id, slot_index, character_id)
  values (new.id, 0, 'monkey-king'), (new.id, 1, null), (new.id, 2, null), (new.id, 3, null);

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values
    (new.id, 'gold', 'signup', 500, 'signup'),
    (new.id, 'gem', 'signup', 20, 'signup');

  update public.profiles
  set gold = 500,
      gem = 20,
      lifetime_gold_earned = 500,
      lifetime_gem_earned = 20
  where id = new.id;

  return new;
end;
$$;
