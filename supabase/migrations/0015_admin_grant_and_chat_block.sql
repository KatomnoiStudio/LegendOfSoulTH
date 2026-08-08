-- Two additions per HetCreep, 2026-08-09, resolving blueprint-divergence item #10
-- (admin moderation layer had only /help + /givecharacter):
--
-- (1) Admin "เสกของ" extension — /givegold, /giveitem alongside the existing /givecharacter.
--     Same self-target pattern (admin grants to their OWN logged-in account, never another
--     player's) and same admin_accounts-gated SECURITY DEFINER pattern as grant_character
--     (0004_admin_accounts.sql) — copy the exact precedent, don't invent a new access model.
--
-- (2) Player-side block/mute for World Chat — per the exemplar found live (Guardian Tales'
--     own devs describe exactly this as their actual shipped moderation feature: a per-player
--     chat block, not an admin-panel takedown tool). World Chat itself is 100% client-local
--     (chatStorage.ts, no Supabase — see MEMORY.md's blueprint-audit item on this), so the
--     block list stays client-local too for architectural consistency — no Supabase table,
--     no RLS, this migration's only DB-side content is part (1).

-- ── (1a) Admin gold grant ──────────────────────────────────────────────────────
-- currency_transactions' source CHECK only allowed ('quest','drop','topup') for gold —
-- add 'admin' as its own distinguishable source so these grants are never confused with
-- real gameplay-earned currency in the ledger.
alter table public.currency_transactions drop constraint currency_source_match;
alter table public.currency_transactions
  add constraint currency_source_match check (
    (currency = 'gold' and source in ('quest', 'drop', 'topup', 'admin'))
    or (currency = 'gem' and source in ('topup', 'coupon'))
  );

-- Bounded well above earn_gold's 1000/call cap (this is a dev/testing convenience, not a
-- player-facing reward path) but still bounded — a fat-fingered extra zero shouldn't be able
-- to mint an unbounded amount even from a trusted admin account.
create or replace function public.grant_gold_admin(p_amount int)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  v_max_amount constant int := 1000000;
begin
  if not exists (select 1 from public.admin_accounts where profile_id = auth.uid()) then
    raise exception 'ไม่มีสิทธิ์เสกทอง';
  end if;
  if p_amount <= 0 then
    raise exception 'จำนวนทองไม่ถูกต้อง';
  end if;
  if p_amount > v_max_amount then
    raise exception 'จำนวนทองเกินขีดจำกัด (%): %', v_max_amount, p_amount;
  end if;

  insert into public.currency_transactions (profile_id, currency, source, amount)
  values (auth.uid(), 'gold', 'admin', p_amount);

  update public.profiles set gold = gold + p_amount where id = auth.uid()
  returning * into result;

  return result;
end;
$$;

-- ── (1b) Admin item grant ──────────────────────────────────────────────────────
-- Direct inventory_items upsert, no item_grant_ledger row — that ledger's job is refId
-- dedupe for the player-facing reward pipeline (0013); a one-off manual admin click has
-- no refId/idempotency concern the same way. obtained_from='admin' has no CHECK constraint
-- to satisfy (inventory_items never restricted that column's values).
create or replace function public.grant_item_admin(p_item_id text, p_quantity int)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_quantity constant int := 10000;
begin
  if not exists (select 1 from public.admin_accounts where profile_id = auth.uid()) then
    raise exception 'ไม่มีสิทธิ์เสกไอเทม';
  end if;
  if p_quantity <= 0 then
    raise exception 'จำนวนไอเทมไม่ถูกต้อง';
  end if;
  if p_quantity > v_max_quantity then
    raise exception 'จำนวนไอเทมเกินขีดจำกัด (%): %', v_max_quantity, p_quantity;
  end if;

  insert into public.inventory_items (profile_id, item_id, quantity, obtained_from)
  values (auth.uid(), p_item_id, p_quantity, 'admin')
  on conflict (profile_id, item_id)
  do update set quantity = public.inventory_items.quantity + excluded.quantity;

  return (select p.* from public.profiles p where id = auth.uid());
end;
$$;
