create table if not exists public.marketing_advisor_strategy_reports (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  business_name text not null,
  industry text not null,
  target_audience text not null,
  goals text not null,
  platforms jsonb not null default '[]'::jsonb,
  website text not null default '',
  report jsonb not null,
  marketing_score integer not null check (marketing_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_advisor_platforms_array check (jsonb_typeof(platforms) = 'array')
);

create index if not exists marketing_advisor_strategy_user_idx on public.marketing_advisor_strategy_reports (clerk_user_id);
create index if not exists marketing_advisor_strategy_created_idx on public.marketing_advisor_strategy_reports (clerk_user_id, created_at desc);
create index if not exists marketing_advisor_strategy_score_idx on public.marketing_advisor_strategy_reports (clerk_user_id, marketing_score desc);
create index if not exists marketing_advisor_strategy_platforms_idx on public.marketing_advisor_strategy_reports using gin (platforms);

alter table public.marketing_advisor_strategy_reports enable row level security;

drop policy if exists "strategy reports select own" on public.marketing_advisor_strategy_reports;
create policy "strategy reports select own" on public.marketing_advisor_strategy_reports for select
using (clerk_user_id = coalesce(auth.jwt() ->> 'sub', ''));

drop policy if exists "strategy reports insert own" on public.marketing_advisor_strategy_reports;
create policy "strategy reports insert own" on public.marketing_advisor_strategy_reports for insert
with check (clerk_user_id = coalesce(auth.jwt() ->> 'sub', ''));

drop policy if exists "strategy reports delete own" on public.marketing_advisor_strategy_reports;
create policy "strategy reports delete own" on public.marketing_advisor_strategy_reports for delete
using (clerk_user_id = coalesce(auth.jwt() ->> 'sub', ''));
