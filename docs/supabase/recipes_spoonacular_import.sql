-- Run this after docs/supabase/recipes.sql to enable Spoonacular imports.
-- This migration keeps existing RLS policies intact.

alter table public.recipes
add column if not exists spoonacular_id integer,
add column if not exists source_url text,
add column if not exists imported_from text,
add column if not exists nutrition jsonb default '{}'::jsonb;

create unique index if not exists recipes_user_spoonacular_unique
on public.recipes (user_id, spoonacular_id)
where spoonacular_id is not null;
