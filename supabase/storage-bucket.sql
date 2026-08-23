-- ============================================
-- MediChain Verify — Storage Bucket Setup
-- Run this in Supabase SQL Editor AFTER migration.sql
-- ============================================

-- 1. Create the storage bucket for medicine images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medicine-images',
  'medicine-images',
  true,
  5242880,  -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- 2. Allow authenticated users to upload images to their own folder
create policy "Users can upload medicine images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'medicine-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Allow anyone to view medicine images (public bucket)
create policy "Public can view medicine images"
  on storage.objects for select
  to public
  using (bucket_id = 'medicine-images');

-- 4. Allow users to update/overwrite their own images
create policy "Users can update own medicine images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'medicine-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Allow users to delete their own images
create policy "Users can delete own medicine images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'medicine-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
