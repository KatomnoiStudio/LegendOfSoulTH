<!-- coalmine: verified 2026-08-09 · exemplar double-entry general-ledger practice + PCI DSS v4.0 Req. 10.5.1 (hot/archive split, verified live) · revalidate 90d -->

# Project Law: Currency ledger retention

> ตัดสินผ่าน ask CB 4 ที่นั่ง 2026-08-07 ตามที่ HetCreep สั่งให้ใช้มาตรฐานสากลเป็นเกณฑ์
> ไม่ใช่กฎที่คิดขึ้นเอง

## สถานะปัจจุบัน: สร้างแล้ว + apply เข้า production + ตรวจยืนยันแล้ว (2026-08-09, `supabase/migrations/20260809090000_p_currency_ledger_archive.sql`)

> ตรวจ read-only ผ่าน Management API หลัง apply: lifetime columns ×2, archive table (RLS+policy),
> archive function, cron jobid 5 (`0 4 1 * *`), credit functions ทั้ง 3 มี lifetime increment,
> backfill 0 mismatches — ครบทุกข้อ (MEMORY.md item 179)

**เงื่อนไขทริกเกอร์ด้านล่างนี้จุดจริงแล้ว** — `src/game/reward/lobbyBattleRewardPipeline.ts`
(commit `6172d52`, 2026-08-08) ต่อ `earnGold`/`grantItem` เข้ากับผลจบการต่อสู้อัตโนมัติ
ตรวจพบผ่าน full doc-vs-code audit (2026-08-10) ว่าไม่มีระบบเก็บถาวรตามมาในคอมมิตนั้น —
ส่งเป็น design-fork ให้ nustanakritwithai เลือกระหว่าง "กฎจุดจริง สร้างเลย" กับ "เลขที่กฎอ้างอิง
(34,000 แถว/localStorage quota) เป็นของ backend เก่าที่เลิกใช้ไปแล้ว" คำตอบคือ **1.a — สร้างเลย**

**สิ่งที่ต้องแก้ให้ตรงกับความจริงก่อน**: เลข 34,000-แถว/20ms/localStorage-quota ด้านล่างนี้ (เดิม
เขียนไว้ตอน `src/data/accountRepository.ts` ยังเป็น backend จริง) **อ้างอิง backend ที่ dormant ไป
แล้ว** — `accountRepository.shared.ts:6` ยืนยันว่า `useAuth.ts` เลิก import
`accountRepository.ts` ตั้งแต่ก่อนสร้างกฎนี้อีก backend จริงที่ผู้เล่นใช้งานคือ
`accountRepository.supabase.ts` (Postgres ผ่าน Supabase) มาหลายเดือนแล้ว — เลขและกลไกที่ยกมา
ด้านล่าง (JSON.stringify ทั้งก้อน, quota เบราว์เซอร์) **ไม่ใช่กลไกที่ Postgres มี** แต่คำตัดสิน
1.a ยังยืนตามเดิม: build the archive pattern (hot/archive split, never-delete) ไม่ใช่เพราะ
Postgres จะพังแบบเดียวกับ localStorage แต่เพราะกฎเดียวกันนี้ (ground ใน double-entry ledger +
PCI DSS 10.5.1) เป็นกติกาที่ถูกต้องสำหรับ ledger ทางการเงินของเกมไม่ว่าจะรันบน storage ชนิดไหน

**สิ่งที่สร้างจริง** (migration ด้านบน — รายละเอียดเต็มอยู่ในไฟล์นั้น):

- `profiles.lifetime_gold_earned` / `lifetime_gem_earned` — ยอดสะสมตลอดชีพ เพิ่มทุกครั้งที่
  `earn_gold`/`redeem_coupon`/`grant_gold_admin` เครดิตจริง (ไม่ลดตอนใช้จ่าย/ย้ายคลัง) backfill
  จากประวัติเดิมแล้ว
