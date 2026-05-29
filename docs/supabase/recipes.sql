-- Run this in the Supabase SQL editor for the GravyTime project.
-- This creates the Phase 2 recipe table, RLS policies, and public image bucket.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  prep_time integer,
  cook_time integer,
  servings integer,
  difficulty text default 'Easy',
  category text,
  tags text[],
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.recipes enable row level security;

drop policy if exists "Users can view own recipes" on public.recipes;
create policy "Users can view own recipes"
on public.recipes
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own recipes" on public.recipes;
create policy "Users can create own recipes"
on public.recipes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipes" on public.recipes;
create policy "Users can update own recipes"
on public.recipes
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own recipes" on public.recipes;
create policy "Users can delete own recipes"
on public.recipes
for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view recipe images" on storage.objects;
create policy "Anyone can view recipe images"
on storage.objects
for select
using (bucket_id = 'recipe-images');

drop policy if exists "Users can upload own recipe images" on storage.objects;
create policy "Users can upload own recipe images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own recipe images" on storage.objects;
create policy "Users can update own recipe images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own recipe images" on storage.objects;
create policy "Users can delete own recipe images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
