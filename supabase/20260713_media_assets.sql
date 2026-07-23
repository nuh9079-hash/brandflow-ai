create extension if not exists pgcrypto;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  profile_id uuid null references public.user_profiles(id) on delete set null,
  type text not null check (type in ('image', 'video', 'logo')),
  name text not null,
  mime_type text not null,
  size bigint not null check (size > 0),
  width integer null,
  height integer null,
  duration numeric null,
  storage_path text null,
  storage_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_clerk_user_id_idx on public.media_assets (clerk_user_id);
create index if not exists media_assets_profile_id_idx on public.media_assets (profile_id);
create index if not exists media_assets_type_idx on public.media_assets (type);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at desc);

create or replace function public.set_media_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at
before update on public.media_assets
for each row
execute function public.set_media_assets_updated_at();

alter table public.media_assets enable row level security;

drop policy if exists "Users can read own media assets" on public.media_assets;
create policy "Users can read own media assets"
on public.media_assets
for select
using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own media assets" on public.media_assets;
create policy "Users can insert own media assets"
on public.media_assets
for insert
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can update own media assets" on public.media_assets;
create policy "Users can update own media assets"
on public.media_assets
for update
using ((auth.jwt() ->> 'sub') = clerk_user_id)
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can delete own media assets" on public.media_assets;
create policy "Users can delete own media assets"
on public.media_assets
for delete
using ((auth.jwt() ->> 'sub') = clerk_user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brandflow-media',
  'brandflow-media',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own media files" on storage.objects;
create policy "Users can read own media files"
on storage.objects
for select
using (
  bucket_id = 'brandflow-media'
  and (storage.foldername(name))[1] = 'media'
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
);

drop policy if exists "Users can upload own media files" on storage.objects;
create policy "Users can upload own media files"
on storage.objects
for insert
with check (
  bucket_id = 'brandflow-media'
  and (storage.foldername(name))[1] = 'media'
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
);

drop policy if exists "Users can update own media files" on storage.objects;
create policy "Users can update own media files"
on storage.objects
for update
using (
  bucket_id = 'brandflow-media'
  and (storage.foldername(name))[1] = 'media'
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
)
with check (
  bucket_id = 'brandflow-media'
  and (storage.foldername(name))[1] = 'media'
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
);

drop policy if exists "Users can delete own media files" on storage.objects;
create policy "Users can delete own media files"
on storage.objects
for delete
using (
  bucket_id = 'brandflow-media'
  and (storage.foldername(name))[1] = 'media'
  and (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
);
