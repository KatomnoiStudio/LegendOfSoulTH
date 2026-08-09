-- ย้ายรายชื่อผู้ดูแลจาก src/data/admins.ts (static list ที่ build ลง public JS bundle) มาที่นี่
-- แทน — ตัดสินตาม HetCreep 2026-08-07: อีเมลจริงห้ามฝังใน client bundle (สแปมบอตกวาดได้ฟรี ๆ
-- โดยไม่ได้อะไรกลับมา) แต่ตอนนี้มี backend จริงแล้ว จึงย้ายมาเก็บที่นี่ตามที่ admins.ts เองก็
-- เขียนดักไว้ล่วงหน้าว่า "เมื่อมี backend จริงเมื่อไหร่ การตรวจสิทธิ์ต้องย้ายไปฝั่งเซิร์ฟเวอร์"
--
-- แยกเป็นตารางของตัวเอง ไม่ใช่ column `is_admin` บน profiles — เพราะ "own profile update"
-- policy (บรรทัด 105 ของ 0001_init.sql) ไม่ได้จำกัดคอลัมน์ ผู้เล่นจะ UPDATE is_admin ให้ตัวเอง
-- ตรง ๆ ผ่าน supabase-js ได้ทันทีถ้าเป็น column บน profiles ตารางแยกไม่มี INSERT/UPDATE/DELETE
-- policy ให้ authenticated เลย (เหมือน currency_transactions/owned_characters) — ตั้งค่าได้
-- ทางเดียวคือผ่าน Supabase dashboard SQL editor ด้วยสิทธิ์ postgres/service_role ซึ่งข้าม RLS
-- อยู่แล้ว ไม่ต้องมี RPC ให้เจาะ

create table public.admin_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.admin_accounts enable row level security;

-- ผู้เล่นเช็คสิทธิ์ตัวเองได้เท่านั้น (ดูว่าตัวเองเป็นแอดมินไหม) — เห็นแถวคนอื่นไม่ได้
create policy "own admin status select" on public.admin_accounts
  for select using (auth.uid() = profile_id);

-- ตั้งใจไม่มี insert/update/delete policy ให้ authenticated — ตั้งค่าได้ทาง dashboard เท่านั้น:
--
--   insert into public.admin_accounts (profile_id)
--   select id from public.profiles where uid = '<10-หลักของผู้เล่น>';
--
-- (หา uid ได้จากหน้าโปรไฟล์ในเกม หรือ select uid from public.profiles where id in
--  (select id from auth.users where email = '<อีเมลที่สมัคร>') — เอาอีเมลออกจาก query
--  ทันทีหลังใช้ ไม่ก็อปวางซ้ำที่ไหน)

-- พบระหว่างทำงานนี้: grant_character (0002_grant_character_rpc.sql) ไม่เคยเช็คสิทธิ์ผู้ดูแล
-- เลยตั้งแต่แรก — ผู้เล่นคนไหนก็เรียก supabase.rpc('grant_character', {...}) ตรง ๆ ผ่าน
-- browser console ได้ทันที ได้ตัวละครฟรีทุกตัวโดยไม่ผ่านกาชา/เงิน — คอมเมนต์เดิมของฟังก์ชัน
-- อ้างว่า "กันมอบตัวละครให้ตัวเองได้" ซึ่งไม่จริง มันกันแค่ insert ตรงเข้า owned_characters
-- (ไม่มี policy) แต่ไม่ได้กันการเรียก RPC เอง เพิ่มเช็ค admin_accounts เข้าไปในฟังก์ชันจริง ๆ ตอนนี้

create or replace function public.grant_character(p_character_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_accounts where profile_id = auth.uid()) then
    raise exception 'ไม่มีสิทธิ์มอบตัวละคร';
  end if;

  insert into public.owned_characters (profile_id, character_id)
  values (auth.uid(), p_character_id);

  return (select p.* from public.profiles p where id = auth.uid());
end;
$$;
