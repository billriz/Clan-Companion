-- Run this in the Supabase SQL editor for the GravyTime project.
-- This creates the Phase 3 weekly meal planner table and RLS policies.

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  planned_date date not null,
  meal_type text not null,
  created_at timestamp with time zone default now()
);

alter table public.meal_plans enable row level security;

drop policy if exists "Users can view own meal plans" on public.meal_plans;
create policy "Users can view own meal plans"
on public.meal_plans
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own meal plans" on public.meal_plans;
create policy "Users can create own meal plans"
on public.meal_plans
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own meal plans" on public.meal_plans;
create policy "Users can delete own meal plans"
on public.meal_plans
for delete
using (auth.uid() = user_id);

create index if not exists meal_plans_user_date_idx
on public.meal_plans (user_id, planned_date);

create index if not exists meal_plans_recipe_idx
on public.meal_plans (recipe_id);
