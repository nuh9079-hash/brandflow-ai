-- BrandFlow database hardening
-- Mirrors production hardening applied on 2026-08-22.

-- Fix mutable search_path warnings on trigger/helper functions.
alter function public.set_user_profiles_updated_at() set search_path = public;
alter function public.keep_one_default_profile() set search_path = public;
alter function public.set_media_assets_updated_at() set search_path = public;
alter function public.set_scheduled_posts_updated_at() set search_path = public;
alter function public.team_current_user_id() set search_path = public;
alter function public.set_social_connections_updated_at() set search_path = public;
alter function public.set_content_calendar_updated_at() set search_path = public;

-- Scheduler RPCs are administrative only.
revoke all on function public.configure_brandflow_autopublish() from public, anon, authenticated;
revoke all on function public.brandflow_autopublish_scheduler_status() from public, anon, authenticated;
grant execute on function public.configure_brandflow_autopublish() to service_role;
grant execute on function public.brandflow_autopublish_scheduler_status() to service_role;

-- Billing quota mutation must never be callable from an untrusted client.
revoke all on function public.consume_billing_usage(text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.consume_billing_usage(text,text,integer,integer,text) to service_role;

-- Workspace membership helpers are used by authenticated RLS policies, but anonymous RPC access is unnecessary.
revoke execute on function public.is_workspace_manager(uuid) from anon;
revoke execute on function public.is_workspace_member(uuid) from anon;

-- Cover foreign keys used by deletes/joins.
create index if not exists favorites_content_id_idx on public.favorites(content_id);
create index if not exists history_content_id_idx on public.history(content_id);
create index if not exists publish_attempts_media_asset_id_idx on public.publish_attempts(media_asset_id);
create index if not exists scheduled_posts_profile_id_idx on public.scheduled_posts(profile_id);
create index if not exists social_connections_profile_id_idx on public.social_connections(profile_id);
create index if not exists video_generation_jobs_media_asset_id_idx on public.video_generation_jobs(media_asset_id);

-- Cache auth.jwt() once per statement in RLS policies instead of evaluating it per row.
do $$
declare
  r record;
  next_qual text;
  next_check text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (qual is not null and qual like '%auth.jwt()%')
        or (with_check is not null and with_check like '%auth.jwt()%')
      )
  loop
    next_qual := case when r.qual is null then null else replace(r.qual, 'auth.jwt()', '(select auth.jwt())') end;
    next_check := case when r.with_check is null then null else replace(r.with_check, 'auth.jwt()', '(select auth.jwt())') end;

    if next_qual is not null and next_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', r.policyname, r.schemaname, r.tablename, next_qual, next_check);
    elsif next_qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', r.policyname, r.schemaname, r.tablename, next_qual);
    elsif next_check is not null then
      execute format('alter policy %I on %I.%I with check (%s)', r.policyname, r.schemaname, r.tablename, next_check);
    end if;
  end loop;
end
$$;
