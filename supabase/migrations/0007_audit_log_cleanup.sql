-- ล้าง auth.audit_log_entries เก่าอัตโนมัติ — กันดิสก์บวมถ้าเปิด Audit Logs ใช้จริงในอนาคต
--
-- HetCreep ถาม "เปิด Audit Logs แล้วตั้งค่า clear ข้อมูลเก่าเพื่อ save disk ได้ไหม" — เช็คจริงแล้ว
-- Supabase Dashboard ไม่มี toggle "retention days" ให้ตั้งตรง ๆ (ไม่พบใน official docs,
-- supabase.com/docs/guides/auth/audit-logs) ตารางนี้เป็น Postgres table ธรรมดาใต้ schema auth
-- จึงประกอบเองด้วย pg_cron แบบเดียวกับ cleanup_stale_guest_accounts() (0006_guest_cleanup.sql)
--
-- เกณฑ์ 90 วัน อ้างอิงจากแนวปฏิบัติทั่วไปของ security log retention — OWASP Logging Cheat Sheet
-- ชี้ไปที่ NIST SP 800-92 (ไม่ได้ฟันธงตัวเลขตายตัวเอง, แล้วแต่ compliance ของแต่ละที่) แต่ baseline
-- ที่พบทั่วไปในอุตสาหกรรมคือ "การสืบสวนเหตุการณ์ความปลอดภัยมักต้องย้อนดูอย่างน้อย 90 วัน" —
-- โปรเจกต์นี้ไม่มีข้อบังคับ compliance ใด ๆ (ไม่ใช่ PCI-DSS/HIPAA) จึงใช้ baseline นี้เป็นค่าเริ่มต้น
-- ที่สมเหตุสมผล ไม่ใช่ค่าบังคับทางกฎหมาย
--
-- ตอนเขียน (2026-08-08) ตารางนี้มี 0 rows — ยังไม่เคยเปิดใช้ Audit Logs จริง งานนี้เตรียมไว้ล่วงหน้า
-- เผื่อเปิดใช้ทีหลัง ไม่ใช่แก้ปัญหาที่เกิดขึ้นจริงตอนนี้

create extension if not exists pg_cron with schema extensions;

create or replace function public.cleanup_old_audit_log_entries()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.audit_log_entries
  where created_at < now() - interval '90 days';
end;
$$;

-- รันทุกวันตอนตี 3 (เวลา UTC) เวลาเดียวกับ cleanup_stale_guest_accounts() — ช่วงคนเล่นน้อยสุด
select cron.schedule(
  'cleanup-old-audit-log-entries',
  '0 3 * * *',
  $$select public.cleanup_old_audit_log_entries();$$
);
