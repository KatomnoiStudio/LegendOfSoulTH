-- Legend of Soul-TH — schema เริ่มต้นสำหรับย้ายจาก localStorage มา Supabase
--
-- อ้างอิงจากคอมเมนต์หัวไฟล์ src/data/accountRepository.ts (schema ที่เขียนไว้ล่วงหน้าตั้งแต่ตอนออกแบบ
-- ระบบ client-only) — ใช้ auth.users ของ Supabase Auth แทน accounts(password_hash/password_salt) เดิม
--
-- กติกาสำคัญที่ต้องคงไว้เป๊ะจากระบบเดิม: gold มาจาก source 'quest'/'drop'/'topup' เท่านั้น,
-- gem มาจาก 'topup'/'coupon' เท่านั้น, ไม่มีทางเซตทอง/หยกตรง ๆ — ที่นี่บังคับที่ชั้น RPC function
-- (SECURITY DEFINER) แทนชั้น TypeScript เดิม ผู้เล่นเรียก insert ตรงเข้า currency_transactions
-- ไม่ได้เลย (ไม่มี INSERT policy ให้ role authenticated) ต้องผ่านฟังก์ชันเท่านั้น

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uid text unique not null, -- รหัสผู้เล่นสาธารณะ 10 หลัก (ดู src/game/uid.ts)
  name text not null default '',
  title text not null default 'ผู้จาริกหน้าใหม่',
  level int not null default 1,
  exp int not null default 0,
  exp_to_next int not null default 100,
  gold int not null default 0,
  gem int not null default 0,
  frame_id text not null default 'arcane',
  flags jsonb not null default '{}'::jsonb,
  defeated_npc_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.owned_characters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  character_id text not null,
  level int not null default 1,
  exp int not null default 0,
  exp_to_next int not null default 500,
  obtained_at timestamptz not null default now(),
  unique (profile_id, character_id)
);

create table public.team_slots (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  slot_index int not null check (slot_index >= 0 and slot_index < 4),
  character_id text,
  primary key (profile_id, slot_index)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  quantity int not null check (quantity > 0),
  obtained_from text not null,
  obtained_at timestamptz not null default now(),
  unique (profile_id, item_id)
);

create table public.friends (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  friend_uid text not null,
  name text not null,
  level int not null,
  title text not null,
  added_at timestamptz not null default now(),
  primary key (profile_id, friend_uid)
);

create table public.currency_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null check (currency in ('gold', 'gem')),
  source text not null check (source in ('quest', 'drop', 'topup', 'coupon')),
  amount int not null check (amount > 0),
  ref_id text,
  created_at timestamptz not null default now()
);

-- currency ต้องมาจาก source ที่ถูกต้องต่อสกุลเท่านั้น (กติกาเดียวกับ accountRepository.ts เดิม)
alter table public.currency_transactions
  add constraint currency_source_match check (
    (currency = 'gold' and source in ('quest', 'drop', 'topup'))
    or (currency = 'gem' and source in ('topup', 'coupon'))
  );

create table public.battle_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opponent text not null,
  result text not null check (result in ('win', 'lose')),
  duration_ms int,
  finished_at timestamptz not null default now()
);

-- ── Row Level Security: ทุกตารางอ่าน/เขียนได้เฉพาะแถวของตัวเอง ────────────────
-- currency_transactions ไม่มี insert policy เลยโดยตั้งใจ — เขียนได้ทางเดียวคือผ่าน
-- RPC function ด้านล่าง (SECURITY DEFINER) เพื่อบังคับกติกา source/amount ที่ชั้น DB จริง ๆ
-- ไม่ใช่แค่ชั้น client ที่แก้ผ่าน DevTools ได้เหมือนระบบ localStorage เดิม

alter table public.profiles enable row level security;
alter table public.owned_characters enable row level security;
alter table public.team_slots enable row level security;
alter table public.inventory_items enable row level security;
alter table public.friends enable row level security;
alter table public.currency_transactions enable row level security;
alter table public.battle_history enable row level security;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

create policy "own characters" on public.owned_characters for select using (auth.uid() = profile_id);
create policy "own team slots select" on public.team_slots for select using (auth.uid() = profile_id);
create policy "own team slots write" on public.team_slots for all using (auth.uid() = profile_id);
create policy "own inventory select" on public.inventory_items for select using (auth.uid() = profile_id);
create policy "own friends select" on public.friends for select using (auth.uid() = profile_id);
create policy "own friends write" on public.friends for all using (auth.uid() = profile_id);
create policy "own transactions select" on public.currency_transactions for select using (auth.uid() = profile_id);
create policy "own battle history select" on public.battle_history for select using (auth.uid() = profile_id);

