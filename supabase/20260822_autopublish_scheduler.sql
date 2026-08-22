-- BrandFlow automatic publishing scheduler
-- Uses Supabase Cron + pg_net so scheduled posts can publish even when the browser is closed.
-- Before calling configure_brandflow_autopublish(), create these Vault secrets once:
--   select vault.create_secret('https://YOUR-PRODUCTION-DOMAIN', 'brandflow_app_url');
--   select vault.create_secret('YOUR-LONG-RANDOM-CRON-SECRET', 'brandflow_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

create or replace function public.configure_brandflow_autopublish()
returns text
language plpgsql
security definer
set search_path = public, vault, cron, net
as $$
declare
  app_url text;
  cron_secret text;
  existing_job bigint;
begin
  select decrypted_secret into app_url
  from vault.decrypted_secrets
  where name = 'brandflow_app_url'
  order by created_at desc
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'brandflow_cron_secret'
  order by created_at desc
  limit 1;

  if app_url is null or btrim(app_url) = '' then
    raise exception 'Vault secret brandflow_app_url bulunamadı.';
  end if;

  if cron_secret is null or length(cron_secret) < 24 then
    raise exception 'Vault secret brandflow_cron_secret bulunamadı veya çok kısa.';
  end if;

  app_url := rtrim(app_url, '/');

  select jobid into existing_job from cron.job where jobname = 'brandflow-autopublish' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'brandflow-autopublish',
    '* * * * *',
    $job$
      select net.http_get(
        url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'brandflow_app_url' order by created_at desc limit 1), '/') || '/api/cron/publish-scheduled',
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brandflow_cron_secret' order by created_at desc limit 1)
        ),
        timeout_milliseconds := 55000
      );
    $job$
  );

  return 'BrandFlow otomatik yayın zamanlayıcısı her dakika çalışacak şekilde etkinleştirildi.';
end;
$$;

revoke all on function public.configure_brandflow_autopublish() from public;

create or replace function public.brandflow_autopublish_scheduler_status()
returns table(enabled boolean, schedule text, active boolean)
language sql
security definer
set search_path = public, cron
as $$
  select
    exists(select 1 from cron.job where jobname = 'brandflow-autopublish') as enabled,
    coalesce((select cron.job.schedule from cron.job where jobname = 'brandflow-autopublish' limit 1), '') as schedule,
    coalesce((select cron.job.active from cron.job where jobname = 'brandflow-autopublish' limit 1), false) as active;
$$;

revoke all on function public.brandflow_autopublish_scheduler_status() from public;
