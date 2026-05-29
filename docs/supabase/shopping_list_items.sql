-- Run this in the Supabase SQL editor for the GravyTime project.
-- This creates the Phase 4 shopping list table and RLS policies.

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  unit text,
  category text default 'Other',
  checked boolean default false,
  source text default 'manual',
  week_start date,
  created_at timestamp with time zone default now()
);

alter table public.shopping_list_items enable row level security;

drop policy if exists "Users can view own shopping list items" on public.shopping_list_items;
create policy "Users can view own shopping list items"
on public.shopping_list_items
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own shopping list items" on public.shopping_list_items;
create policy "Users can create own shopping list items"
on public.shopping_list_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own shopping list items" on public.shopping_list_items;
create policy "Users can update own shopping list items"
on public.shopping_list_items
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own shopping list items" on public.shopping_list_items;
create policy "Users can delete own shopping list items"
on public.shopping_list_items
for delete
using (auth.uid() = user_id);

create index if not exists shopping_list_items_user_week_idx
on public.shopping_list_items (user_id, week_start);

create index if not exists shopping_list_items_user_week_source_idx
on public.shopping_list_items (user_id, week_start, source);
