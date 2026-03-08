-- ============================================================
-- Supabase — user_preferences table
-- Run this in the Supabase SQL editor.
-- ============================================================

create table if not exists user_preferences (
  user_id       uuid primary key references auth.users on delete cascade,
  default_map_style text not null default 'outdoors',
  updated_at    timestamptz default now()
);

-- RLS
alter table user_preferences enable row level security;

create policy "Users can read their own preferences"
  on user_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can upsert their own preferences"
  on user_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own preferences"
  on user_preferences for update
  to authenticated
  using (user_id = auth.uid());
