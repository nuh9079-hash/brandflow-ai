create extension if not exists pgcrypto;

alter table public.scheduled_posts
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz null,
  add column if not exists next_attempt_at timestamptz null,
  add column if not exists processing_started_at timestamptz null,
  add column if not exists external_post_id text null;

create index if not exists scheduled_posts_due_autopublish_idx
  on public.scheduled_posts (status, scheduled_at, next_attempt_at)
  where status = 'scheduled';

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  platform text not null check (platform in ('instagram','facebook','twitter','tiktok','linkedin','youtube')),
  external_account_id text not null,
  account_name text null,
  access_token text not null,
  token_expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, platform)
);

create index if not exists social_connections_user_idx on public.social_connections (clerk_user_id);

alter table public.social_connections enable row level security;

-- Intentionally no client RLS policies. Social tokens are server-only and must only be
-- accessed through the Supabase service-role client.

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
