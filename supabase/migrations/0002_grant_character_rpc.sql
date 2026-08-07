-- grantCharacter ใน accountRepository.supabase.ts เดิม insert ตรงเข้า owned_characters
-- ซึ่งไม่มี INSERT policy ให้ authenticated role (ตั้งใจ — เหมือน currency_transactions
-- ต้องผ่าน RPC เท่านั้น) เพิ่มฟังก์ชันนี้แทนการเปิด INSERT policy ตรง ๆ ซึ่งจะเปิดช่องให้
-- ผู้เล่นมอบตัวละครให้ตัวเองได้ทุกตัวโดยไม่ผ่านการตรวจสอบใด ๆ

create or replace function public.grant_character(p_character_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.owned_characters (profile_id, character_id)
  values (auth.uid(), p_character_id);

  return (select p.* from public.profiles p where id = auth.uid());
end;
$$;
