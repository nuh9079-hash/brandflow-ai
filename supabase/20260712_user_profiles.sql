create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  profile_name text not null,
  profile_type text not null check (profile_type in ('business', 'personal', 'creator')),
  is_default boolean not null default false,
  business_name text,
  product_or_service text,
  description text,
  brand_tone text,
  target_audience text,
  price_range text,
  campaign_info text,
  competitor text,
  website text,
  brand_colors text,
  default_platforms jsonb not null default '[]'::jsonb,
  language text default 'Türkçe',
  content_goal text,
  display_name text,
  photo_style text,
  personal_mood text,
  content_style text,
  interests jsonb not null default '[]'::jsonb,
  humor_level text,
  personal_platforms jsonb not null default '[]'::jsonb,
  personal_language text default 'Türkçe',
  personal_notes text,
  creator_name text,
  main_topic text,
  sub_topics jsonb not null default '[]'::jsonb,
  creator_audience text,
  video_duration text,
  creator_tone text,
  hook_style text,
  cta_style text,
  thumbnail_style text,
  creator_platforms jsonb not null default '[]'::jsonb,
  creator_language text default 'Türkçe',
  required_words jsonb not null default '[]'::jsonb,
  blocked_words jsonb not null default '[]'::jsonb,
  blocked_topics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists user_profiles_clerk_user_id_idx on public.user_profiles (clerk_user_id);
create index if not exists user_profiles_updated_at_idx on public.user_profiles (updated_at desc);
create unique index if not exists user_profiles_one_default_idx
  on public.user_profiles (clerk_user_id)
  where is_default;

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

create or replace function public.keep_one_default_profile()
returns trigger
language plpgsql
as $$
begin
  if new.is_default = true then
    update public.user_profiles
    set is_default = false
    where clerk_user_id = new.clerk_user_id
      and id <> new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists keep_one_default_profile on public.user_profiles;
create trigger keep_one_default_profile
after insert or update of is_default on public.user_profiles
for each row
execute function public.keep_one_default_profile();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profiles" on public.user_profiles;
create policy "Users can read own profiles"
on public.user_profiles
for select
using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own profiles" on public.user_profiles;
create policy "Users can insert own profiles"
on public.user_profiles
for insert
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can update own profiles" on public.user_profiles;
create policy "Users can update own profiles"
on public.user_profiles
for update
using ((auth.jwt() ->> 'sub') = clerk_user_id)
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can delete own profiles" on public.user_profiles;
create policy "Users can delete own profiles"
on public.user_profiles
for delete
using ((auth.jwt() ->> 'sub') = clerk_user_id);
