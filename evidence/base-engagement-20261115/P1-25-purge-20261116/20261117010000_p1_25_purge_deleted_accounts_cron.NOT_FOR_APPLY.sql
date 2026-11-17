-- 20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql
-- P1-25 / L1004. NOT FOR APPLY UNTIL GATED. Cron stays UNSCHEDULED.
-- Do not pass this file to apply_migration, psql, or cron.schedule. A hard guard refuses the file
-- if it is applied by mistake. The function file 20261117010000_p1_25_purge_deleted_accounts.sql
-- is also unapplied and does not schedule anything.
--
-- Intended job (only after a later gate line names this file's sha256, and only after a count-only
-- then dry_run live run has been reviewed):
--   name:    purge-deleted-accounts-daily
--   schedule: 23 4 * * *   -- 04:23 UTC = 11:23 PM ET (standard time)
--   command:  select public.purge_deleted_accounts('dry_run', interval '90 days')
-- The first live runs must be count, then dry_run. Switching the command to apply needs its own gate.
-- Jim, verbatim, 2026-11-03 7:07 PM ET: "Purge deleted accounts after 90 days."

DO $$
BEGIN
  RAISE EXCEPTION 'P1-25 cron is unscheduled. Do not apply this file until a gate line names it. File: 20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql';
END
$$;

-- After a gate, the intended schedule (DO NOT UNCOMMENT OR RUN until that gate) would be:
-- select cron.schedule(
--   'purge-deleted-accounts-daily',
--   '23 4 * * *',
--   $cmd$select public.purge_deleted_accounts('dry_run', interval '90 days')$cmd$
-- );
-- Rollback of that future schedule: select cron.unschedule('purge-deleted-accounts-daily');
