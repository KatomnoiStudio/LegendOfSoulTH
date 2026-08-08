-- Blueprint divergence #9/#11: World Chat is shared, server-authoritative data.
-- The client may read the global feed, but cannot insert rows directly or choose author/time.

create table public.world_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  text text not null check (char_length(text) between 1 and 280 and text = btrim(text)),
  created_at timestamptz not null default now()
);

create index world_chat_messages_recent
  on public.world_chat_messages (created_at desc, id desc);

alter table public.world_chat_messages enable row level security;

create policy "authenticated read world chat"
on public.world_chat_messages
for select
to authenticated
using (true);

-- Data API access and RLS are separate. Authenticated clients may read; writes have no table
-- grant/policy and must pass through post_world_chat_message below.
revoke all on table public.world_chat_messages from public, anon, authenticated;
grant select on table public.world_chat_messages to authenticated;

create or replace function public.post_world_chat_message(p_text text)
returns table (id uuid, author_name text, text text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := btrim(p_text);
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบก่อนส่งข้อความ';
  end if;
  if char_length(v_text) < 1 or char_length(v_text) > 280 then
    raise exception 'ข้อความต้องมีความยาว 1–280 ตัวอักษร';
  end if;

  perform public.check_and_log_rpc_rate_limit('post_world_chat_message', 10, 60);

  select coalesce(nullif(btrim(p.name), ''), 'นักเดินทาง')
  into v_name
  from public.profiles p
  where p.id = auth.uid();

  if v_name is null then
    raise exception 'ไม่พบโปรไฟล์ผู้ส่งข้อความ';
  end if;

  return query
    insert into public.world_chat_messages (author_id, author_name, text)
    values (auth.uid(), left(v_name, 60), v_text)
    returning world_chat_messages.id,
      world_chat_messages.author_name,
      world_chat_messages.text,
      world_chat_messages.created_at;
end;
$$;

revoke execute on function public.post_world_chat_message(text) from public, anon;
grant execute on function public.post_world_chat_message(text) to authenticated;

-- Postgres Changes respects the table's SELECT RLS policy for authenticated subscribers.
alter publication supabase_realtime add table public.world_chat_messages;
