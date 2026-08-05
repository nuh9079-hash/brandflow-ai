alter table public.media_assets
add column if not exists is_favorite boolean not null default false;

create table if not exists public.video_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  provider text not null,
  provider_job_id text not null,
  status text not null check (status in ('preparing', 'queued', 'processing', 'completed', 'failed')),
  prompt text not null,
  aspect_ratio text not null check (aspect_ratio in ('9:16', '1:1', '16:9')),
  duration integer not null,
  media_asset_id uuid null references public.media_assets(id) on delete set null,
  error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, provider_job_id)
);

create index if not exists video_generation_jobs_user_created_idx
on public.video_generation_jobs (clerk_user_id, created_at desc);

alter table public.video_generation_jobs enable row level security;

drop policy if exists "Users can read own video jobs" on public.video_generation_jobs;
create policy "Users can read own video jobs" on public.video_generation_jobs
for select using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own video jobs" on public.video_generation_jobs;
create policy "Users can insert own video jobs" on public.video_generation_jobs
for insert with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can update own video jobs" on public.video_generation_jobs;
create policy "Users can update own video jobs" on public.video_generation_jobs
for update using ((auth.jwt() ->> 'sub') = clerk_user_id)
with check ((auth.jwt() ->> 'sub') = clerk_user_id);
