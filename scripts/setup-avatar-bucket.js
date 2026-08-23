import pg from 'pg';

const { Client } = pg;

async function setupAvatarBucket() {
  const client = new Client({
    host: 'db.ibzdlyhescujpjxqvzvp.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Chi65cken@???',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    // 1. Create storage buckets for avatars & medicine images
    await client.query(`
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values 
        ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
        ('medicine-images', 'medicine-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      on conflict (id) do update set public = true;
    `);
    console.log('✅ Storage buckets "avatars" and "medicine-images" configured.');

    // 2. Set storage policies
    await client.query(`
      drop policy if exists "Public can view avatars" on storage.objects;
      create policy "Public can view avatars"
        on storage.objects for select
        using (bucket_id in ('avatars', 'medicine-images'));

      drop policy if exists "Users can upload avatars" on storage.objects;
      create policy "Users can upload avatars"
        on storage.objects for insert
        to authenticated
        with check (bucket_id in ('avatars', 'medicine-images'));

      drop policy if exists "Users can update avatars" on storage.objects;
      create policy "Users can update avatars"
        on storage.objects for update
        to authenticated
        using (bucket_id in ('avatars', 'medicine-images'));

      drop policy if exists "Users can delete avatars" on storage.objects;
      create policy "Users can delete avatars"
        on storage.objects for delete
        to authenticated
        using (bucket_id in ('avatars', 'medicine-images'));
    `);
    console.log('✅ Storage bucket policies for avatars applied.');

    // 3. Ensure profiles table has necessary columns
    await client.query(`
      alter table public.profiles add column if not exists bio text;
      alter table public.profiles add column if not exists phone text;
      alter table public.profiles add column if not exists is_active boolean default true;
      alter table public.profiles add column if not exists avatar_url text;
    `);
    console.log('✅ Profiles table columns verified.');
  } catch (err) {
    console.error('❌ Error setting up avatar bucket:', err);
  } finally {
    await client.end();
  }
}

setupAvatarBucket();
