-- Make sure to run this in Supabase SQL Editor

-- 1. Create the bucket (Public access enabled)
insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts if re-running
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Anon Upload Dev" on storage.objects;

-- 3. Policy: Public Read Access (Anyone can view images)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'player-images' );

-- 4. Policy: Authenticated Upload (Production rule)
create policy "Authenticated Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'player-images'
    and auth.role() = 'authenticated'
  );

-- 5. Policy: Anon Upload (TEMPORARY: FOR DEV TESTING ONLY)
-- Allows unauthenticated users to upload. Remove this in production!
create policy "Anon Upload Dev"
  on storage.objects for insert
  with check (
    bucket_id = 'player-images'
    and auth.role() = 'anon'
  );
