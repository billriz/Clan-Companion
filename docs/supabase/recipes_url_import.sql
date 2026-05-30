-- Run this after docs/supabase/recipes.sql and other recipe import migrations.
-- This enables Import Recipe from URL metadata while preserving existing RLS policies.

alter table public.recipes
add column if not exists source_name text,
add column if not exists imported_at timestamp with time zone,
add column if not exists external_image_url text;

update public.recipes
set imported_at = coalesce(imported_at, created_at)
where imported_from is not null
  and imported_at is null;
