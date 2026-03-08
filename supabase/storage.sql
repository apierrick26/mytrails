-- ============================================================
-- Supabase Storage — bucket "photos" + RLS policies
-- ============================================================
-- Run this in the Supabase SQL editor (or use the dashboard).
-- The bucket must be created BEFORE the policies below.
-- ============================================================

-- 1. Create the private bucket (via the Storage API — not SQL)
--    Dashboard → Storage → New bucket → name: "photos", Public: OFF
--    OR via the management API:
--
--    insert into storage.buckets (id, name, public)
--    values ('photos', 'photos', false);

-- 2. RLS policy: users can only upload to their own folder
--    Path convention: {user_id}/{activity_id}/{filename}
create policy "Users can upload their own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. RLS policy: users can read their own photos (for signed URL generation)
create policy "Users can read their own photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. RLS policy: users can delete their own photos
create policy "Users can delete their own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. RLS policy: users can update their own photos (e.g. metadata)
create policy "Users can update their own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
