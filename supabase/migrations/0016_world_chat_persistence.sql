-- World Chat server-authoritative persistence migration
-- Reference: docs/agent-blueprint/28-social-communication-system.md
-- Master Blueprint §7.5: Data ownership - server-authoritative (Supabase, RLS-protected)

create table public.world_chat (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  text text not null check (char_length(text) > 0 and char_length(text) <= 500),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.world_chat enable row level security;

-- Policies
create policy "Anyone can read chat messages" on public.world_chat
  for select to authenticated using (true);

create policy "Players can post chat messages as themselves" on public.world_chat
  for insert to authenticated with check (
    profile_id = auth.uid()
    and author_name = (select name from public.profiles where id = auth.uid())
  );

-- Enable realtime for world_chat table
alter publication supabase_realtime add table public.world_chat;
