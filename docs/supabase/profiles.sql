-- Run this in the Supabase SQL editor for the PlatePlan project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  preferred_grocery_provider text default 'instacart',
  preferred_grocery_store_name text default 'Woodman''s',
  preferred_grocery_store_notes text,
  created_at timestamp with time zone default now()
);

alter table public.profiles
  add column if not exists preferred_grocery_provider text default 'instacart',
  add column if not exists preferred_grocery_store_name text default 'Woodman''s',
  add column if not exists preferred_grocery_store_notes text;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);
