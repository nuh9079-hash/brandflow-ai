create extension if not exists pgcrypto;

create table if not exists public.marketing_advisor_reports (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  profile_id uuid null references public.user_profiles(id) on delete set null,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'twitter', 'linkedin')),
  caption text not null default '',
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists marketing_advisor_reports_clerk_user_id_idx on public.marketing_advisor_reports (clerk_user_id);
create index if not exists marketing_advisor_reports_media_asset_id_idx on public.marketing_advisor_reports (media_asset_id);
create index if not exists marketing_advisor_reports_profile_id_idx on public.marketing_advisor_reports (profile_id);
create index if not exists marketing_advisor_reports_created_at_idx on public.marketing_advisor_reports (created_at desc);

alter table public.marketing_advisor_reports enable row level security;

drop policy if exists "Users can read own marketing advisor reports" on public.marketing_advisor_reports;
create policy "Users can read own marketing advisor reports"
on public.marketing_advisor_reports
for select
using ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can insert own marketing advisor reports" on public.marketing_advisor_reports;
create policy "Users can insert own marketing advisor reports"
on public.marketing_advisor_reports
for insert
with check ((auth.jwt() ->> 'sub') = clerk_user_id);

drop policy if exists "Users can delete own marketing advisor reports" on public.marketing_advisor_reports;
create policy "Users can delete own marketing advisor reports"
on public.marketing_advisor_reports
for delete
using ((auth.jwt() ->> 'sub') = clerk_user_id);
