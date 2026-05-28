-- Run this in the Supabase SQL editor for the PlatePlan project.
-- This logs grocery export attempts (success and failure).

create table if not exists public.shopping_list_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  provider text not null default 'instacart',
  provider_url text,
  status text not null,
  item_count integer,
  error_message text,
  created_at timestamptz default now()
);

alter table public.shopping_list_exports enable row level security;

drop policy if exists "Users can view own shopping list exports" on public.shopping_list_exports;
create policy "Users can view own shopping list exports"
on public.shopping_list_exports
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own shopping list exports" on public.shopping_list_exports;
create policy "Users can create own shopping list exports"
on public.shopping_list_exports
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own shopping list exports" on public.shopping_list_exports;
create policy "Users can update own shopping list exports"
on public.shopping_list_exports
for update
using (false)
with check (false);

drop policy if exists "Users can delete own shopping list exports" on public.shopping_list_exports;
create policy "Users can delete own shopping list exports"
on public.shopping_list_exports
for delete
using (false);

create index if not exists shopping_list_exports_user_created_idx
on public.shopping_list_exports (user_id, created_at desc);

create index if not exists shopping_list_exports_list_idx
on public.shopping_list_exports (shopping_list_id, created_at desc);