-- ── RPC functions: จุดเดียวที่แก้ทอง/หยก/ไอเทมได้ ─────────────────────────────
-- SECURITY DEFINER = รันด้วยสิทธิ์เจ้าของฟังก์ชัน (postgres) ไม่ใช่สิทธิ์ผู้เรียก
-- จึง insert ลง currency_transactions ได้แม้ตารางนั้นไม่มี insert policy ให้ authenticated

create or replace function public.earn_gold(p_source text, p_amount int, p_ref_id text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if p_amount <= 0 then
    raise exception 'จำนวนทองไม่ถูกต้อง';
  end if;
  if p_source not in ('quest', 'drop', 'topup') then
    raise exception 'แหล่งที่มาทองไม่ถูกต้อง: %', p_source;
  end if;

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values (auth.uid(), 'gold', p_source, p_amount, p_ref_id);

  update public.profiles set gold = gold + p_amount where id = auth.uid()
  returning * into result;

  return result;
end;
$$;

create or replace function public.redeem_coupon(p_code text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  v_code text := upper(trim(p_code));
  v_gem int;
  v_already_redeemed boolean;
begin
  -- ตารางคูปองแบบง่าย ฝัง hardcode ไว้ก่อนเหมือนฝั่ง client เดิม (COUPONS ใน accountRepository.ts)
  -- ย้ายไปตารางจริงทีหลังได้ถ้าต้องเพิ่มโค้ดบ่อย
  if v_code = 'WELCOME2026' then
    v_gem := 50;
  else
    raise exception 'โค้ดนี้ไม่ถูกต้องหรือหมดอายุแล้ว';
  end if;

  select exists(
    select 1 from public.currency_transactions
    where profile_id = auth.uid() and source = 'coupon' and ref_id = v_code
  ) into v_already_redeemed;

  if v_already_redeemed then
    raise exception 'ใช้โค้ดนี้ไปแล้ว';
  end if;

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values (auth.uid(), 'gem', 'coupon', v_gem, v_code);

  update public.profiles set gem = gem + v_gem where id = auth.uid()
  returning * into result;

  return result;
end;
$$;

create or replace function public.grant_item(p_item_id text, p_quantity int, p_source text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity <= 0 then
    raise exception 'จำนวนไอเทมไม่ถูกต้อง';
  end if;
  if p_source not in ('quest', 'drop') then
    raise exception 'แหล่งที่มาไอเทมไม่ถูกต้อง: %', p_source;
  end if;

  insert into public.inventory_items (profile_id, item_id, quantity, obtained_from)
  values (auth.uid(), p_item_id, p_quantity, p_source)
  on conflict (profile_id, item_id)
  do update set quantity = public.inventory_items.quantity + excluded.quantity;

  return (select p.* from public.profiles p where id = auth.uid());
end;
$$;

-- topUpGold/topUpGems ("เติมเงินจริง") ยังไม่ต่อ payment gateway จริงเหมือนฝั่ง client เดิม —
-- ไม่ทำ RPC ให้ตอนนี้โดยตั้งใจ เพิ่มเมื่อมีการต่อระบบชำระเงินที่ตรวจสอบได้จริงแล้วเท่านั้น
-- (ดู fork issue #19 — ธุรกิจ premium one-time ยังอยู่ระหว่างตัดสินใจ)

-- ── Trigger: สร้าง profile อัตโนมัติเมื่อสมัครผ่าน Supabase Auth ────────────────
-- uid สาธารณะ 10 หลักต้องคำนวณฝั่ง client ก่อนเรียก signUp (ผ่าน raw_user_meta_data)
-- เพราะฟังก์ชันนี้รันใน DB ไม่มี generateUid() ของ src/game/uid.ts ให้เรียก

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, uid, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'uid', substr(new.id::text, 1, 10)),
    coalesce(new.raw_user_meta_data->>'name', '')
  );

  insert into public.owned_characters (profile_id, character_id)
  values (new.id, 'monkey-king');

  insert into public.team_slots (profile_id, slot_index, character_id)
  values (new.id, 0, 'monkey-king'), (new.id, 1, null), (new.id, 2, null), (new.id, 3, null);

  update public.profiles set gold = 500, gem = 20 where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
