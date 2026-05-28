-- Run this in the Supabase SQL editor for the PlatePlan project.
-- This creates user-owned weekly shopping lists with stable UUID ids.

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  created_at timestamp with time zone default now(),
  unique (user_id, week_start)
);

alter table public.shopping_lists enable row level security;

drop policy if exists "Users can view own shopping lists" on public.shopping_lists;
create policy "Users can view own shopping lists"
on public.shopping_lists
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own shopping lists" on public.shopping_lists;
create policy "Users can create own shopping lists"
on public.shopping_lists
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own shopping lists" on public.shopping_lists;
create policy "Users can update own shopping lists"
on public.shopping_lists
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own shopping lists" on public.shopping_lists;
create policy "Users can delete own shopping lists"
on public.shopping_lists
for delete
using (auth.uid() = user_id);

create index if not exists shopping_lists_user_week_idx
on public.shopping_lists (user_id, week_start);
