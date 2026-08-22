-- Distinguish ordinary calendar reminders from server-side automatic publishing.
-- Existing scheduled rows remain manual by default so nothing publishes unexpectedly.

alter table public.scheduled_posts
  add column if not exists auto_publish boolean not null default false;

create index if not exists scheduled_posts_auto_due_idx
  on public.scheduled_posts (scheduled_at, next_attempt_at)
  where status = 'scheduled' and auto_publish = true;
