create extension if not exists pgcrypto;

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  profile_id uuid null references public.user_profiles(id) on delete set null,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin', 'x', 'youtube', 'tiktok')),
  platform_account_id text null,
  account_name text null,
  account_username text null,
  access_token_encrypted text null,
  refresh_token_encrypted text null,
  token_expires_at timestamptz null,
  status text not null default 'disconnected' check (status in ('disconnected', 'connecting', 'connected', 'expired', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_connections_user_platform_account_unique unique (clerk_user_id, platform, platform_account_id)
);

create index if not exists social_connections_clerk_user_id_idx on public.social_connections (clerk_user_id);
create index if not exists social_connections_platform_idx on public.social_connections (platform);
create index if not exists social_connections_status_idx on public.social_connections (status);

create or replace function public.set_social_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_social_connections_updated_at on public.social_connections;
create trigger set_social_connections_updated_at
before update on public.social_connections
for each row execute function public.set_social_connections_updated_at();

alter table public.social_connections enable row level security;

drop policy if exists "Users can read own social connections" on public.social_connections;
create policy "Users can read own social connections" on public.social_connections
for select using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own social connections" on public.social_connections;
create policy "Users can insert own social connections" on public.social_connections
for insert with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can update own social connections" on public.social_connections;
create policy "Users can update own social connections" on public.social_connections
for update using ((auth.jwt() ->> 'sub') = clerk_user_id)
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can delete own social connections" on public.social_connections;
create policy "Users can delete own social connections" on public.social_connections
for delete using ((auth.jwt() ->> 'sub') = clerk_user_id);
