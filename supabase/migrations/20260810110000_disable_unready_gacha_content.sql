-- Production content freeze: the Standard Banner currently contains Heroes whose Asset Contract
-- still has placeholder/pending entries. Keep the pool, pity and player history intact, but make
-- the banner unreachable through both RLS reads and perform_gacha_pull until it is explicitly
-- reactivated by a later, reviewed migration after every Hero and mobile playtest are approved.

do $$
begin
  update public.gacha_banners
  set
    active = false,
    description = 'ปิดชั่วคราวจนกว่า Asset Contract และ mobile playtest จะผ่าน Production',
    updated_at = now()
  where id = 'standard-banner';

  if not found then
    raise exception 'standard-banner is missing; apply the P9 Gacha authority migration first';
  end if;
end;
$$;
