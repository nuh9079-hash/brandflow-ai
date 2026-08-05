create extension if not exists pgcrypto;

create table if not exists public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  profile_id uuid null references public.user_profiles(id) on delete set null,
  media_asset_id uuid null references public.media_assets(id) on delete set null,
  title text not null,
  caption text not null default '',
  scheduled_at timestamptz not null,
  timezone text not null default 'UTC',
  platforms jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_calendar_platforms_array check (jsonb_typeof(platforms) = 'array')
);

create index if not exists content_calendar_user_idx on public.content_calendar (clerk_user_id);
create index if not exists content_calendar_scheduled_at_idx on public.content_calendar (scheduled_at);
create index if not exists content_calendar_user_scheduled_idx on public.content_calendar (clerk_user_id, scheduled_at);
create index if not exists content_calendar_status_idx on public.content_calendar (status);
create index if not exists content_calendar_profile_idx on public.content_calendar (profile_id);
create index if not exists content_calendar_media_idx on public.content_calendar (media_asset_id);
create index if not exists content_calendar_platforms_idx on public.content_calendar using gin (platforms);

create or replace function public.set_content_calendar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_calendar_updated_at on public.content_calendar;
create trigger set_content_calendar_updated_at before update on public.content_calendar
for each row execute function public.set_content_calendar_updated_at();

alter table public.content_calendar enable row level security;

drop policy if exists "Users can read own calendar content" on public.content_calendar;
create policy "Users can read own calendar content" on public.content_calendar
for select using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own calendar content" on public.content_calendar;
create policy "Users can insert own calendar content" on public.content_calendar
for insert with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can update own calendar content" on public.content_calendar;
create policy "Users can update own calendar content" on public.content_calendar
for update using ((auth.jwt() ->> 'sub') = clerk_user_id)
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can delete own calendar content" on public.content_calendar;
create policy "Users can delete own calendar content" on public.content_calendar
for delete using ((auth.jwt() ->> 'sub') = clerk_user_id);
