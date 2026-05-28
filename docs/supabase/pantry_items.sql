-- Run this in the Supabase SQL editor for the PlatePlan project.
-- This creates the Pantry MVP table and RLS policies.

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid,
  name text not null,
  normalized_name text not null,
  quantity numeric,
  unit text,
  category text,
  location text,
  notes text,
  is_staple boolean not null default false,
  low_stock_threshold numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.pantry_items enable row level security;

drop policy if exists "Users can view own pantry items" on public.pantry_items;
create policy "Users can view own pantry items"
on public.pantry_items
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own pantry items" on public.pantry_items;
create policy "Users can create own pantry items"
on public.pantry_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own pantry items" on public.pantry_items;
create policy "Users can update own pantry items"
on public.pantry_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pantry items" on public.pantry_items;
create policy "Users can delete own pantry items"
on public.pantry_items
for delete
using (auth.uid() = user_id);

create index if not exists pantry_items_user_idx
on public.pantry_items (user_id);

create index if not exists pantry_items_user_normalized_name_idx
on public.pantry_items (user_id, normalized_name);

create index if not exists pantry_items_user_location_idx
on public.pantry_items (user_id, location);

create index if not exists pantry_items_user_category_idx
on public.pantry_items (user_id, category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pantry_items_updated_at on public.pantry_items;
create trigger set_pantry_items_updated_at
before update on public.pantry_items
for each row
execute function public.set_updated_at();
