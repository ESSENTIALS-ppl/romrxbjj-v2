-- 20261117010200_p1_25_purge_deleted_accounts_cron (UNAPPLIED; BUILD ONLY).
-- P1-25 / L1004. Jim, verbatim, 2026-11-03 7:07 PM ET: "Purge deleted accounts after 90 days."
-- Schedules the day-90 purge via pg_cron, daily. This file does NOT apply the purge function
-- and does NOT schedule anything until it is itself applied. Do not pass this file to
-- apply_migration until a gate line names this file's sha256, and only after
-- 20261117010000_p1_25_purge_deleted_accounts.sql has been applied, and only after a
-- count-only then dry_run live run has been reviewed.
-- This file supersedes 20261117010000_p1_25_purge_deleted_accounts_cron.NOT_FOR_APPLY.sql
-- (that sibling is left unchanged and still raises if applied). The function file is also
-- unchanged and still does not schedule anything.
--
-- Live cron checked read-only (2026-11-16, project cqzvqzwwevnflinxgnpp): 13 jobs, ids 1-13,
-- md5(jobid|schedule|command|active, newline-joined, order by jobid)
-- a96d2036959f1dc2697d23e7665cb490, unchanged vs P1-08 / P1-17. Renewal cron (job 1,
-- send-renewal-reminders-daily, 0 12 * * *) is not touched. No existing job is named
-- purge-deleted-accounts-daily, and no existing job uses 23 4 * * *.
--
-- Intended job (only after the gate):
--   name:     purge-deleted-accounts-daily
--   schedule: 23 4 * * *   -- 04:23 UTC = 11:23 PM ET (standard time)
--   command:  select public.purge_deleted_accounts('apply', interval '90 days');
-- The zz_bak_p1_25_* copy is dropped by a later apply run once older than 7 days, so the
-- safety-copy window is 7 days plus the max wait until the next daily run: N = 8.
-- This schedule file never unschedules or alters any other job. Rollback unschedules this
-- job by name only, if it exists.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-deleted-accounts-daily') then
    perform cron.unschedule('purge-deleted-accounts-daily');
  end if;
end $$;

select cron.schedule(
  'purge-deleted-accounts-daily',
  '23 4 * * *',
  $$select public.purge_deleted_accounts('apply', interval '90 days');$$
);
