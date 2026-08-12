create extension if not exists pgcrypto;

create table if not exists public.publish_attempts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  retry_of_id uuid null references public.publish_attempts(id) on delete set null,
  platform text not null check (platform in ('instagram')),
  account_name text null,
  account_username text null,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  caption text not null,
  status text not null default 'pending' check (status in ('pending','published','failed')),
  provider_media_id text null,
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists publish_attempts_user_created_idx on public.publish_attempts (clerk_user_id, created_at desc);
create index if not exists publish_attempts_status_idx on public.publish_attempts (status);
create index if not exists publish_attempts_retry_idx on public.publish_attempts (retry_of_id);

alter table public.publish_attempts enable row level security;
drop policy if exists "Users can read own publish attempts" on public.publish_attempts;
create policy "Users can read own publish attempts" on public.publish_attempts for select using ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can insert own publish attempts" on public.publish_attempts;
create policy "Users can insert own publish attempts" on public.publish_attempts for insert with check ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can update own publish attempts" on public.publish_attempts;
create policy "Users can update own publish attempts" on public.publish_attempts for update using ((auth.jwt() ->> 'sub') = clerk_user_id) with check ((auth.jwt() ->> 'sub') = clerk_user_id);
