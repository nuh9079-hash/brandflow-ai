create extension if not exists pgcrypto;

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid()
  clerk_user_id text not null,
  profile_id uuid null references public.user_profiles(id) on delete set null,
  source_content_id text null,
  media_asset_id uuid null references public.media_assets(id) on delete set null,
  name text not null,
  selected_platforms jsonb not null default '[]'::jsonb,
  caption text not null default '',
  hashtags jsonb not null default '[]'::jsonb,
  platform_content jsonb not null default '{}'::jsonb,
  platform_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drafts_user_updated_idx on public.drafts (clerk_user_id, updated_at desc);
create index if not exists drafts_profile_idx on public.drafts (profile_id);
create index if not exists drafts_media_asset_idx on public.drafts (media_asset_id);

alter table public.drafts enable row level security;
drop policy if exists "Users can read own drafts" on public.drafts;
create policy "Users can read own drafts" on public.drafts for select using ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can insert own drafts" on public.drafts;
create policy "Users can insert own drafts" on public.drafts for insert with check ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can update own drafts" on public.drafts;
create policy "Users can update own drafts" on public.drafts for update using ((auth.jwt() ->> 'sub') = clerk_user_id) with check ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can delete own drafts" on public.drafts;
create policy "Users can delete own drafts" on public.drafts for delete using ((auth.jwt() ->> 'sub') = clerk_user_id);
