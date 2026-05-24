-- Run this after docs/supabase/recipes.sql and docs/supabase/recipes_spoonacular_import.sql.
-- This enables the Scan Recipe flow while preserving existing recipe and Spoonacular behavior.

alter table public.recipes
add column if not exists import_source text default 'manual',
add column if not exists original_image_url text,
add column if not exists original_image_path text,
add column if not exists extraction_confidence numeric,
add column if not exists raw_extracted_text text,
add column if not exists extraction_notes jsonb,
add column if not exists source_type text,
add column if not exists scan_model text;

update public.recipes
set import_source = case
  when import_source is not null then import_source
  when imported_from = 'spoonacular' or spoonacular_id is not null then 'spoonacular'
  else 'manual'
end;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-scans',
  'recipe-scans',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own recipe scans" on storage.objects;
create policy "Users can view own recipe scans"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recipe-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own recipe scans" on storage.objects;
create policy "Users can upload own recipe scans"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own recipe scans" on storage.objects;
create policy "Users can update own recipe scans"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'recipe-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own recipe scans" on storage.objects;
create policy "Users can delete own recipe scans"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);
