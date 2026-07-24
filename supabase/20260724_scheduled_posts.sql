create extension if not exists pgcrypto;

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  profile_id uuid null references public.user_profiles(id) on delete set null,
  media_asset_id uuid null references public.media_assets(id) on delete set null,
  platform text not null check (platform in ('instagram', 'facebook', 'twitter', 'tiktok', 'linkedin')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  title text not null,
  caption text not null default '',
  scheduled_at timestamptz null,
  timezone text not null default 'UTC',
  failure_reason text null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_posts_clerk_user_id_idx on public.scheduled_posts (clerk_user_id);
create index if not exists scheduled_posts_scheduled_at_idx on public.scheduled_posts (scheduled_at);
create index if not exists scheduled_posts_platform_idx on public.scheduled_posts (platform);
create index if not exists scheduled_posts_status_idx on public.scheduled_posts (status);
create index if not exists scheduled_posts_media_asset_id_idx on public.scheduled_posts (media_asset_id);

create or replace function public.set_scheduled_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scheduled_posts_updated_at on public.scheduled_posts;
create trigger set_scheduled_posts_updated_at
before update on public.scheduled_posts
for each row
execute function public.set_scheduled_posts_updated_at();

alter table public.scheduled_posts enable row level security;

drop policy if exists "Users can read own scheduled posts" on public.scheduled_posts;
create policy "Users can read own scheduled posts"
on public.scheduled_posts
for select
using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own scheduled posts" on public.scheduled_posts;
create policy "Users can insert own scheduled posts"
on public.scheduled_posts
for insert
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can update own scheduled posts" on public.scheduled_posts;
create policy "Users can update own scheduled posts"
on public.scheduled_posts
for update
using ((auth.jwt() ->> 'sub') = clerk_user_id)
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can delete own scheduled posts" on public.scheduled_posts;
create policy "Users can delete own scheduled posts"
on public.scheduled_posts
for delete
using ((auth.jwt() ->> 'sub') = clerk_user_id);
