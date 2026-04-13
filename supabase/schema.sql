create table if not exists public.leaderboard_entries (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  coins integer not null default 0,
  level integer not null default 1,
  skin text not null default 'classic',
  created_at timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;

create policy "leaderboard_select_public"
on public.leaderboard_entries
for select
to anon
using (true);

create policy "leaderboard_insert_public"
on public.leaderboard_entries
for insert
to anon
with check (true);
