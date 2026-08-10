-- Ring 0 approved opening the existing Standard Banner for the remaining real-device playtest.
-- This changes publication state only: RNG, Gem debit, pity, ownership and retry idempotency stay
-- inside perform_gacha_pull. The five Heroes' Production Asset Contract remains pending.

do $$
declare
  v_pool_count integer;
  v_total_rate numeric;
  v_pity_pool_count integer;
begin
  select count(*), coalesce(sum(drop_rate), 0)
  into v_pool_count, v_total_rate
  from public.gacha_banner_pool
  where banner_id = 'standard-banner';

  select count(*)
  into v_pity_pool_count
  from public.gacha_banner_pool as pool
  join public.gacha_banners as banner on banner.id = pool.banner_id
  where banner.id = 'standard-banner'
    and pool.rarity = banner.pity_rarity;

  if v_pool_count <> 5 or abs(v_total_rate - 1) > 0.0000001 or v_pity_pool_count = 0 then
    raise exception 'standard-banner playtest contract is invalid';
  end if;

  update public.gacha_banners
  set
    active = true,
    description = 'วีรชนห้ารูปแบบการเล่น — เปิดสำหรับ Ring 0 playtest',
    updated_at = now()
  where id = 'standard-banner';

  if not found then
    raise exception 'standard-banner is missing; apply the P9 Gacha authority migration first';
  end if;
end;
$$;
