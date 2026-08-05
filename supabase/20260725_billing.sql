create extension if not exists pgcrypto;

create table if not exists public.billing_customers (
  clerk_user_id text primary key,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  clerk_user_id text primary key,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  plan text not null check (plan in ('pro', 'business')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_usage_monthly (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  period_start date not null,
  ai_images integer not null default 0 check (ai_images >= 0),
  ai_videos integer not null default 0 check (ai_videos >= 0),
  advisor_analyses integer not null default 0 check (advisor_analyses >= 0),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, period_start)
);

create table if not exists public.billing_usage_events (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  event_key text not null,
  metric text not null check (metric in ('ai_images', 'ai_videos', 'advisor_analyses')),
  created_at timestamptz not null default now(),
  unique (clerk_user_id, event_key, metric)
);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_usage_user_period_idx on public.billing_usage_monthly (clerk_user_id, period_start desc);
create index if not exists billing_subscription_customer_idx on public.billing_subscriptions (stripe_customer_id);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_usage_monthly enable row level security;
alter table public.billing_usage_events enable row level security;
alter table public.billing_webhook_events enable row level security;

drop policy if exists "Users can read own billing customer" on public.billing_customers;
create policy "Users can read own billing customer" on public.billing_customers for select using ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can read own subscription" on public.billing_subscriptions;
create policy "Users can read own subscription" on public.billing_subscriptions for select using ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can read own billing usage" on public.billing_usage_monthly;
create policy "Users can read own billing usage" on public.billing_usage_monthly for select using ((auth.jwt() ->> 'sub') = clerk_user_id);

create or replace function public.consume_billing_usage(
  p_clerk_user_id text,
  p_metric text,
  p_amount integer,
  p_limit integer,
  p_event_key text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  period date := date_trunc('month', now() at time zone 'utc')::date;
  current_value integer;
begin
  if p_metric not in ('ai_images', 'ai_videos', 'advisor_analyses') or p_amount <= 0 then
    raise exception 'Invalid billing usage input';
  end if;

  insert into public.billing_usage_events (clerk_user_id, event_key, metric)
  values (p_clerk_user_id, p_event_key, p_metric)
  on conflict do nothing;
  if not found then return true; end if;

  insert into public.billing_usage_monthly (clerk_user_id, period_start)
  values (p_clerk_user_id, period)
  on conflict (clerk_user_id, period_start) do nothing;

  select case p_metric
    when 'ai_images' then ai_images
    when 'ai_videos' then ai_videos
    else advisor_analyses
  end into current_value
  from public.billing_usage_monthly
  where clerk_user_id = p_clerk_user_id and period_start = period
  for update;

  if p_limit is not null and current_value + p_amount > p_limit then
    delete from public.billing_usage_events where clerk_user_id = p_clerk_user_id and event_key = p_event_key and metric = p_metric;
    return false;
  end if;

  update public.billing_usage_monthly set
    ai_images = ai_images + case when p_metric = 'ai_images' then p_amount else 0 end,
    ai_videos = ai_videos + case when p_metric = 'ai_videos' then p_amount else 0 end,
    advisor_analyses = advisor_analyses + case when p_metric = 'advisor_analyses' then p_amount else 0 end,
    updated_at = now()
  where clerk_user_id = p_clerk_user_id and period_start = period;
  return true;
end;
$$;

revoke all on function public.consume_billing_usage(text, text, integer, integer, text) from public;
grant execute on function public.consume_billing_usage(text, text, integer, integer, text) to service_role;