- `public.currency_transactions_archive` — ตารางเย็น shape เดียวกับตารางร้อน + `archived_at`
  RLS แบบเดียวกับตารางร้อน
- `public.archive_currency_transactions(interval)` — ย้ายแถวที่เก่ากว่า cutoff (ดีฟอลต์ 12
  เดือน) ออกจากตารางร้อน **ยกเว้น `source in ('coupon','topup')` เด็ดขาดไม่ว่าจะเก่าแค่ไหน**
  รัน cron รายเดือน (`archive-currency-transactions`, วันที่ 1 ตี 4)
- `accountRepository.shared.ts`'s `CurrencyTransaction` JSDoc + `accountRepository.supabase.
ts`'s `getTransactions` JSDoc แก้แล้วให้บอกตรง ๆ ว่าคืนเฉพาะช่วงร้อน ไม่ใช่ประวัติทั้งหมด

`accountRepository.ts` (localStorage, dormant) **ไม่ถูกแตะ** — comment หัวไฟล์เดิมของมันยังจริง
อยู่ (in-memory array เก็บทุกอย่างไม่มีเพดานจริง ๆ) เพราะไม่มีระบบเก็บถาวรมาแตะมันเลย

## เลขเดิม (สำหรับ backend localStorage ที่ dormant ไปแล้ว — เก็บไว้เป็นบริบทว่าทำไมกฎนี้ถือกำเนิด)

`CurrencyTransaction[]` ใน `src/data/accountRepository.ts` ไม่มีเพดานและไม่ถูกตัดทิ้งเลย
ตัวเลขที่วัดได้จริง (จำลอง schema เดียวกันเป๊ะ): 20,000 รายการ ≈ 2.9MB ≈ **~20ms ต่อการเขียนหนึ่งครั้ง**
เพราะทุก mutation `JSON.stringify` ฐานข้อมูลทั้งก้อนใหม่หมด · โควตา `localStorage` ปกติ 5–10MB
บัญชีเดียวชนเพดานราว **34,000 รายการ**

## เงื่อนไขที่ทำให้ต้องลงมือ (จุดแล้ว — ดูสถานะปัจจุบันด้านบน)

**วันที่ `earnGold` หรือ `grantItem` ถูกต่อเข้ากับเควส/ดรอป/ผลการต่อสู้ที่ยิงอัตโนมัติ**
ให้สร้างระบบเก็บถาวรใน PR เดียวกันนั้น ไม่ใช่ตามมาทีหลัง — เพราะพอมันเริ่มโตแล้ว
ข้อมูลที่ล้นออกมาก่อนระบบจะมาถึงคือข้อมูลที่หายไปแล้ว

## รูปแบบที่ต้องใช้ตอนลงมือ (ไม่ใช่ทางเลือก)

**เก็บถาวร ไม่ใช่ลบทิ้ง** — ทั้งสองมาตรฐานที่อ้างอิงพูดตรงกัน:

- **บัญชีคู่ (double-entry general ledger)** — รายการที่ลงบัญชีแล้วไม่มีการลบ มีแต่ปิดงวด
  แล้วยกยอดไปงวดถัดไป รายละเอียดเก่าย้ายไปคลัง ไม่ใช่ทำลาย · หัวไฟล์ `accountRepository.ts`
  เขียน schema `currency_transactions(...)` แบบตำราบัญชีไว้เองอยู่แล้ว และกติกา
  "ไม่มีฟังก์ชันไหนตั้งค่าทอง/หยกตรง ๆ ได้" ก็คือหลักการเดียวกันนี้
- **PCI DSS v4.0 ข้อ 10.5.1** — เก็บ audit log ≥12 เดือน โดย 3 เดือนล่าสุดต้องเรียกดูได้ทันที
  ที่เหลือย้ายไปคลังได้แต่ห้ามลบ (ตรวจสดกับแหล่งอ้างอิง 2026-08-07)

  ข้อนี้**ไม่ได้บังคับใช้กับโปรเจกต์นี้** — ไม่มีข้อมูลบัตร ไม่มี payment gateway จริง
  (`SECURITY.md` ระบุไว้) ที่ยกมาเพราะสองมาตรฐานคนละสายมาบรรจบที่รูปแบบเดียวกันคือ
  ร้อน/เย็นแยกกัน และห้ามลบ — ไม่ใช่กฎที่เราคิดเอง

**ห้ามใช้ `.slice()` แบบ `battleHistory`** — `battleHistory` เป็นรายการโชว์ผลการต่อสู้ล่าสุด
ไม่มี source/refId ไม่มีสัญญาว่าตรวจสอบย้อนหลังได้ คนละชนิดข้อมูลกันคนละเรื่อง

**รายการที่ห้ามตัดเด็ดขาด: `source === 'coupon'` และ `'topup'`**

`redeemCoupon` อ่าน `transactions` ทั้งอาร์เรย์เพื่อกันแลกซ้ำ และไล่ทุกบัญชีเพื่อนับ
`maxRedemptions` (ตรวจยืนยันแล้วที่ `accountRepository.ts`) เพดานแบบนับจำนวนเฉย ๆ
จะทำให้ผู้เล่นดันคูปองที่เคยแลกแล้วให้หลุดออกจากหน้าต่างด้วยรายการธรรมดา แล้วกลับมาแลกซ้ำได้
— เปิดช่องโกงด้วยการ "แก้" ปัญหาประสิทธิภาพ ทั้งสี่ที่นั่งชี้จุดนี้ตรงกัน

**ยอดสะสมต้องกระทบยอดได้เสมอ** — เก็บยอดรวมตลอดชีพไว้ต่างหาก เพื่อที่ต่อให้รายละเอียด
ย้อนไปไม่ถึงต้นทาง ตัวเลขรวมก็ยังตรง

## สิ่งที่ต้องแก้พร้อมกันตอนลงมือ (ทำแล้ว 2026-08-09)

`accountRepository.shared.ts`'s `CurrencyTransaction` JSDoc + `accountRepository.supabase.ts`'s
`getTransactions` JSDoc แก้แล้ว — ทั้งคู่บอกตรง ๆ ว่าคืนเฉพาะช่วงร้อน (<12 เดือน) ตัวเลขที่ตรง
เสมอไม่ว่ารายการย่อยจะถูกย้ายไปคลังกี่รอบคือ `profiles.lifetime_gold_earned`/
`lifetime_gem_earned` ไม่ใช่ผลรวมจาก `getTransactions` (`accountRepository.ts`'s comment เดิม
ไม่ต้องแก้ — ดู "สถานะปัจจุบัน" ด้านบน มันยัง honest กับสิ่งที่ตัวเองทำจริงอยู่ เพราะไม่มีระบบ
เก็บถาวรมาแตะ backend นั้นเลย)

## สิ่งที่จะพลิกคำตัดสินนี้

- `topUpGold`/`topUpGems` ต่อ payment gateway จริงเมื่อไหร่ รายการ `topup` กลายเป็นหลักฐาน
  ทางการเงินจริง แล้ว PCI DSS เลิกเป็นการเปรียบเทียบหลวม ๆ กลายเป็นเกณฑ์ที่ใกล้ของจริง
  — ตอนนั้นต้องคุยกันใหม่โดยมีคนที่รู้กฎหมายจริง ไม่ใช่เดาเอง
- มีหน้าจอประวัติธุรกรรมที่ผู้เล่นใช้จริง (ตอนนี้ `getTransactions` ไม่มีผู้เรียกเลย)
  — นั่นเป็นเหตุผลเชิงผลิตภัณฑ์ให้ขยายหน้าต่างที่เก็บ ไม่ใช่เหตุผลให้เก็บทุกอย่างตลอดไป
