-- ROLLBACK for 20261117010200_p1_25_purge_deleted_accounts_cron.sql (UNAPPLIED; BUILD ONLY).
-- Unschedules purge-deleted-accounts-daily by name only, if it exists. Does not touch any
-- other cron job, including send-renewal-reminders-daily (job 1).

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-deleted-accounts-daily') then
    perform cron.unschedule('purge-deleted-accounts-daily');
  end if;
end $$;
