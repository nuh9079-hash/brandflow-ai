-- Generated content is separate from scheduled_posts/content_calendar.
-- In this legacy flow, user_id stores the authenticated Clerk user ID.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id text primary key,
  name text,
  brand_name text,
  brand_colors text,
  target_audience text,
  default_language text default 'Türkçe',
  writing_style text default 'Profesyonel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generated_contents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  product text not null,
  tone text not null,
  content text not null,
  sections jsonb,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  content_id uuid not null references public.generated_contents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, content_id)
);

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  content_id uuid references public.generated_contents(id) on delete cascade,
  action text not null default 'generated',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists generated_contents_user_id_created_at_idx on public.generated_contents (user_id, created_at desc);
create index if not exists generated_contents_user_favorite_idx on public.generated_contents (user_id, is_favorite, created_at desc);
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists history_user_id_created_at_idx on public.history (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.generated_contents enable row level security;
alter table public.favorites enable row level security;
alter table public.history enable row level security;

drop policy if exists "Users read own legacy profile" on public.profiles;
create policy "Users read own legacy profile" on public.profiles for select using ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users create own legacy profile" on public.profiles;
create policy "Users create own legacy profile" on public.profiles for insert with check ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users update own legacy profile" on public.profiles;
create policy "Users update own legacy profile" on public.profiles for update using ((auth.jwt() ->> 'sub') = user_id) with check ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users delete own legacy profile" on public.profiles;
create policy "Users delete own legacy profile" on public.profiles for delete using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "Users read own generated contents" on public.generated_contents;
create policy "Users read own generated contents" on public.generated_contents for select using ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users create own generated contents" on public.generated_contents;
create policy "Users create own generated contents" on public.generated_contents for insert with check ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users update own generated contents" on public.generated_contents;
create policy "Users update own generated contents" on public.generated_contents for update using ((auth.jwt() ->> 'sub') = user_id) with check ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users delete own generated contents" on public.generated_contents;
create policy "Users delete own generated contents" on public.generated_contents for delete using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "Users read own favorites" on public.favorites;
create policy "Users read own favorites" on public.favorites for select using ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users create own favorites" on public.favorites;
create policy "Users create own favorites" on public.favorites for insert with check ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users delete own favorites" on public.favorites;
create policy "Users delete own favorites" on public.favorites for delete using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "Users read own content history" on public.history;
create policy "Users read own content history" on public.history for select using ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users create own content history" on public.history;
create policy "Users create own content history" on public.history for insert with check ((auth.jwt() ->> 'sub') = user_id);
drop policy if exists "Users delete own content history" on public.history;
create policy "Users delete own content history" on public.history for delete using ((auth.jwt() ->> 'sub') = user_id);

notify pgrst, 'reload schema';
