create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  type text not null check (type in ('publish_succeeded','publish_failed','connection_connected','connection_disconnected','connection_expired','image_completed','video_completed','media_failed','schedule_due','schedule_completed')),
  title text not null,
  description text not null default '',
  href text not null default '/',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (clerk_user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (clerk_user_id, read_at) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications for select using ((auth.jwt() ->> 'sub') = clerk_user_id);
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update using ((auth.jwt() ->> 'sub') = clerk_user_id) with check ((auth.jwt() ->> 'sub') = clerk_user_id);
