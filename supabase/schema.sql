-- BrandFlow AI Supabase schema
-- Run this in Supabase SQL editor after creating a project.

create extension if not exists "pgcrypto";

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
  unique(user_id, content_id)
);

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(user_id) on delete cascade,
  content_id uuid references public.generated_contents(id) on delete cascade,
  action text not null default 'generated',
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.generated_contents enable row level security;
alter table public.favorites enable row level security;
alter table public.history enable row level security;

create index if not exists generated_contents_user_id_created_at_idx on public.generated_contents(user_id, created_at desc);
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists history_user_id_created_at_idx on public.history(user_id, created_at desc);
