alter table public.content_calendar add column if not exists last_error text null;
alter table public.content_calendar add column if not exists published_at timestamptz null;

alter table public.content_calendar drop constraint if exists content_calendar_status_check;
alter table public.content_calendar add constraint content_calendar_status_check
check (status in ('draft','scheduled','publishing','processing','published','failed','cancelled'));

create index if not exists content_calendar_due_publish_idx
on public.content_calendar (status, scheduled_at)
where status = 'scheduled';
