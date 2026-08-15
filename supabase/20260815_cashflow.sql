create extension if not exists pgcrypto;

create table if not exists public.cashflow_entries (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  entry_type text not null check (entry_type in ('income','expense')),
  category text not null default 'Diğer',
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  entry_date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cashflow_entries_user_date_idx on public.cashflow_entries (clerk_user_id, entry_date desc);
alter table public.cashflow_entries enable row level security;

drop policy if exists "Users can read own cashflow" on public.cashflow_entries;
create policy "Users can read own cashflow" on public.cashflow_entries for select using ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can insert own cashflow" on public.cashflow_entries;
create policy "Users can insert own cashflow" on public.cashflow_entries for insert with check ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can delete own cashflow" on public.cashflow_entries;
create policy "Users can delete own cashflow" on public.cashflow_entries for delete using ((auth.jwt() ->> 'sub') = clerk_user_id);
