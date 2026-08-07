-- ระบบ Guest (anonymous sign-in, signInAnonymously) + งานลบ guest ที่ค้างทิ้งไว้อัตโนมัติ
--
-- HetCreep: "เพิ่มระบบ guest + ระบบ clear data ทิ้ง" — clear-data ในที่นี้คือ "ป้องกันคนปั้ม
-- guest จนข้อมูลตัน" ไม่ใช่ปุ่มลบข้อมูลของผู้เล่นเอง (นั่นคือ log out/uninstall อยู่แล้ว)
--
-- handle_new_user() (0001_init.sql) ทำงานกับ guest เหมือนบัญชีปกติทุกประการ — trigger ผูกกับ
-- "insert บน auth.users" ไม่สนใจว่ามาจาก signUp/signInWithPassword หรือ signInAnonymously
-- guest จึงได้ profile + monkey-king + ทอง/หยกเริ่มต้นเหมือนบัญชีจริง ไม่ต้องเขียนโค้ดแยก
--
-- เกณฑ์ 30 วันอ้างอิงจาก Firebase's official "Best Practices for Anonymous Authentication"
-- (firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication) — ค่ามาตรฐาน
-- อุตสาหกรรมที่ Firebase Identity Platform ใช้เป็นค่า auto-cleanup ของตัวเอง Supabase ไม่มี
-- สวิตช์อัตโนมัติแบบเดียวกัน (ไม่มี native auto-cleanup) จึงต้องประกอบเองด้วย pg_cron

create extension if not exists pg_cron with schema extensions;

-- ลบเฉพาะ guest ที่ "ยังไม่เคย upgrade" (is_anonymous ยังเป็น true อยู่) และเกิน 30 วันแล้ว
-- guest ที่ผูก email/password (updateUser) หรือ Google (linkIdentity) แล้ว auth.users.is_anonymous
-- จะกลายเป็น false เองอัตโนมัติจากฝั่ง GoTrue — ไม่ต้องเช็คแยก ไม่มีทางลบบัญชีที่ upgrade แล้วผิดพลาด
--
-- cascade ผ่าน FK ที่มีอยู่แล้วทุกตาราง (profiles → owned_characters/team_slots/inventory_items/
-- friends/battle_history/currency_transactions/admin_accounts ทั้งหมด "on delete cascade")
-- ลบแถว auth.users แถวเดียวพอ ข้อมูลลูกหายตามหมดโดยไม่ต้องเขียน DELETE แยกทีละตาราง
create or replace function public.cleanup_stale_guest_accounts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users
  where is_anonymous is true
    and created_at < now() - interval '30 days';
end;
$$;

-- รันทุกวันตอนตี 3 (เวลา UTC) — ช่วงคนเล่นน้อยที่สุดของทุก timezone ที่เกมนี้เล็งกลุ่มผู้เล่นไว้ (ไทย/SEA)
select cron.schedule(
  'cleanup-stale-guest-accounts',
  '0 3 * * *',
  $$select public.cleanup_stale_guest_accounts();$$
);
